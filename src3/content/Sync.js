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

if (!com) var com = {}; // A generic wrapper variable
// A wrapper for all GCS functions and variables
if (!com.gContactSync) com.gContactSync = {};

/**
 * Synchronizes a Thunderbird Address Book with Google Contacts.
 * @class
 */
com.gContactSync.Sync = {
  /** Google contacts that should be deleted */
  mContactsToDelete: [],
  /** New contacts to add to Google */
  mContactsToAdd:    [],
  /** Contacts to update */
  mContactsToUpdate: [],
  /** Groups to delete */
  mGroupsToDelete:   [],
  /** Groups to add */
  mGroupsToAdd:      [],
  /** Groups to update */
  mGroupsToUpdate:   [],
  /** Groups to add (URIs) */
  mGroupsToAddURI:   [],
  /** The current authentication token */
  mCurrentAuthToken: {},
  /** The current username */
  mCurrentUsername:  {},
  /** The current address book being synchronized */
  mCurrentAb:        {},
  /** Synchronized address book */
  mAddressBooks:     [],
  /** The index of the AB being synced */
  mIndex:            0,
  /** The URI of a photo to be added to the newly created Google contact */
  mNewPhotoURI:      {},
  /** An array of commands to execute when offline during an HTTP Request */
  mOfflineFunction: function Sync_offlineFunc(httpReq) {
    com.gContactSync.Overlay.setStatusBarText(com.gContactSync.StringBundle.getStr('offlineStatusText')); 
    com.gContactSync.Sync.finish(com.gContactSync.StringBundle.getStr('offlineStatusText'));
  },

  // booleans used for timing to make sure only one synchronization occurs at a
  // time and that only one sync is scheduled at once
  /** True if no synchronization is in progress */
  mSynced:        true,
  /** True if a synchronization is scheduled */
  mSyncScheduled: false,
  /** used to store groups for the account being synchronized */
  mGroups:        {},
  /** stores the mail lists in the directory being synchronized */
  mLists:         {},
  /** override for the contact feed URL.  Intended for syncing one group only */
  mContactsUrl:   null,
  /**
   * Performs the first steps of the sync process.
   */
  begin: function Sync_begin() {
    if (!com.gContactSync.gdata.isAuthValid()) {
      com.gContactSync.alert(com.gContactSync.StringBundle.getStr("pleaseAuth"));
      return;
   }
    // quit if still syncing.
    if (!com.gContactSync.Sync.mSynced)
      return;
    // get the next auth token
    com.gContactSync.Sync.mSyncScheduled = false;
    com.gContactSync.Sync.mSynced        = false;
    com.gContactSync.LOGGER.mErrorCount  = 0; // reset the error count
    com.gContactSync.Overlay.setStatusBarText(com.gContactSync.StringBundle.getStr("syncing"));
    com.gContactSync.Sync.mIndex         = 0;
    com.gContactSync.Sync.mAddressBooks  = com.gContactSync.GAbManager.getSyncedAddressBooks(true);
    com.gContactSync.Sync.syncNextUser();
  },
  /**
   * Synchronizes the next address book in com.gContactSync.Sync.mAddressBooks.
   * If all ABs were synchronized, then this continues with com.gContactSync.Sync.finish();
   */
  syncNextUser: function Sync_syncNextUser() {
    var obj = com.gContactSync.Sync.mAddressBooks[com.gContactSync.Sync.mIndex++];
    if (!obj) {
      com.gContactSync.Sync.finish();
      return;
    }
    // make sure the user doesn't have to restart TB
    if (com.gContactSync.Preferences.mSyncPrefs.needRestart.value) {
      var restartStr = com.gContactSync.StringBundle.getStr("pleaseRestart");
      com.gContactSync.alert(restartStr);
      com.gContactSync.Overlay.setStatusBarText(restartStr);
      return;
    }
    com.gContactSync.Overlay.setStatusBarText(com.gContactSync.StringBundle.getStr("syncing"));
    com.gContactSync.Sync.mCurrentUsername = obj.username;
    com.gContactSync.LOGGER.LOG("Starting Synchronization for " + com.gContactSync.Sync.mCurrentUsername +
                                " at: " + Date() + "\n");
    com.gContactSync.Sync.mCurrentAb        = obj.ab;
    com.gContactSync.Sync.mCurrentAuthToken = com.gContactSync.LoginManager.getAuthTokens()[com.gContactSync.Sync.mCurrentUsername];
    com.gContactSync.Sync.mContactsUrl      = null;
    com.gContactSync.LOGGER.VERBOSE_LOG("Found Address Book with name: " +
                       com.gContactSync.Sync.mCurrentAb.mDirectory.dirName +
                       "\n - URI: " + com.gContactSync.Sync.mCurrentAb.mURI +
                       "\n - Pref ID: " + com.gContactSync.Sync.mCurrentAb.getPrefId());
    if (com.gContactSync.Sync.mCurrentAb.mPrefs.Disabled === "true") {
      com.gContactSync.LOGGER.LOG("*** NOTE: Synchronization was disabled for this address book ***");
      com.gContactSync.Sync.mCurrentAb = null;
      com.gContactSync.Sync.syncNextUser();
      return;
    }
    // If an authentication token cannot be found for this username then
    // offer to let the user login with that account
    if (!com.gContactSync.Sync.mCurrentAuthToken) {
      com.gContactSync.LOGGER.LOG_WARNING("Unable to find the auth token for: " +
                                          com.gContactSync.Sync.mCurrentUsername);
      if (com.gContactSync.confirm(com.gContactSync.StringBundle.getStr("noTokenFound") +
                  ": " + com.gContactSync.Sync.mCurrentUsername +
                  "\n" + com.gContactSync.StringBundle.getStr("ab") +
                  ": " + com.gContactSync.Sync.mCurrentAb.getName())) {
        // Now let the user login
        var prompt   = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                 .getService(Components.interfaces.nsIPromptService)
                                 .promptUsernameAndPassword,
            username = {value: com.gContactSync.Sync.mCurrentUsername},
            password = {},
        // opens a username/password prompt
            ok = prompt(window, com.gContactSync.StringBundle.getStr("loginTitle"),
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
          com.gContactSync.alertError(com.gContactSync.StringBundle.getStr("invalidEmail"));
          com.gContactSync.Sync.syncNextUser();
          return;
        }
        // fix the username before authenticating
        username.value = com.gContactSync.fixUsername(username.value);
        var body    = com.gContactSync.gdata.makeAuthBody(username.value, password.value);
        var httpReq = new com.gContactSync.GHttpRequest("authenticate", null, null, body);
        // if it succeeds and Google returns the auth token, store it and then start
        // a new sync
        httpReq.mOnSuccess = function reauth_onSuccess(httpReq) {
          com.gContactSync.LoginManager.addAuthToken(username.value,
                                                     'GoogleLogin' +
                                                     httpReq.responseText.split("\n")[2]);
          com.gContactSync.Sync.syncNextUser();
        };
        // if it fails, alert the user and prompt them to try again
        httpReq.mOnError   = function reauth_onError(httpReq) {
          com.gContactSync.alertError(com.gContactSync.StringBundle.getStr('authErr'));
          com.gContactSync.LOGGER.LOG_ERROR('Authentication Error - ' +
                                            httpReq.status,
                                            httpReq.responseText);
          com.gContactSync.Sync.syncNextUser();
        };
        // if the user is offline, alert them and quit
        httpReq.mOnOffline = com.gContactSync.Sync.mOfflineFunction;
        httpReq.send();
      }
      else
        com.gContactSync.Sync.syncNextUser();
      return;
    }
    var lastBackup = parseInt(obj.ab.mPrefs.lastBackup, 10),
        interval   = com.gContactSync.Preferences.mSyncPrefs.backupInterval.value * 24 * 3600 * 1000;
    com.gContactSync.LOGGER.VERBOSE_LOG(" - Last backup was at " + lastBackup +
                                        ", interval is " + interval);
    // determine if the AB should be backed up
    if (!lastBackup && interval >= 0) {
      com.gContactSync.GAbManager.backupAB(com.gContactSync.Sync.mCurrentAb,
                                           "init_", ".bak");
    }
    else if (interval >= 0 && new Date().getTime() - lastBackup > interval) {
      com.gContactSync.GAbManager.backupAB(com.gContactSync.Sync.mCurrentAb, "",
                                           ".bak");
    }
    // getGroups must be called if the myContacts pref is set so it can find the
    // proper group URL
    if (com.gContactSync.Sync.mCurrentAb.mPrefs.syncGroups === "true" ||
        (com.gContactSync.Sync.mCurrentAb.mPrefs.myContacts !== "false" &&
         com.gContactSync.Sync.mCurrentAb.mPrefs.myContactsName !== "false")) {
      com.gContactSync.Sync.getGroups();
    }
    else {
      com.gContactSync.Sync.getContacts();
    }
  },
  /**
   * Sends an HTTP Request to Google for a feed of all of the user's groups.
   * Calls com.gContactSync.Sync.begin() when there is a successful response on an error other
   * than offline.
   */
  getGroups: function Sync_getGroups() {
    com.gContactSync.LOGGER.LOG("***Beginning Group - Mail List Synchronization***");
    var httpReq = new com.gContactSync.GHttpRequest("getGroups",
                                                    com.gContactSync.Sync.mCurrentAuthToken,
                                                    null,
                                                    null,
                                                    com.gContactSync.Sync.mCurrentUsername);
    httpReq.mOnSuccess = function getGroupsSuccess(httpReq) {
      com.gContactSync.LOGGER.VERBOSE_LOG(com.gContactSync.serializeFromText(httpReq.responseText));
      com.gContactSync.Sync.syncGroups(httpReq.responseXML);
    };
    httpReq.mOnError   = function getGroupsError(httpReq) {
      com.gContactSync.LOGGER.LOG_ERROR(httpReq.responseText);
      // if there is an error, try to sync w/o groups                   
      com.gContactSync.Sync.begin();
    };
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineFunction;
    httpReq.send();
  },
  /**
   * Sends an HTTP Request to Google for a feed of all the user's contacts.
   * Calls com.gContactSync.Sync.sync with the response if successful or com.gContactSync.Sync.syncNextUser with the
   * error.
   */
  getContacts: function Sync_getContacts() {
    com.gContactSync.LOGGER.LOG("***Beginning Contact Synchronization***");
    var httpReq;
    if (com.gContactSync.Sync.mContactsUrl) {
      httpReq = new com.gContactSync.GHttpRequest("getFromGroup",
                                                  com.gContactSync.Sync.mCurrentAuthToken,
                                                  null,
                                                  null,
                                                  com.gContactSync.Sync.mCurrentUsername, com.gContactSync.Sync.mContactsUrl);
    }
    else {
      httpReq = new com.gContactSync.GHttpRequest("getAll",
                                                  com.gContactSync.Sync.mCurrentAuthToken,
                                                  null,
                                                  null,
                                                  com.gContactSync.Sync.mCurrentUsername);
    }
    // com.gContactSync.serializeFromText does not do anything if verbose logging is disabled
    // so this next line won't waste time
    httpReq.mOnSuccess = function getContactsSuccess(httpReq) {
      com.gContactSync.LOGGER.VERBOSE_LOG(com.gContactSync.serializeFromText(httpReq.responseText));
      com.gContactSync.Sync.sync2(httpReq.responseXML);
    };
    httpReq.mOnError   = function getContactsError(httpReq) {
      com.gContactSync.LOGGER.LOG_ERROR('Error while getting all contacts', +
                                        httpReq.responseText);
      com.gContactSync.Sync.syncNextUser(httpReq.responseText);
    };
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineFunction;
    httpReq.send();
  },
  /**
   * Completes the synchronization process by writing the finish time to a file,
   * writing the sync details to a different file, scheduling another sync, and
   * writes the completion status to the status bar.
   * 
   * @param aError     {string} Optional.  A string containing the error message.
   * @param aStartOver {boolean}   Also optional.  True if the sync should be restarted.
   */
  finish: function Sync_finish(aError, aStartOver) {
    if (aError)
      com.gContactSync.LOGGER.LOG_ERROR("Error during sync", aError);
    if (com.gContactSync.LOGGER.mErrorCount > 0) {
      // if there was an error, display the error message unless the user is
      // offline
      if (com.gContactSync.Overlay.getStatusBarText() !== aError)
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
  /**
   * Does the actual synchronization of contacts and modifies the AB as it goes.
   * Initializes arrays of Google contacts to add, remove, or update.
   * @param aAtom {XML} The ATOM/XML feed of contacts.
   */
  sync2: function Sync_sync2(aAtom) {
    // get the address book
    var ab = com.gContactSync.Sync.mCurrentAb,
    // get all the contacts from the feed and the cards from the address book
        googleContacts = aAtom.getElementsByTagName('entry'),
        abCards = ab.getAllContacts(),
    // get and log the last sync time (milliseconds since 1970 UTC)
        lastSync = parseInt(ab.mPrefs.lastSync, 10),
        cardsToDelete = [],
        maxContacts = com.gContactSync.Preferences.mSyncPrefs.maxContacts.value,
    // if there are more contacts than returned, increase the pref
        newMax;
    // mark the AB as not having been reset if it gets this far
    com.gContactSync.Sync.mCurrentAb.savePref("reset", false);
    // have to update the lists or TB 2 won't work properly
    com.gContactSync.Sync.mLists = ab.getAllLists();
    com.gContactSync.LOGGER.LOG("Last sync was at: " + lastSync);
    if ((newMax = com.gContactSync.gdata.contacts.getNumberOfContacts(aAtom)) >= maxContacts.value) {
      com.gContactSync.Preferences.setPref(com.gContactSync.Preferences.mSyncBranch, maxContacts.label,
                          maxContacts.type, newMax + 50);
      com.gContactSync.Sync.finish("Max Contacts too low...resynchronizing", true);
      return;
    }
    com.gContactSync.Sync.mContactsToAdd    = [];
    com.gContactSync.Sync.mContactsToDelete = [];
    com.gContactSync.Sync.mContactsToUpdate = [];
    var gContact,
     // get the strings outside of the loop so they are only found once
        found       = " * Found a match Last Modified Dates:",
        bothChanged = " * Conflict detected: the contact has been updated in " +
                      "both Google and Thunderbird",
        bothGoogle  = " * The contact from Google will be updated",
        bothTB      = " * The card from Thunderbird will be updated",
        gContacts   = {};
    // Step 1: get all contacts from Google into GContact objects in an object
    // keyed by ID.
    for (var i = 0, length = googleContacts.length; i < length; i++) {
      gContact               = new com.gContactSync.GContact(googleContacts[i]);
      gContact.lastModified  = gContact.getLastModifiedDate();
      gContact.id            = gContact.getValue("id").value;
      gContacts[gContact.id] = gContact;
    }
    // re-initialize the contact converter (in case a pref changed)
    com.gContactSync.ContactConverter.init();
    // Step 2: iterate through TB Contacts and check for matches
    for (i = 0, length = abCards.length; i < length; i++) {
      var tbContact = abCards[i],
          id        = tbContact.getValue("GoogleID");
      com.gContactSync.LOGGER.LOG(tbContact.getName() + ": " + id);
      tbContact.id = id;
      // no ID = new contact
      if (!id) {
        if (ab.mPrefs.readOnly === "true") {
          com.gContactSync.LOGGER.LOG(" * The contact is new. " +
                                      "Ignoring since read-only mode is on.");
        }
        else {
          com.gContactSync.LOGGER.LOG(" * This contact is new and will be added to Google.");
          com.gContactSync.Sync.mContactsToAdd.push(tbContact);
        }
      }
      // if there is a matching Google Contact
      else if (gContacts[id]) {
        gContact   = gContacts[id];
        // remove it from gContacts
        gContacts[id]  = null;
        // note that this returns 0 if readOnly is set
        var tbCardDate = tbContact.getValue("LastModifiedDate"),
            gCardDate  = ab.mPrefs.writeOnly !== "true" ? gContact.lastModified : 0;
        // 4 options
        // if both were updated
        com.gContactSync.LOGGER.LOG(found + "  -  " + gCardDate + " - " + tbCardDate);
        com.gContactSync.LOGGER.VERBOSE_LOG(" * Google ID: " + id);
        // If there is a conflict, looks at the updateGoogleInConflicts
        // preference and updates Google if it's true, or Thunderbird if false
        if (gCardDate > lastSync && tbCardDate > lastSync / 1000) {
          com.gContactSync.LOGGER.LOG(bothChanged);
          if (ab.mPrefs.writeOnly  === "true" || ab.mPrefs.updateGoogleInConflicts === "true") {
            com.gContactSync.LOGGER.LOG(bothGoogle);
            var toUpdate = {};
            toUpdate.gContact = gContact;
            toUpdate.abCard   = tbContact;
            com.gContactSync.Sync.mContactsToUpdate.push(toUpdate);
          }
          // update Thunderbird if writeOnly is off and updateGoogle is off
          else {
            com.gContactSync.LOGGER.LOG(bothTB);
            com.gContactSync.ContactConverter.makeCard(gContact, tbContact);
          }
        }
        // if the contact from google is newer update the TB card
        else if (gCardDate > lastSync) {
          com.gContactSync.LOGGER.LOG(" * The contact from Google is newer...Updating the" +
                                      " contact from Thunderbird");
          com.gContactSync.ContactConverter.makeCard(gContact, tbContact);
        }
        // if the TB card is newer update Google
        else if (tbCardDate > lastSync / 1000) {
          com.gContactSync.LOGGER.LOG(" * The contact from Thunderbird is newer...Updating the" +
                                      " contact from Google");
          var toUpdate = {};
          toUpdate.gContact = gContact;
          toUpdate.abCard   = tbContact;
          com.gContactSync.Sync.mContactsToUpdate.push(toUpdate);
        }
        // otherwise nothing needs to be done
        else
          com.gContactSync.LOGGER.LOG(" * Neither contact has changed");
      }
      // if there isn't a match, but the card is new, add it to Google
      else if (tbContact.getValue("LastModifiedDate") > lastSync / 1000)
        com.gContactSync.Sync.mContactsToAdd.push(tbContact);
      // otherwise, delete the contact from the address book
      else
        cardsToDelete.push(tbContact);
    }
    // STEP 3: Check for old Google contacts to delete and new contacts to add to TB
    com.gContactSync.LOGGER.LOG("**Looking for unmatched Google contacts**");
    for (var id in gContacts) {
      var gContact = gContacts[id];
      if (gContact) {
        com.gContactSync.LOGGER.LOG(gContact.getName() + ": " + id);
        var gCardDate = ab.mPrefs.writeOnly != "true" ? gContact.lastModified : 0;
        if (gCardDate > lastSync) {
          com.gContactSync.LOGGER.LOG(" * The contact is new and will be added to Thunderbird");
          var newCard = ab.newContact();
          com.gContactSync.ContactConverter.makeCard(gContact, newCard);
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
    var threshold = com.gContactSync.Preferences.mSyncPrefs
                                                .confirmDeleteThreshold.value;
    // Request permission from the user to delete > threshold contacts from a
    // single source
    // If the user clicks Cancel the AB is disabled
    if (threshold > -1 &&
          (cardsToDelete.length >= threshold ||
           com.gContactSync.Sync.mContactsToDelete.length >= threshold) &&
          !com.gContactSync.Sync.requestDeletePermission(cardsToDelete.length,
                                                       com.gContactSync.Sync.mContactsToDelete.length)) {
        com.gContactSync.Sync.syncNextUser();
        return;
    }
    // delete the old contacts from Thunderbird
    if (cardsToDelete.length > 0) {
      ab.deleteContacts(cardsToDelete);
    }

    com.gContactSync.LOGGER.LOG("***Deleting contacts from Google***");
    // delete contacts from Google
    com.gContactSync.Sync.processDeleteQueue();
  },
  /**
   * Shows a confirmation dialog asking the user to give gContactSync permission
   * to delete the specified number of contacts from Google and Thunderbird.
   * If the user clicks Cancel then synchronization with the current address
   * book is disabled.
   * @param {int} The number of contacts about to be deleted from Thunderbird.
   * @param {int} The number of contacts about to be deleted from Google.
   * @returns {boolean} True if the user clicked OK, false if Cancel.
   */
  requestDeletePermission: function Sync_requestDeletePermission(aNumTB, aNumGoogle) {
    var warning = com.gContactSync.StringBundle.getStr("confirmDelete1") +
                  " '" + com.gContactSync.Sync.mCurrentAb.getName() + "'" +
                  "\nThunderbird: " + aNumTB +
                  "\nGoogle: "      + aNumGoogle +
                  "\n" + com.gContactSync.StringBundle.getStr("confirmDelete2");
    com.gContactSync.LOGGER.LOG("Requesting permission to delete " +
                                "TB: " + aNumTB + ", Google: " + aNumGoogle +
                                " contacts...");
    if (!com.gContactSync.confirm(warning)) {
      com.gContactSync.LOGGER.LOG(" * Permission denied, disabling AB");
      ab.savePref("Disabled", true);
      com.gContactSync.alert(com.gContactSync.StringBundle.getStr("deleteCancel"));
      return false;
    }
    com.gContactSync.LOGGER.LOG(" * Permission granted");
    return true;
  },
  /**
   * Deletes all contacts from Google included in the mContactsToDelete
   * array one at a time to avoid timing conflicts. Calls
   * com.gContactSync.Sync.processAddQueue() when finished.
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
    // TODO if com.gContactSync.Sync.mContactsUrl is set should the contact just
    // be removed from that group or completely removed?
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
    httpReq.mOnSuccess = com.gContactSync.Sync.processDeleteQueue;
    httpReq.mOnError   = function processDeleteError(httpReq) {
      com.gContactSync.LOGGER.LOG_ERROR('Error while deleting contact',
                                        httpReq.responseText);
      com.gContactSync.Sync.processDeleteQueue();
    };
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineFunction;
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
    com.gContactSync.LOGGER.LOG("\n" + cardToAdd.getName());
    // get the XML representation of the card
    // NOTE: cardToAtomXML adds the contact to the current group, if any
    var gcontact = com.gContactSync.ContactConverter.cardToAtomXML(cardToAdd);
    var xml      = gcontact.xml;
    var string   = com.gContactSync.serialize(xml);
    if (com.gContactSync.Preferences.mSyncPrefs.verboseLog.value)
      com.gContactSync.LOGGER.LOG(" * XML of contact being added:\n" + string + "\n");
    var httpReq = new com.gContactSync.GHttpRequest("add",
                                                    com.gContactSync.Sync.mCurrentAuthToken,
                                                    null,
                                                    string,
                                                    com.gContactSync.Sync.mCurrentUsername);
    this.mNewPhotoURI = com.gContactSync.Preferences.mSyncPrefs.sendPhotos ?
                          gcontact.mNewPhotoURI : null;
    /* When the contact is successfully created:
     *  1. Get the card from which the contact was made
     *  2. Get a GContact object for the new contact
     *  3. Set the card's GoogleID attribute to match the new contact's ID
     *  4. Update the card in the address book
     *  5. Set the new contact's photo, if necessary
     *  6. Call this method again
     */
    var onCreated = function contactCreated(httpReq) {
      var ab       = com.gContactSync.Sync.mCurrentAb,
          contact  = com.gContactSync.ContactConverter.mCurrentCard,
          gcontact = new com.gContactSync.GContact(httpReq.responseXML);
      contact.setValue('GoogleID', gcontact.getID(true));
      contact.update();
      // if photos are allowed to be uploaded to Google then do so
      if (com.gContactSync.Preferences.mSyncPrefs.sendPhotos) {
        gcontact.setPhoto(com.gContactSync.Sync.mNewPhotoURI);
      }
      // reset the new photo URI variable
      com.gContactSync.Sync.mNewPhotoURI = null;
      com.gContactSync.Sync.processAddQueue();
    }
    httpReq.mOnCreated = onCreated;
    httpReq.mOnError   = function contactCreatedError(httpReq) {
      com.gContactSync.LOGGER.LOG_ERROR('Error while adding contact',
                                        httpReq.responseText);
      com.gContactSync.Sync.processAddQueue();
    };
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineFunction;
    httpReq.send();
  },
  /**
   * Updates all cards to Google included in the mContactsToUpdate array one at
   * a time to avoid timing conflicts.  Calls
   * com.gContactSync.Sync.syncNextUser() when done if there is at least one
   * more AB to sync, otherwise calls com.gContactSync.Sync.finish().
   */
  processUpdateQueue: function Sync_processUpdateQueue() {
    var ab = com.gContactSync.Sync.mCurrentAb;
    if (!com.gContactSync.Sync.mContactsToUpdate
        || com.gContactSync.Sync.mContactsToUpdate.length == 0
        || ab.mPrefs.readOnly == "true") {
      // set the previous address book's last sync date (if it exists)
      if (com.gContactSync.Sync.mCurrentAb &&
          com.gContactSync.Sync.mCurrentAb.setLastSyncDate) {
        com.gContactSync.Sync.mCurrentAb.setLastSyncDate((new Date()).getTime());
      }
      var delay = com.gContactSync.Preferences.mSyncPrefs.accountDelay.value;
      com.gContactSync.LOGGER.LOG("**About to wait " + delay +
                                  " ms before synchronizing the next account**");
      com.gContactSync.Overlay.setStatusBarText(com.gContactSync.StringBundle.getStr("waiting"));
      if (com.gContactSync.Sync.mAddressBooks[com.gContactSync.Sync.mIndex + 1]) {
        setTimeout(com.gContactSync.Sync.syncNextUser, delay);
      }
      else {
        com.gContactSync.Sync.finish();
      }
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
    httpReq.mOnSuccess = com.gContactSync.Sync.processUpdateQueue;
    httpReq.mOnError   = function processUpdateError(httpReq) {
      com.gContactSync.LOGGER.LOG_ERROR('Error while updating contact',
                                        httpReq.responseText);
      com.gContactSync.Sync.processUpdateQueue();
    };
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineFunction;
    httpReq.send();
  },
  /**
   * Syncs all contact groups with mailing lists.
   * @param aAtom {XML} The ATOM/XML feed of Groups.
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
      var lastSync   = parseInt(ab.mPrefs.lastSync, 10);
      var myContacts = ab.mPrefs.myContacts == "true" && ab.mPrefs.myContactsName;
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
                    if (com.gContactSync.confirm(com.gContactSync.StringBundle.getStr("resetConfirm"))) {
                      ab.reset();
                      com.gContactSync.Overlay.setStatusBarText(restartStr);
                      com.gContactSync.alert(restartStr);
                      com.gContactSync.Preferences.setSyncPref("needRestart", true);
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
          catch (e) {
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
                  list.remove();
                }
            }
          }
        }
      }
      else {
        var groupName = ab.mPrefs.myContactsName.toLowerCase();
        com.gContactSync.LOGGER.LOG("Only synchronizing the '"
                                    + ab.mPrefs.myContactsName + "' group.");
        var group, id, sysId, title;
        var foundGroup = false;
        for (var i = 0; i < arr.length; i++) {
          try {
            group = new com.gContactSync.Group(arr[i]);
            // add the ID to mGroups by making a new property with the ID as the
            // name and the title as the value for easy lookup for contacts
            // Note: If someone wants to sync a group with the same name as a
            // system group then this method won't work because system groups
            // are first.
            id    = group.getID();
            sysId = group.getSystemId();
            title = group.getTitle();
            com.gContactSync.LOGGER.VERBOSE_LOG("  - Found a group named '"
                                                + title + "' with ID '"
                                                + id + "'");
            title = title ? title.toLowerCase() : "";
            sysId = sysId ? sysId.toLowerCase() : "";
            if (sysId == groupName || title == groupName) {
              foundGroup = true;
              break;
            }
          }
          catch (e) {com.gContactSync.alertError(e);}
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
    httpReq.mOnSuccess = com.gContactSync.Sync.deleteGroups;
    httpReq.mOnError   = function deleteGroupsError(httpReq) {
      com.gContactSync.LOGGER.LOG_ERROR('Error while deleting group',
                                        httpReq.responseText);
      com.gContactSync.Sync.deleteGroups();
    };
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineFunction;
    httpReq.addHeaderItem("If-Match", "*");
    httpReq.send();
  },
  /**
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
    httpReq.mOnCreated = com.gContactSync.Sync.addGroups2;
    httpReq.mOnError =   function addGroupError(httpReq) {
      com.gContactSync.LOGGER.LOG_ERROR('Error while adding group',
                                        httpReq.responseText);
      com.gContactSync.Sync.mGroupsToAddURI.shift()
      com.gContactSync.Sync.addGroups();
    };
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineFunction;
    httpReq.send();
  },
  /**
   * The second part of adding a group involves updating the list from which
   * this group was created so the two can be matched during the next sync.
   * @param aResponse {XMLHttpRequest} The HTTP request.
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
    httpReq.mOnSuccess = com.gContactSync.Sync.updateGroups;
    httpReq.mOnError   = function updateGroupError(httpReq) {
      com.gContactSync.LOGGER.LOG_ERROR("Error while updating group",
                                        httpReq.responseText);
      com.gContactSync.Sync.updateGroups();
    };
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineFunction;
    httpReq.addHeaderItem("If-Match", "*");
    httpReq.send();
  },
  /**
   * Schedules another sync after the given delay if one is not already scheduled,
   * there isn't a sync currently running, if the delay is greater than 0, and
   * finally if the auto sync pref is set to true.
   * @param aDelay {integer} The duration of time to wait before synchronizing
   *                         again.
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
