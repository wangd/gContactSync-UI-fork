/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is gContactSync.
 *
 * The Initial Developer of the Original Code is
 * Josh Geenen <gcontactsync@pirules.org>.
 * Portions created by the Initial Developer are Copyright (C) 2008-2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

if (!com) var com = {};
if (!com.gContactSync) com.gContactSync = {};

/**
 * Sync
 * Synchronizes a Thunderbird Address Book with Google Contacts.
 * @class
 */
com.gContactSync.Sync = {
  // a few arrays treated as queues to add/delete/update contacts and cards
  mContactsToDelete: [],
  mContactsToAdd:    [],
  mContactsToUpdate: [],
  mGroupsToDelete:   [],
  mGroupsToAdd:      [],
  mGroupsToUpdate:   [],
  mGroupsToAddURI:   [],
  mCurrentAuthToken: {},
  mCurrentUsername:  {},
  mCurrentAb:        {},
  mAddressBooks:     [],
  mIndex:            0,
  // an array of commands to execute when offline during an HTTP Request
  mOfflineCommand: ["com.gContactSync.Overlay.setStatusBarText(com.gContactSync.StringBundle.getStr('offlineStatusText'));", 
                    "com.gContactSync.Sync.finish(com.gContactSync.StringBundle.getStr('offlineStatusText'));"],

  // booleans used for timing to make sure only one synchronization occurs at a
  // time and that only one sync is scheduled at once
  mSynced:        true,
  mSyncScheduled: false,
  mGroups:        {},   // used to store groups for the account being synchronized
  mLists:         {},   // stores the mail lists in the directory being synchronized
  mContactsUrl:   null, // override for the contact feed URL.  Intended for syncing
                        // one group only
  /**
   * com.gContactSync.Sync.begin
   * Performs the first steps of the sync process.
   * @param firstLog Should be true if the user just logged in.
   */
  begin: function Sync_begin() {
    if (!com.gContactSync.gdata.isAuthValid()) {
      alert(com.gContactSync.StringBundle.getStr("pleaseAuth"));
      return;
   }
    // quit if still syncing.
    if (!com.gContactSync.Sync.mSynced)
      return;
    // get the next auth token
    com.gContactSync.Preferences.getSyncPrefs(); // get the preferences
    com.gContactSync.Sync.mSyncScheduled = false;
    com.gContactSync.Sync.mSynced        = false;
    com.gContactSync.LOGGER.mErrorCount  = 0; // reset the error count
    com.gContactSync.Overlay.setStatusBarText(com.gContactSync.StringBundle.getStr("syncing"));
    com.gContactSync.Sync.mIndex         = 0;
    com.gContactSync.Sync.mAddressBooks  = com.gContactSync.GAbManager.getSyncedAddressBooks(true);
    com.gContactSync.Sync.syncNextUser()
  },
  /**
   * com.gContactSync.Sync.syncNextUser
   * Synchronizes the next address book in com.gContactSync.Sync.mAddressBooks.
   * If all ABs were synchronized, then this continues with com.gContactSync.Sync.finish();
   */
  syncNextUser: function Sync_syncNextUser() {
    // set the previous address book's last sync date (if it exists)
    if (com.gContactSync.Sync.mCurrentAb && com.gContactSync.Sync.mCurrentAb.setLastSyncDate)
      com.gContactSync.Sync.mCurrentAb.setLastSyncDate((new Date()).getTime());
    var obj = com.gContactSync.Sync.mAddressBooks[com.gContactSync.Sync.mIndex++];
    if (!obj) {
      com.gContactSync.Sync.finish();
      return;
    }
    com.gContactSync.Sync.mCurrentUsername = obj.username;
    com.gContactSync.LOGGER.LOG("Starting Synchronization for " + com.gContactSync.Sync.mCurrentUsername +
               " at: " + Date() + "\n");
    com.gContactSync.Sync.mCurrentAb        = obj.ab;
    com.gContactSync.Sync.mCurrentAuthToken = com.gContactSync.LoginManager.getAuthTokens()[com.gContactSync.Sync.mCurrentUsername];
    com.gContactSync.Sync.mContactsUrl      = null;
    // If an authentication token cannot be found for this username then
    // offer to let the user login with that account
    if (!com.gContactSync.Sync.mCurrentAuthToken) {
      com.gContactSync.LOGGER.LOG_WARNING("Unable to find the auth token for: "
                                          + com.gContactSync.Sync.mCurrentUsername);
      if (confirm(com.gContactSync.StringBundle.getStr("noTokenFound")
                  + ": " + com.gContactSync.Sync.mCurrentUsername
                  + "\n" + com.gContactSync.StringBundle.getStr("ab")
                  + ": " + com.gContactSync.Sync.mCurrentAb.getName())) {
        // Now let the user login
        var prompt   = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                 .getService(Components.interfaces.nsIPromptService)
                                 .promptUsernameAndPassword;
        var username = {value: com.gContactSync.Sync.mCurrentUsername};
        var password = {};
        // opens a username/password prompt
        var ok = prompt(window, com.gContactSync.StringBundle.getStr("loginTitle"),
                        com.gContactSync.StringBundle.getStr("loginText"), username, password, null,
                        {value: false});
        if (!ok) {
          com.gContactSync.Sync.syncNextUser();
          return;
        }
        // Decrement the index so Sync.syncNextUser runs on this AB again
        com.gContactSync.Sync.mIndex--;
        // This is a primitive way of validating an e-mail address, but Google takes
        // care of the rest.  It seems to allow getting an auth token w/ only the
        // username, but returns an error when trying to do anything w/ that token
        // so this makes sure it is a full e-mail address.
        if (username.value.indexOf("@") < 1) {
          alert(com.gContactSync.StringBundle.getStr("invalidEmail"));
          com.gContactSync.Sync.syncNextUser();
          return;
        }
        // fix the username before authenticating
        username.value = com.gContactSync.fixUsername(username.value);
        var body    = com.gContactSync.gdata.makeAuthBody(username.value, password.value);
        var httpReq = new com.gContactSync.GHttpRequest("authenticate", null, null, body);
        // if it succeeds and Google returns the auth token, store it and then start
        // a new sync
        httpReq.mOnSuccess = ["com.gContactSync.LoginManager.addAuthToken('" + username.value +
                              "', 'GoogleLogin' + httpReq.responseText.split(\"\\n\")[2]);",
                              "com.gContactSync.Sync.syncNextUser();"];
        // if it fails, alert the user and prompt them to try again
        httpReq.mOnError   = ["alert(com.gContactSync.StringBundle.getStr('authErr'));",
                              "com.gContactSync.LOGGER.LOG_ERROR('Authentication Error - ' + " + 
                              "httpReq.status, httpReq.responseText);",
                              "com.gContactSync.Sync.syncNextUser();"];
        // if the user is offline, alert them and quit
        httpReq.mOnOffline = ["alert(com.gContactSync.StringBundle.getStr('offlineErr'));",
                              "com.gContactSync.LOGGER.LOG_ERROR(com.gContactSync.StringBundle.getStr('offlineErr'));"];
        httpReq.send();
      }
      else
        com.gContactSync.Sync.syncNextUser();
      return;
    }
    com.gContactSync.LOGGER.VERBOSE_LOG("Found Address Book with name: " +
                       com.gContactSync.Sync.mCurrentAb.mDirectory.dirName +
                       "\n - URI: " + com.gContactSync.Sync.mCurrentAb.mURI +
                       "\n - Pref ID: " + com.gContactSync.Sync.mCurrentAb.getPrefId());
    if (com.gContactSync.Sync.mCurrentAb.mPrefs.Disabled == "true") {
      com.gContactSync.LOGGER.LOG("*** NOTE: Synchronization was disabled for this address book ***");
      com.gContactSync.Sync.mCurrentAb = null;
      com.gContactSync.Sync.syncNextUser();
      return;
    }
    // getGroups must be called if the myContacts pref is set so it can find the
    // proper group URL
    if (com.gContactSync.Sync.mCurrentAb.mPrefs.syncGroups == "true" || com.gContactSync.Sync.mCurrentAb.mPrefs.myContacts != "false")
      com.gContactSync.Sync.getGroups();
    else
      com.gContactSync.Sync.getContacts();
  },
  /**
   * com.gContactSync.Sync.getGroups
   * Sends an HTTP Request to Google for a feed of all of the user's groups.
   * Calls com.gContactSync.Sync.begin() when there is a successful response on an error other
   * than offline.
   */
  getGroups: function Sync_getGroups() {
    com.gContactSync.LOGGER.LOG("***Beginning Group - Mail List Synchronization***");
    var httpReq = new com.gContactSync.GHttpRequest("getGroups", com.gContactSync.Sync.mCurrentAuthToken, null,
                                   null, com.gContactSync.Sync.mCurrentUsername);
    httpReq.mOnSuccess = ["com.gContactSync.LOGGER.VERBOSE_LOG(com.gContactSync.serializeFromText(httpReq.responseText))",
                          "com.gContactSync.Sync.syncGroups(httpReq.responseXML);"],
    httpReq.mOnError   = ["com.gContactSync.LOGGER.LOG_ERROR(httpReq.responseText);",
                          "com.gContactSync.Sync.begin();"]; // if there is an error, try to sync w/o groups                   
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineCommand;
    httpReq.send();
  },
  /**
   * com.gContactSync.Sync.getContacts
   * Sends an HTTP Request to Google for a feed of all the user's contacts.
   * Calls com.gContactSync.Sync.sync with the response if successful or com.gContactSync.Sync.syncNextUser with the
   * error.
   */
  getContacts: function Sync_getContacts() {
    com.gContactSync.LOGGER.LOG("***Beginning Contact Synchronization***");
    var httpReq;
    if (com.gContactSync.Sync.mContactsUrl) {
      var httpReq = new com.gContactSync.GHttpRequest("getFromGroup", com.gContactSync.Sync.mCurrentAuthToken, null, null,
                                     com.gContactSync.Sync.mCurrentUsername, com.gContactSync.Sync.mContactsUrl);
    }
    else {
      var httpReq = new com.gContactSync.GHttpRequest("getAll", com.gContactSync.Sync.mCurrentAuthToken, null, null,
                                     com.gContactSync.Sync.mCurrentUsername);
    }
    // com.gContactSync.serializeFromText does not do anything if verbose logging is disabled
    // so this next line won't waste time
    httpReq.mOnSuccess = ["com.gContactSync.LOGGER.VERBOSE_LOG(com.gContactSync.serializeFromText(httpReq.responseText))",
                          "com.gContactSync.Sync.sync2(httpReq.responseXML);"];
    httpReq.mOnError   = ["com.gContactSync.LOGGER.LOG_ERROR('Error while getting all contacts', " +
                          "httpReq.responseText);",
                          "com.gContactSync.Sync.syncNextUser(httpReq.responseText);"];
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineCommand;
    httpReq.send();
  },
  /**
   * com.gContactSync.Sync.finish
   * Completes the synchronization process by writing the finish time to a file,
   * writing the sync details to a different file, scheduling another sync, and
   * writes the completion status to the status bar.
   * 
   * @param aError     {string} Optional.  A string containing the error message.
   * @param aStartOver {bool}   Also optional.  True if the sync should be restarted.
   */
  finish: function Sync_finish(aError, aStartOver) {
    if (aError)
      com.gContactSync.LOGGER.LOG_ERROR("Error during sync", aError);
    if (com.gContactSync.LOGGER.mErrorCount > 0) {
      // if there was an error, display the error message unless the user is
      // offline
      if (com.gContactSync.Overlay.getStatusBarText() != aError)
        com.gContactSync.Overlay.setStatusBarText(com.gContactSync.StringBundle.getStr("errDuringSync"));
    }
    else {
      com.gContactSync.Overlay.writeTimeToStatusBar();
      com.gContactSync.LOGGER.LOG("Finished Synchronization at: " + Date());
    }
    // reset some variables
    com.gContactSync.ContactConverter.mCurrentCard = {};
    com.gContactSync.Sync.mSynced                  = true;
    com.gContactSync.Sync.mCurrentAb               = {};
    com.gContactSync.Sync.mContactsUrl             = null;
    com.gContactSync.Sync.mCurrentUsername         = {};
    com.gContactSync.Sync.mCurrentAuthToken        = {};
    // refresh the ab results pane
    // https://www.mozdev.org/bugs/show_bug.cgi?id=19733
    SetAbView(GetSelectedDirectory(), false);
    // select the first card, if any
    if (gAbView && gAbView.getCardFromRow(0))
      SelectFirstCard();
    // start over, if necessary, or schedule the next synchronization
    if (aStartOver)
      com.gContactSync.Sync.begin();
    else
      com.gContactSync.Sync.schedule(com.gContactSync.Preferences.mSyncPrefs.refreshInterval.value * 60000);
  },
  // TODO document
  sync2: function Sync_sync2(aAtom) {
    // get the address book
    var ab = com.gContactSync.Sync.mCurrentAb;
    // have to update the lists or TB 2 won't work properly
    com.gContactSync.Sync.mLists = ab.getAllLists();
    // get all the contacts from the feed and the cards from the address book
    var googleContacts = aAtom.getElementsByTagName('entry');
    var abCards = ab.getAllCards();
    // get and log the last sync time (milliseconds since 1970 UTC)
    var lastSync = parseInt(ab.getLastSyncDate());
    com.gContactSync.LOGGER.LOG("Last sync was at: " + lastSync);
    var cardsToDelete = [];
    var maxContacts = com.gContactSync.Preferences.mSyncPrefs.maxContacts.value;
    // if there are more contacts than returned, increase the pref
    var newMax;
    if ((newMax = com.gContactSync.gdata.contacts.getNumberOfContacts(aAtom)) >= maxContacts.value) {
      com.gContactSync.Preferences.setPref(com.gContactSync.Preferences.mSyncBranch, maxContacts.label,
                          maxContacts.type, newMax + 50);
      com.gContactSync.Sync.finish("Max Contacts too low...resynchronizing", true);
      return;
    }
    com.gContactSync.Sync.mContactsToAdd    = [];
    com.gContactSync.Sync.mContactsToDelete = [];
    com.gContactSync.Sync.mContactsToUpdate = [];
    var gContact;
     // get the strings outside of the loop so they are only found once
    var found       = " * Found a match Last Modified Dates:";
    var bothChanged = " * Conflict detected: the contact has been updated in " +
                      "both Google and Thunderbird";
    var bothGoogle  = " * The contact from Google will be updated";
    var bothTB      = " * The card from Thunderbird will be updated";
    var gContacts   = {};
    var gContact;
    // Step 1: get all contacts from Google into GContact objects in an object
    // keyed by ID.
    for (var i = 0, length = googleContacts.length; i < length; i++) {
      gContact               = new com.gContactSync.GContact(googleContacts[i]);
      gContact.lastModified  = gContact.getLastModifiedDate();
      gContact.id            = gContact.getValue("id").value;
      gContacts[gContact.id] = gContact;
    }
    // Step 2: iterate through TB Contacts and check for matches
    for (var i = 0, length = abCards.length; i < length; i++) {
      var tbContact = new com.gContactSync.TBContact(abCards[i], ab);
      var id = tbContact.getValue("GoogleID");
      com.gContactSync.LOGGER.LOG(tbContact.getName());
      tbContact.id = id;
      // no ID = new contact
      if (!id) {
        if (ab.mPrefs.readOnly == "true") {
          com.gContactSync.LOGGER.LOG(" * The contact is new. " +
                                      "Ignoring since read-only mode is on.");
        }
        else {
          com.gContactSync.LOGGER.LOG(" * This contact is new and will be added to Google.");
          com.gContactSync.Sync.mContactsToAdd.push(tbContact.mContact); // TODO convert the array to use TBContacts
        }
      }
      // if there is a matching Google Contact
      else if (gContacts[id]) {
        gContact   = gContacts[id];
        // remove it from gContacts
        gContacts[id]  = null;
        // note that this returns 0 if readOnly is set
        var tbCardDate = tbContact.getValue("LastModifiedDate");
        var gCardDate  = ab.mPrefs.writeOnly != "true" ? gContact.lastModified : 0;
        // 4 options
        // if both were updated
        com.gContactSync.LOGGER.LOG(found + "  -  " + gCardDate + " - " + tbCardDate);
        com.gContactSync.LOGGER.VERBOSE_LOG(" * Google ID: " + id);
        // If there is a conflict, looks at the updateGoogleInConflicts
        // preference and updates Google if it's true, or Thunderbird if false
        if (gCardDate > lastSync && tbCardDate > lastSync/1000) {
          com.gContactSync.LOGGER.LOG(bothChanged);
          if (ab.mPrefs.writeOnly  == "true" || ab.mPrefs.updateGoogleInConflicts == "true") {
            com.gContactSync.LOGGER.LOG(bothGoogle);
            var toUpdate = {};
            toUpdate.gContact = gContact;
            toUpdate.abCard   = tbContact.mContact; // TODO update to use TBContact
            com.gContactSync.Sync.mContactsToUpdate.push(toUpdate);
          }
          // update Thunderbird if writeOnly is off and updateGoogle is off
          else {
            com.gContactSync.LOGGER.LOG(bothTB);
            com.gContactSync.ContactConverter.makeCard(gContact, tbContact.mContact); // TODO update to use TBContact
          }
        }
        // if the contact from google is newer update the TB card
        else if (gCardDate > lastSync) {
          com.gContactSync.LOGGER.LOG(" * The contact from Google is newer...Updating the" +
                                      " contact from Thunderbird");
          com.gContactSync.ContactConverter.makeCard(gContact, tbContact.mContact); // TODO update to use TBContact
        }
        // if the TB card is newer update Google
        else if (tbCardDate > lastSync/1000) {
          com.gContactSync.LOGGER.LOG(" * The contact from Thunderbird is newer...Updating the" +
                                      " contact from Google");
          var toUpdate = {};
          toUpdate.gContact = gContact;
          toUpdate.abCard   = tbContact.mContact; // TODO update to use TBContact
          com.gContactSync.Sync.mContactsToUpdate.push(toUpdate);
        }
        // otherwise nothing needs to be done
        else
          com.gContactSync.LOGGER.LOG(" * Neither contact has changed");
      }
      // if there isn't a match, but the card is new, add it to Google
      else if (tbContact.getValue("LastModifiedDate") > lastSync/1000) {
        com.gContactSync.Sync.mContactsToAdd.push(tbContact.mContact); // TODO convert the array to use TBContacts
      }
      // otherwise, delete the contact from the address book
      else {
        cardsToDelete.push(tbContact.mContact); // TODO update to use TBContact
      }
    }
    // STEP 3: Check for old Google contacts to delete and new contacts to add to TB
    com.gContactSync.LOGGER.LOG("**Looking for unmatched Google contacts**");
    for (var id in gContacts) {
      var gContact = gContacts[id];
      if (gContact) {
        com.gContactSync.LOGGER.LOG(gContact.getName());
        var gCardDate = ab.mPrefs.writeOnly != "true" ? gContact.lastModified : 0;
        if (gCardDate > lastSync) {
          com.gContactSync.LOGGER.LOG(" * The contact is new and will be added to Thunderbird");
          com.gContactSync.ContactConverter.makeCard(gContact);
        }
        else if (ab.mPrefs.readOnly != "true") {
          com.gContactSync.LOGGER.LOG(" * The contact is old will be deleted");
          com.gContactSync.Sync.mContactsToDelete.push(gContact);
        }
        else {
          com.gContactSync.LOGGER.LOG (" * The contact was deleted in Thunderbird.  " +
                                       "Ignoring since read-only mode is on.");
        }
      }
    }
    // delete the old contacts from Thunderbird
    ab.deleteCards(cardsToDelete);

    com.gContactSync.LOGGER.LOG("***Deleting contacts from Google***");
    // delete contacts from Google
    com.gContactSync.Sync.processDeleteQueue();
  },
  /**
   * Deletes all contacts from Google included in the mContactsToDelete
   * array one at a time to avoid timing conflicts. Calls com.gContactSync.Sync.processAddQueue()
   * when finished.
   */
  processDeleteQueue: function Sync_processDeleteQueue() {
    var ab = com.gContactSync.Sync.mCurrentAb;
    if (!com.gContactSync.Sync.mContactsToDelete
        || com.gContactSync.Sync.mContactsToDelete.length == 0
        || ab.mPrefs.readOnly == "true") {
      com.gContactSync.LOGGER.LOG("***Adding contacts to Google***");
      com.gContactSync.Sync.processAddQueue();
      return;
    }
    // TODO if com.gContactSync.Sync.mContactsUrl is set should the contact just be removed from
    // that group or completely removed?
    com.gContactSync.Overlay.setStatusBarText(com.gContactSync.StringBundle.getStr("deleting") + " " +
                                              com.gContactSync.Sync.mContactsToDelete.length + " " +
                                              com.gContactSync.StringBundle.getStr("remaining"));
    var contact = com.gContactSync.Sync.mContactsToDelete.shift();
    var editURL = contact.getValue("EditURL").value;
    com.gContactSync.LOGGER.LOG(" * " + contact.getName() + "  -  " + editURL);

    var httpReq = new com.gContactSync.GHttpRequest("delete",
                                                    com.gContactSync.Sync.mCurrentAuthToken,
                                                    editURL, null,
                                                    com.gContactSync.Sync.mCurrentUsername);
    httpReq.addHeaderItem("If-Match", "*");
    httpReq.mOnSuccess = ["com.gContactSync.Sync.processDeleteQueue();"];
    httpReq.mOnError   = ["com.gContactSync.LOGGER.LOG_ERROR('Error while deleting contact', " +
                          "httpReq.responseText);",
                          "com.gContactSync.Sync.processDeleteQueue();"];
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineCommand;
    httpReq.send();
  },
  /**
   * Adds all cards to Google included in the mContactsToAdd array one at a 
   * time to avoid timing conflicts.  Calls
   * com.gContactSync.Sync.processUpdateQueue() when finished.
   */
  processAddQueue: function Sync_processAddQueue() {
    var ab = com.gContactSync.Sync.mCurrentAb;
    // if all contacts were added then update all necessary contacts
    if (!com.gContactSync.Sync.mContactsToAdd
        || com.gContactSync.Sync.mContactsToAdd.length == 0
        || ab.mPrefs.readOnly == "true") {
      com.gContactSync.LOGGER.LOG("***Updating contacts from Google***");
      com.gContactSync.Sync.processUpdateQueue();
      return;
    }
    com.gContactSync.Overlay.setStatusBarText(com.gContactSync.StringBundle.getStr("adding") + " " +
                                              com.gContactSync.Sync.mContactsToAdd.length + " " +
                                              com.gContactSync.StringBundle.getStr("remaining"));
    var cardToAdd = com.gContactSync.Sync.mContactsToAdd.shift();
    com.gContactSync.LOGGER.LOG("\n" + cardToAdd.displayName);
    // get the XML representation of the card
    // NOTE: cardToAtomXML adds the contact to the current group, if any
    var xml = com.gContactSync.ContactConverter.cardToAtomXML(cardToAdd).xml;
    var string = com.gContactSync.serialize(xml);
    if (com.gContactSync.Preferences.mSyncPrefs.verboseLog.value)
      com.gContactSync.LOGGER.LOG(" * XML of contact being added:\n" + string + "\n");
    var httpReq = new com.gContactSync.GHttpRequest("add",
                                                    com.gContactSync.Sync.mCurrentAuthToken,
                                                    null,
                                                    string,
                                                    com.gContactSync.Sync.mCurrentUsername);
    /* When the contact is successfully created:
     *  1. Get the card from which the contact was made
     *  2. Set the card's GoogleID attribute to match the new contact's ID
     *  3. Update the card in the address book
     *  4. Call this method again
     */
    var onCreated = [
      "var ab = com.gContactSync.Sync.mCurrentAb",
      "var card = com.gContactSync.ContactConverter.mCurrentCard;",
      "ab.setCardValue(card, 'GoogleID', httpReq.responseXML.getElementsByTagNameNS"
      + "(com.gContactSync.gdata.namespaces.ATOM.url, 'id')[0].childNodes[0].nodeValue);",
      "ab.updateCard(card);",
      "com.gContactSync.Sync.processAddQueue();"];
    httpReq.mOnCreated = onCreated;
    httpReq.mOnError   = ["com.gContactSync.LOGGER.LOG_ERROR('Error while adding contact', " +
                          "httpReq.responseText);",
                          "com.gContactSync.Sync.processAddQueue();"];
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineCommand;
    httpReq.send();
  },
  /**
   * Updates all cards to Google included in the mContactsToUpdate array one at
   * a time to avoid timing conflicts.  Calls com.gContactSync.Sync.syncNextUser() when done
   */
  processUpdateQueue: function Sync_processUpdateQueue() {
    var ab = com.gContactSync.Sync.mCurrentAb;
    if (!com.gContactSync.Sync.mContactsToUpdate
        || com.gContactSync.Sync.mContactsToUpdate.length == 0
        || ab.mPrefs.readOnly == "true") {
      com.gContactSync.Sync.syncNextUser();
      return;
    }
    com.gContactSync.Overlay.setStatusBarText(com.gContactSync.StringBundle.getStr("updating") + " " +
                                              com.gContactSync.Sync.mContactsToUpdate.length + " " +
                                              com.gContactSync.StringBundle.getStr("remaining"));
    var obj      = com.gContactSync.Sync.mContactsToUpdate.shift();
    var gContact = obj.gContact;
    var abCard   = obj.abCard;

    var editURL = gContact.getValue("EditURL").value;
    com.gContactSync.LOGGER.LOG("\nUpdating " + gContact.getName());
    var xml = com.gContactSync.ContactConverter.cardToAtomXML(abCard, gContact).xml;

    var string = com.gContactSync.serialize(xml);
    if (com.gContactSync.Preferences.mSyncPrefs.verboseLog.value)
      com.gContactSync.LOGGER.LOG(" * XML of contact being updated:\n" + string + "\n");
    var httpReq = new com.gContactSync.GHttpRequest("update",
                                                    com.gContactSync.Sync.mCurrentAuthToken,
                                                    editURL,
                                                    string,
                                                    com.gContactSync.Sync.mCurrentUsername);
    httpReq.addHeaderItem("If-Match", "*");
    httpReq.mOnSuccess = ["com.gContactSync.Sync.processUpdateQueue();"];
    httpReq.mOnError   = ["com.gContactSync.LOGGER.LOG_ERROR('Error while updating contact', " +
                          "httpReq.responseText);",
                          "com.gContactSync.Sync.processUpdateQueue();"],
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineCommand;
    httpReq.send();
  },
  /**
   * com.gContactSync.Sync.syncGroups
   * Syncs all contact groups with mailing lists.
   */
  syncGroups: function Sync_syncGroups(aAtom) {
    // reset the groups object
    com.gContactSync.Sync.mGroups         = {};
    com.gContactSync.Sync.mLists          = {};
    com.gContactSync.Sync.mGroupsToAdd    = [];
    com.gContactSync.Sync.mGroupsToDelete = [];
    com.gContactSync.Sync.mGroupsToUpdate = [];
    // if there wasn't an error, setup groups
    if (aAtom) {
      var ab         = com.gContactSync.Sync.mCurrentAb;
      var ns         = com.gContactSync.gdata.namespaces.ATOM;
      var lastSync   = parseInt(ab.getLastSyncDate());
      var myContacts = ab.mPrefs.myContacts == "true";
      var arr        = aAtom.getElementsByTagNameNS(ns.url, "entry");
      var noCatch    = false;
      // get the mailing lists if not only synchronizing my contacts
      if (!myContacts) {
        com.gContactSync.LOGGER.VERBOSE_LOG("***Getting all mailing lists***");
        com.gContactSync.Sync.mLists = ab.getAllLists(true);
        com.gContactSync.LOGGER.VERBOSE_LOG("***Getting all contact groups***");
        for (var i = 0; i < arr.length; i++) {
          try {
            var group = new com.gContactSync.Group(arr[i]);
            // add the ID to mGroups by making a new property with the ID as the
            // name and the title as the value for easy lookup for contacts
            var id = group.getID();
            var title = group.getTitle();
            var modifiedDate = group.getLastModifiedDate();
            com.gContactSync.LOGGER.LOG(" * " + title + " - " + id +
                       " last modified: " + modifiedDate);
            var list = com.gContactSync.Sync.mLists[id];
            com.gContactSync.Sync.mGroups[id] = group;
            if (modifiedDate < lastSync) { // it's an old group
              if (list) {
                list.matched = true;
                // if the name is different, update the group's title
                var listName = list.getName();
                com.gContactSync.LOGGER.LOG("  - Matched with mailing list " + listName);
                if (listName != title) {
                  // You cannot rename system groups...so change the name back
                  // In the future system groups will be localized, so this
                  // must be ignored.
                  if (group.isSystemGroup()) {
                    // If write-only is on then ignore the name change
                    if (ab.mPrefs.writeOnly != "true")
                      list.setName(title);
                    com.gContactSync.LOGGER.LOG_WARNING("  - A system group was renamed in Thunderbird");
                  }
                  else if (ab.mPrefs.readOnly == "true") {
                    com.gContactSync.LOGGER.LOG(" - The mailing list's name has changed.  " +
                                                "Ignoring since read-only mode is on.");
                  }
                  else {
                    com.gContactSync.LOGGER.LOG("  - Going to rename the group to " + listName);
                    group.setTitle(listName);
                    com.gContactSync.Sync.mGroupsToUpdate.push(group);
                  }
                }
              }
              else {
                if (ab.mPrefs.readOnly == "true") {
                  com.gContactSync.LOGGER.LOG(" - A mailing list was deleted.  " +
                                              "Ignoring since read-only mode is on.");
                }
                else {
                  // System groups cannot be deleted.
                  // This would be difficult to recover from, so stop
                  // synchronization and reset the AB
                  if (group.isSystemGroup()) {
                    noCatch = true; // don't catch this error
                    com.gContactSync.LOGGER.LOG_ERROR("  - A system group was deleted from Thunderbird");
                    var restartStr = com.gContactSync.StringBundle.getStr("pleaseRestart");
                    if (confirm(com.gContactSync.StringBundle.getStr("resetConfirm"))) {
                      ab.reset();
                      com.gContactSync.Overlay.setStatusBarText(restartStr);
                      alert(restartStr);
                    }
                    // Throw an error to stop the sync
                    throw "A system group was deleted from Thunderbird";                  
                  }
                  else {
                    com.gContactSync.Sync.mGroupsToDelete.push(group);
                    com.gContactSync.LOGGER.LOG("  - Didn't find a matching mail list.  It will be deleted");
                  }
                }
              }
            }
            else { // it is new or updated
              if (list) { // the group has been updated
                com.gContactSync.LOGGER.LOG("  - Matched with mailing list " + listName);
                // if the name changed, update the mail list's name
                if (list.getName() != title) {
                  if (ab.mPrefs.writeOnly == "true") {
                    com.gContactSync.LOGGER.VERBOSE_LOG(" - The group was renamed, but write-only mode was enabled");
                  }
                  else {
                    com.gContactSync.LOGGER.LOG("  - The group's name changed, updating the list");
                    list.setName(title);
                    list.update();
                  }
                }
                list.matched = true;
              }
              else { // the group is new
                if (ab.mPrefs.writeOnly == "true") {
                  com.gContactSync.LOGGER.VERBOSE_LOG(" - The group is new, but write-only mode was enabled");
                }
                else {
                  // make a new mailing list with the same name
                  com.gContactSync.LOGGER.LOG("  - The group is new");
                  var list = ab.addList(title, id);
                  com.gContactSync.LOGGER.VERBOSE_LOG("  - List added to address book");
                }
              }
            }
          }
          catch(e) {
            if (noCatch) throw e;
            com.gContactSync.LOGGER.LOG_ERROR("Error while syncing groups: " + e);
          }
        }
        com.gContactSync.LOGGER.LOG("***Looking for unmatched mailing lists***");
        for (var i in com.gContactSync.Sync.mLists) {
          var list = com.gContactSync.Sync.mLists[i];
          if (list && !list.matched) {
            // if it is new, make a new group in Google
            if (i.indexOf("http://www.google.com/m8/feeds/groups/") == -1) {
              com.gContactSync.LOGGER.LOG("-Found new list named " + list.getName());
              com.gContactSync.LOGGER.VERBOSE_LOG(" * The URI is: " + list.getURI());
              if (ab.mPrefs.readOnly == "true") {
                com.gContactSync.LOGGER.LOG(" * Ignoring since read-only mode is on");  
              }
              else {
                com.gContactSync.LOGGER.LOG(" * It will be added to Google");
                com.gContactSync.Sync.mGroupsToAdd.push(list);
              }
            }
            // if it is old, delete it
            else {
                com.gContactSync.LOGGER.LOG("-Found an old list named " + list.getName());
                com.gContactSync.LOGGER.VERBOSE_LOG(" * The URI is: " + list.getURI());
                if (ab.mPrefs.writeOnly == "true") {
                  com.gContactSync.LOGGER.VERBOSE_LOG(" * Write-only mode was enabled so no action will be taken");
                }
                else {
                  com.gContactSync.LOGGER.LOG(" * It will be deleted from Thunderbird");
                  list.delete();
                }
            }
          }
        }
      }
      else {
        var groupName = ab.mPrefs.myContactsName.toLowerCase();
        com.gContactSync.LOGGER.LOG("Only synchronizing the '" + groupName + "' group.");
        var group, id, sysId, title;
        var foundGroup = false;
        for (var i = 0; i < arr.length; i++) {
          try {
            group = new com.gContactSync.Group(arr[i]);
            // add the ID to mGroups by making a new property with the ID as the
            // name and the title as the value for easy lookup for contacts
            // Note: If someone wants to sync a group with the same name as a
            // system group then this method won't work because system gruoups
            // are first.
            id    = group.getID();
            sysId = group.getSystemId();
            sysId = sysId ? sysId.toLowerCase() : "";
            title = group.getTitle().toLowerCase();
            com.gContactSync.LOGGER.VERBOSE_LOG("  - Found a group named '"
                                                + title + "' with ID '"
                                                + id + "'");
            if (sysId == groupName || title == groupName) {
              foundGroup = true;
              break;
            }
          }
          catch (e) {alert(e);}
        }
        if (foundGroup) {
          com.gContactSync.LOGGER.LOG(" * Found the group to synchronize: " + id);
          com.gContactSync.Sync.mContactsUrl = id;
          return com.gContactSync.Sync.getContacts();
        }
        else {
          var msg = " * Could not find the group '" + groupName + "' to synchronize."
          com.gContactSync.LOGGER.LOG_ERROR(msg);
          return com.gContactSync.Sync.syncNextUser();
        }
      }
    }
    com.gContactSync.LOGGER.LOG("***Deleting old groups from Google***");
    return com.gContactSync.Sync.deleteGroups();
  },
  /**
   * com.gContactSync.Sync.deleteGroups
   * Deletes all of the groups in mGroupsToDelete one at a time to avoid timing
   * issues.  Calls com.gContactSync.Sync.addGroups() when finished.
   */
  deleteGroups: function Sync_deleteGroups() {
    var ab = com.gContactSync.Sync.mCurrentAb;
    if (com.gContactSync.Sync.mGroupsToDelete.length == 0
        || ab.mPrefs.readOnly == "true") {
      com.gContactSync.LOGGER.LOG("***Adding new groups to Google***");
      com.gContactSync.Sync.addGroups();
      return;
    }
    var group = com.gContactSync.Sync.mGroupsToDelete.shift();
    com.gContactSync.LOGGER.LOG("-Deleting group: " + group.getTitle());
    var httpReq = new com.gContactSync.GHttpRequest("delete",
                                                    com.gContactSync.Sync.mCurrentAuthToken,
                                                    group.getEditURL(),
                                                    null,
                                                    com.gContactSync.Sync.mCurrentUsername);
    httpReq.mOnSuccess = ["com.gContactSync.Sync.deleteGroups();"];
    httpReq.mOnError   = ["com.gContactSync.LOGGER.LOG_ERROR('Error while deleting group', " +
                          "httpReq.responseText);",
                          "com.gContactSync.Sync.deleteGroups();"];
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineCommand;
    httpReq.addHeaderItem("If-Match", "*");
    httpReq.send();
  },
  /**
   * com.gContactSync.Sync.addGroups
   * The first part of adding a group involves creating the XML representation
   * of the mail list and then calling com.gContactSync.Sync.addGroups2() upon successful
   * creation of a group.
   */
  addGroups: function Sync_addGroups() {
    var ab = com.gContactSync.Sync.mCurrentAb;
    if (com.gContactSync.Sync.mGroupsToAdd.length == 0
        || ab.mPrefs.readOnly == "true") {
      com.gContactSync.LOGGER.LOG("***Updating groups from Google***");
      com.gContactSync.Sync.updateGroups();
      return;
    }
    var list = com.gContactSync.Sync.mGroupsToAdd[0];
    var group = new com.gContactSync.Group(null, list.getName());
    com.gContactSync.LOGGER.LOG("-Adding group: " + group.getTitle());
    var body = com.gContactSync.serialize(group.xml);
    if (com.gContactSync.Preferences.mSyncPrefs.verboseLog.value)
      com.gContactSync.LOGGER.VERBOSE_LOG(" * XML feed of new group:\n" + body);
    var httpReq = new com.gContactSync.GHttpRequest("addGroup",
                                                    com.gContactSync.Sync.mCurrentAuthToken,
                                                    null,
                                                    body,
                                                    com.gContactSync.Sync.mCurrentUsername);
    httpReq.mOnCreated = ["com.gContactSync.Sync.addGroups2(httpReq);"];
    httpReq.mOnError =   ["com.gContactSync.LOGGER.LOG_ERROR('Error while adding group', " +
                          "httpReq.responseText);",
                          "com.gContactSync.Sync.mGroupsToAddURI.shift()",
                          "com.gContactSync.Sync.addGroups();"];
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineCommand;
    httpReq.send();
  },
  /**
   * com.gContactSync.Sync.addGroups2
   * The second part of adding a group involves updating the list from which
   * this group was created so the two can be matched during the next sync.
   */
  addGroups2: function Sync_addGroups2(aResponse) {
    var group = new com.gContactSync.Group(aResponse.responseXML
                                   .getElementsByTagNameNS(com.gContactSync.gdata.namespaces.ATOM.url,
                                                           "entry")[0]);
    if (com.gContactSync.Preferences.mSyncPrefs.verboseLog.value)
      com.gContactSync.LOGGER.LOG(com.gContactSync.serializeFromText(aResponse.responseText));
    var list = com.gContactSync.Sync.mGroupsToAdd.shift();
    var id   = group.getID();
    list.setNickName(id);
    if (list.update)
      list.update();
    com.gContactSync.Sync.mLists[id] = list;
    com.gContactSync.Sync.addGroups();
  },
  /**
   * com.gContactSync.Sync.updateGroups
   * Updates all groups in mGroupsToUpdate one at a time to avoid timing issues
   * and calls com.gContactSync.Sync.getContacts() when finished.
   */
  updateGroups: function Sync_updateGroups() {
    var ab = com.gContactSync.Sync.mCurrentAb;
    if (com.gContactSync.Sync.mGroupsToUpdate.length == 0
        || ab.mPrefs.readOnly == "true") {
      com.gContactSync.Sync.getContacts();
      return;
    }
    var group = com.gContactSync.Sync.mGroupsToUpdate.shift();
    com.gContactSync.LOGGER.LOG("-Updating group: " + group.getTitle());
    var body = com.gContactSync.serialize(group.xml);
    if (com.gContactSync.Preferences.mSyncPrefs.verboseLog.value)
      com.gContactSync.LOGGER.VERBOSE_LOG(" * XML feed of group: " + body);
    var httpReq = new com.gContactSync.GHttpRequest("update",
                                                    com.gContactSync.Sync.mCurrentAuthToken,
                                                    group.getEditURL(),
                                                    body,
                                                    com.gContactSync.Sync.mCurrentUsername);
    httpReq.mOnSuccess = ["com.gContactSync.Sync.updateGroups();"];
    httpReq.mOnError   = ["com.gContactSync.LOGGER.LOG_ERROR(httpReq.responseText);",
                          "com.gContactSync.Sync.updateGroups();"];
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineCommand;
    httpReq.addHeaderItem("If-Match", "*");
    httpReq.send();
  },
  /**
   * com.gContactSync.Sync.schedule
   * Schedules another sync after the given delay if one is not already scheduled,
   * there isn't a sync currently running, if the delay is greater than 0, and
   * finally if the auto sync pref is set to true.
   * @param aDelay The duration of time to wait before synchronizing again
   */
  schedule: function Sync_schedule(aDelay) {
    // only schedule a sync if the delay is greater than 0, a sync is not
    // already scheduled, and autosyncing is enabled
    if (aDelay && com.gContactSync.Sync.mSynced &&
        !com.gContactSync.Sync.mSyncScheduled && aDelay > 0 &&
        com.gContactSync.Preferences.mSyncPrefs.autoSync.value) {
      com.gContactSync.Sync.mSyncScheduled = true;
      com.gContactSync.LOGGER.VERBOSE_LOG("Next sync in: " + aDelay + " milliseconds");
      setTimeout(com.gContactSync.Sync.begin, aDelay);  
    }
  }
};
