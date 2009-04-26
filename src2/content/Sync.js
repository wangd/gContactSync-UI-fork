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
 * Josh Geenen <gcontactsync@pirules.net>.
 * Portions created by the Initial Developer are Copyright (C) 2008
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

/**
 * Sync.js
 * Synchronizes a Thunderbird Address Book with Google Contacts.
 * @class
 */
var Sync = {
  // a few arrays treated as queues to add/delete/update contacts and cards
  mContactsToDelete: [],
  mContactsToAdd: [],
  mContactsToUpdate: [],
  mGroupsToDelete: [],
  mGroupsToAdd: [],
  mGroupsToUpdate: [],
  mGroupsToAddURI: [],
  mCurrentAuthToken: {},
  mCurrentUsername: {},
  mCurrentAb: {},
  mAddressBooks: [],
  mIndex: 0,
  // an array of commands to execute when offline during an HTTP Request
  mOfflineCommand: ["Overlay.setStatusBarText(StringBundle.getStr('offlineStatusText'));", 
                    "Sync.finish(StringBundle.getStr('offlineStatusText'));"],

  // booleans used for timing to make sure only one synchronization occurs at a
  // time and that only one sync is scheduled at once
  mSynced: true,
  mSyncScheduled: false,
  mGroups: {}, // used to store groups for the account being synchronized
  mLists: {}, // stores the mail lists in the directory being synchronized
  /**
   * Sync.begin
   * Performs the first steps of the sync process.
   * @param firstLog Should be true if the user just logged in.
   */
  begin: function Sync_begin() {
    if (!gdata.isAuthValid()) {
      alert(StringBundle.getStr("pleaseAuth"));
      return;
   }
    // quit if still syncing.
    if (!this.mSynced)
      return;
    // get the next auth token
    Preferences.getSyncPrefs(); // get the preferences
    this.mSyncScheduled = false;
    this.mSynced = false;
    LOGGER.mErrorCount = 0; // reset the error count
    Overlay.setStatusBarText(StringBundle.getStr("syncing"));
    this.mIndex = 0;
    this.mAddressBooks = AbManager.getSyncedAddressBooks(true);
    this.syncNextUser()
  },
  syncNextUser: function Sync_syncNextUser() {
    // set the previous address book's last sync date (if it exists)
    if (this.mCurrentAb && this.mCurrentAb.setLastSyncDate)
      this.mCurrentAb.setLastSyncDate((new Date()).getTime());
    var obj = this.mAddressBooks[this.mIndex++];
    if (!obj) {
      this.finish();
      return;
    }
    this.mCurrentUsername = obj.username;
    LOGGER.LOG("Starting Synchronization for " + this.mCurrentUsername +
               " at: " + Date() + "\n");
    this.mCurrentAb = obj.primary;
    this.mCurrentAuthToken = LoginManager.getAuthTokens()[this.mCurrentUsername];
    if (!this.mCurrentAuthToken) {
      LOGGER.LOG_WARNING("Unable to find the auth token for: " + this.mCurrentUsername);
      this.syncNextUser();
      return;
    }
    LOGGER.VERBOSE_LOG("Found Address Book with name: " +
                       this.mCurrentAb.mDirectory.dirName +
                       "\n - URI: " + this.mCurrentAb.mURI +
                       "\n - Pref ID: " + this.mCurrentAb.getPrefId());
    if (Preferences.mSyncPrefs.syncGroups.value)
      this.getGroups();
    else
      this.getContacts();
  },
  /**
   * Sync.getGroups
   * Sends an HTTP Request to Google for a feed of all of the user's groups.
   * Calls Sync.begin() when there is a successful response on an error other
   * than offline.
   */
  getGroups: function Sync_getGroups() {
    LOGGER.LOG("***Beginning Group - Mail List Synchronization***");
    var httpReq = new GHttpRequest("getGroups", this.mCurrentAuthToken, null,
                                   null, this.mCurrentUsername);
    httpReq.mOnSuccess = ["LOGGER.VERBOSE_LOG(serializeFromText(httpReq.responseText))",
                          "Sync.syncGroups(httpReq.responseXML);"],
    httpReq.mOnError = ["LOGGER.LOG_ERROR(httpReq.responseText);",
                        "Sync.begin();"]; // if there is an error, try to sync w/o groups                   
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  /**
   * Sync.getContacts
   * Sends an HTTP Request to Google for a feed of all the user's contacts.
   * Calls Sync.sync with the response if successful or Sync.syncNextUser with the
   * error.
   */
  getContacts: function Sync_getContacts() {
    LOGGER.LOG("***Beginning Contact Synchronization***");
    var httpReq = new GHttpRequest("getAll", this.mCurrentAuthToken, null, null,
                                   this.mCurrentUsername);
    httpReq.mOnSuccess = ["LOGGER.VERBOSE_LOG(serializeFromText(httpReq.responseText))",
                          "Sync.sync2(httpReq.responseXML);"];
    httpReq.mOnError = ["LOGGER.LOG_ERROR('Error while updating group', " +
                        "httpReq.responseText);",
                        "Sync.syncNextUser(httpReq.responseText);"];
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  /**
   * Sync.finish
   * Completes the synchronization process by writing the finish time to a file,
   * writing the sync details to a different file, scheduling another sync, and
   * writes the completion status to the status bar.
   * 
   * @param aError     Optional.  A string containing the error message.
   * @param aStartOver Also optional.  True if the sync should be restarted.
   */
  finish: function Sync_finish(aError, aStartOver) {
    if (aError)
      LOGGER.LOG_ERROR("Error during sync", aError);
    if (LOGGER.mErrorCount > 0) {
      // if there was an error, display the error message unless the user is
      // offline
      if (Overlay.getStatusBarText() != aError)
        Overlay.setStatusBarText(StringBundle.getStr("errDuringSync"));
    }
    else {
      Overlay.writeTimeToStatusBar();
      LOGGER.LOG("Finished Synchronization at: " + Date());
    }
    ContactConverter.mCurrentCard = {};
    this.mSynced = true;
    this.mCurrentAb = {};
    this.mCurrentUsername = {};
    this.mCurrentAuthToken = {};
    // refresh the ab results pane
    // https://www.mozdev.org/bugs/show_bug.cgi?id=19733
    SetAbView(GetSelectedDirectory(), false);
    // select the first card, if any
    if (gAbView && gAbView.getCardFromRow(0))
      SelectFirstCard();
    // start over, if necessary, or schedule the next synchronization
    if (aStartOver)
      this.begin();
    else
      this.schedule(Preferences.mSyncPrefs.refreshInterval.value * 60000);
  },
  // could be faster by fetching new and deleted contacts?
  // should modify the listener:
  //  when a contact is added to TB, try to add to google (would need something
  // to bypass the default sync behavior - check the response and set a flag in
  // the contact to override)
  //  when a contact is modified, try to modify the Google contact
  sync2: function Sync_sync2(aAtom) {
    // get the address book
    var ab = this.mCurrentAb;
    // have to update the lists or TB 2 won't work properly
    this.mLists = ab.getAllLists();
    // get all the contacts from the feed and the cards from the address book
    var googleContacts = aAtom.getElementsByTagName('entry');
    var abCards = ab.getAllCards();
    // get and log the last sync time (milliseconds since 1970 UTC)
    var lastSync = parseInt(ab.getLastSyncDate());
    LOGGER.LOG("Last sync was at: " + lastSync);
    var cardsToDelete = [];
    var maxContacts = Preferences.mSyncPrefs.maxContacts.value;
    // if there are more contacts than returned, increase the pref
    var newMax;
    if ((newMax = gdata.contacts.getNumberOfContacts(aAtom)) >= maxContacts.value) {
      Preferences.setPref(Preferences.mSyncBranch, maxContacts.label,
                          maxContacts.type, newMax + 50);
      this.finish("Max Contacts too low...resynchronizing", true);
      return;
    }
    this.mContactsToAdd = [];
    this.mContactsToDelete = [];
    this.mContactsToUpdate = [];
    var gContact;
     // get the strings outside of the loop so they are only found once
    var found = " * Found a match Last Modified Dates:";
    var bothChanged = " * Conflict detected: the contact has been updated in " +
                      "both Google and Thunderbird";
    var bothGoogle = " * The contact from Google will be updated";
    var bothTB = " * The card from Thunderbird will be updated";
    var gContacts = {};
    // Step 1: get all contacts from Google into GContact objects in an object keyed by ID
    for (var i = 0, length = googleContacts.length; i < length; i++) {
      var gContact = new GContact(googleContacts[i]);
      var id = gContact.getValue("id").value;
      var lastModified = gContact.getLastModifiedDate();
      gContact.lastModified = lastModified;
      gContact.id = id;
      gContacts[id] = gContact;
    }
    // Step 2: iterate through TB Contacts and check for matches
    for (var i = 0, length = abCards.length; i < length; i++) {
      var tbContact = new TBContact(abCards[i], ab);
      var id = tbContact.getValue("GoogleID");
      LOGGER.LOG(tbContact.getName());
      tbContact.id = id;
      // no ID = new contact
      if (!id) {
        this.mContactsToAdd.push(tbContact.mContact); // TODO convert the array to use TBContacts
      }
      // if there is a matching Google Contact
      else if (gContacts[id]) {
        var gContact = gContacts[id];
        // remove it from gContacts
        gContacts[id] = null;
        var tbCardDate = tbContact.getValue("LastModifiedDate");
        var gCardDate = gContact.lastModified;
        // 4 options
        // if both were updated
        LOGGER.LOG(found + "  -  " + gCardDate + " - " + tbCardDate);
        LOGGER.VERBOSE_LOG(" * Google ID: " + id);
        // If there is a conflict, looks at the updateGoogleInConflicts
        // preference and updates Google if it's true, or Thunderbird if false
        if (gCardDate > lastSync && tbCardDate > lastSync/1000) {
          LOGGER.LOG(bothChanged);
          if (Preferences.mSyncPrefs.updateGoogleInConflicts.value) {
            LOGGER.LOG(bothGoogle);
            var toUpdate = {};
            toUpdate.gContact = gContact;
            toUpdate.abCard = tbContact.mContact; // TODO update to use TBContact
            this.mContactsToUpdate.push(toUpdate);
          }
          else { // update thunderbird
            LOGGER.LOG(bothTB);
            ContactConverter.makeCard(gContact, tbContact.mContact); // TODO update to use TBContact
          }
        }
        // if the contact from google is newer update the TB card
        else if (gCardDate > lastSync) {
          LOGGER.LOG(" * The contact from Google is newer...Updating the" +
                     " contact from Thunderbird");
          ContactConverter.makeCard(gContact, tbContact.mContact); // TODO update to use TBContact
        }
        // if the TB card is newer update Google
        else if (tbCardDate > lastSync/1000) {
          LOGGER.LOG(" * The contact from Thunderbird is newer...Updating the" +
                     " contact from Google");
          var toUpdate = {};
          toUpdate.gContact = gContact;
          toUpdate.abCard = tbContact.mContact; // TODO update to use TBContact
          this.mContactsToUpdate.push(toUpdate);
        }
        // otherwise nothing needs to be done
        else
          LOGGER.LOG(" * Neither contact has changed");
      }
      // if there isn't a match, but the card is new, add it to Google
      else if (tbContact.getValue("LastModifiedDate") > lastSync/1000) {
        this.mContactsToAdd.push(tbContact.mContact); // TODO convert the array to use TBContacts
      }
      // otherwise, delete the contact from the address book
      else {
        cardsToDelete.push(tbContact.mContact); // TODO update to use TBContact
      }
    }
    // STEP 3: Check for old Google contacts to delete and new contacts to add to TB
    for (var id in gContacts) {
      var gContact = gContacts[id];
      if (gContact) {
        var gCardDate = gContact.lastModified;
        if (gCardDate > lastSync) {
          LOGGER.LOG(" * The contact is new and will be added to Thunderbird");
          ContactConverter.makeCard(gContact);
        }
        else {
          LOGGER.LOG(" * The contact is old will be deleted");
          this.mContactsToDelete.push(gContact);
        }
      }
    }
    // delete the old contacts from Thunderbird
    ab.deleteCards(cardsToDelete);

    LOGGER.LOG("***Deleting contacts from Google***");
    // delete contacts from Google
    this.processDeleteQueue();
  },
  
  /**
   * Deletes all contacts from Google included in the mContactsToDelete
   * array one at a time to avoid timing conflicts. Calls Sync.processAddQueue()
   * when finished.
   */
  processDeleteQueue: function Sync_processDeleteQueue() {
    if (!this.mContactsToDelete || this.mContactsToDelete.length == 0) {
      LOGGER.LOG("***Adding contacts to Google***");
      this.processAddQueue();
      return;
    }
    Overlay.setStatusBarText(StringBundle.getStr("deleting") + " " +
                             this.mContactsToDelete.length + " " +
                             StringBundle.getStr("remaining"));
    var contact = this.mContactsToDelete.shift();
    var editURL = contact.getValue("EditURL").value;
    LOGGER.LOG(" * " + contact.getName() + "  -  " + editURL);

    var httpReq = new GHttpRequest("delete", this.mCurrentAuthToken, editURL,
                                   null, this.mCurrentUsername);
    httpReq.addHeaderItem("If-Match", "*");
    httpReq.mOnSuccess = ["Sync.processDeleteQueue();"];
    httpReq.mOnError = ["LOGGER.LOG_ERROR('Error while deleting contact', " +
                          "httpReq.responseText);",
                        "Sync.processDeleteQueue();"];
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  /**
   * Adds all cards to Google included in the mContactsToAdd array one at a 
   * time to avoid timing conflicts.  Calls
   * Sync.processUpdateQueue() when finished.
   */
  processAddQueue: function Sync_processAddQueue() {
    // if all contacts were added then update all necessary contacts
    if (!this.mContactsToAdd || this.mContactsToAdd.length == 0) {
      LOGGER.LOG("***Updating contacts from Google***");
      this.processUpdateQueue();
      return;
    }
    Overlay.setStatusBarText(StringBundle.getStr("adding") + " " +
                             this.mContactsToAdd.length + " " +
                             StringBundle.getStr("remaining"));
    var cardToAdd = this.mContactsToAdd.shift();
    LOGGER.LOG("\n" + cardToAdd.displayName);
    // get the XML representation of the card
    var xml = ContactConverter.cardToAtomXML(cardToAdd).xml;
    var string = serialize(xml);
    if (Preferences.mSyncPrefs.verboseLog.value)
      LOGGER.LOG(" * XML of contact being added:\n" + string + "\n");
    var httpReq = new GHttpRequest("add", this.mCurrentAuthToken, null,
                                   string, this.mCurrentUsername);
    /* When the contact is successfully created:
     *  1. Get the card from which the contact was made
     *  2. Set the card's GoogleID attribute to match the new contact's ID
     *  3. Update the card in the address book
     *  4. Call this method again
     */
    var onCreated = [
      "var ab = Sync.mCurrentAb",
      "var card = ContactConverter.mCurrentCard;",
      "ab.setCardValue(card, 'GoogleID', httpReq.responseXML.getElementsByTagNameNS"
      + "(gdata.namespaces.ATOM.url, 'id')[0].childNodes[0].nodeValue);",
      "ab.updateCard(card);",
      "Sync.processAddQueue();"];
    httpReq.mOnCreated = onCreated;
    httpReq.mOnError   = ["LOGGER.LOG_ERROR('Error while adding contact', " +
                          "httpReq.responseText);",
                          "Sync.processAddQueue();"];
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  /**
   * Updates all cards to Google included in the mContactsToUpdate array one at
   * a time to avoid timing conflicts.  Calls Sync.syncNextUser() when done
   */
  processUpdateQueue: function Sync_processUpdateQueue() {
    if (!this.mContactsToUpdate || this.mContactsToUpdate.length == 0) {
      this.syncNextUser();
      return;
    }
    Overlay.setStatusBarText(StringBundle.getStr("updating") + " " +
                             this.mContactsToUpdate.length + " " +
                             StringBundle.getStr("remaining"));
    var obj = this.mContactsToUpdate.shift();
    var gContact = obj.gContact;
    var abCard = obj.abCard;

    var editURL = gContact.getValue("EditURL").value;
    LOGGER.LOG("\nUpdating " + gContact.getName());
    var xml = ContactConverter.cardToAtomXML(abCard, gContact).xml;

    var string = serialize(xml);
    if (Preferences.mSyncPrefs.verboseLog.value)
      LOGGER.LOG(" * XML of contact being updated:\n" + string + "\n");
    var httpReq = new GHttpRequest("update", this.mCurrentAuthToken, editURL,
                                   string, this.mCurrentUsername);
    httpReq.addHeaderItem("If-Match", "*");
    httpReq.mOnSuccess = ["Sync.processUpdateQueue();"];
    httpReq.mOnError   = ["LOGGER.LOG_ERROR('Error while updating contact', " +
                          "httpReq.responseText);",
                          "Sync.processUpdateQueue();"],
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  /**
   * Sync.syncGroups
   * Syncs all contact groups with mailing lists.
   */
  syncGroups: function Sync_syncGroups(aAtom) {
    // reset the groups object
    this.mGroups = {};
    this.mLists = {};
    // if there wasn't an error, setup groups
    if (aAtom) {
      var ab = this.mCurrentAb;
      var ns = gdata.namespaces.ATOM;
      var lastSync = parseInt(ab.getLastSyncDate());
      LOGGER.VERBOSE_LOG("***Getting all mailing lists***");
      this.mLists = ab.getAllLists(true);
      LOGGER.VERBOSE_LOG("***Getting all contact groups***");
      var arr = aAtom.getElementsByTagNameNS(ns.url, "entry");
      for (var i = 0; i < arr.length; i++) {
        try {
          var group = new Group(arr[i]);
          // add the ID to mGroups by making a new property with the ID as the
          // name and the title as the value for easy lookup for contacts
          var id = group.getID();
          var title = group.getTitle();
          var modifiedDate = group.getLastModifiedDate();
          LOGGER.LOG(" * " + title + " - " + id +
                     " last modified: " + modifiedDate);
          var list = this.mLists[id];
          this.mGroups[id] = group;
          if (modifiedDate < lastSync) { // it's an old group
            if (list) {
              list.matched = true;
              // if the name is different, update the group's title
              var listName = list.getName();
              LOGGER.LOG("  - Matched with mailing list " + listName);
              if (listName != title) {
                LOGGER.LOG("  - Going to rename the group to " + listName);
                group.setTitle(listName);
                this.mGroupsToUpdate.push(group);
              }
            }
            else {
              this.mGroupsToDelete.push(group);
              LOGGER.LOG("  - Didn't find a matching mail list.  It will be deleted");
            }
          }
          else { // it is new or updated
            if (list) { // the group has been updated
              LOGGER.LOG("  - Matched with mailing list " + listName);
              // if the name changed, update the mail list's name
              if (list.getName() != title) {
                LOGGER.LOG("  - The group's name changed, updating the list");
                list.setName(title);
                list.update();
              }
              list.matched = true;
            }
            else { // the group is new
              // make a new mailing list with the same name
              LOGGER.LOG("  - The group is new");
              var list = ab.addList(title, id);
              LOGGER.VERBOSE_LOG("  - List added to address book");
            }
          }
        }
        catch(e) { LOGGER.LOG_ERROR("Error while syncing groups: " + e); }
      }
      LOGGER.LOG("***Looking for unmatched mailing lists***");
      for (var i in this.mLists) {
        var list = this.mLists[i];
        if (list && !list.matched) {
          // if it is new, make a new group in Google
          if (i.indexOf("http://www.google.com/m8/feeds/groups/") == -1) {
            LOGGER.LOG("-Found new list named " + list.getName());
            LOGGER.VERBOSE_LOG(" * The URI is: " + list.getURI());
            LOGGER.LOG(" * It will be added to Google");
            this.mGroupsToAdd.push(list);
          }
          // if it is old, delete it
          else {
            LOGGER.LOG("-Found an old list named " + list.getName());
            LOGGER.VERBOSE_LOG(" * The URI is: " + list.getURI());
            LOGGER.LOG(" * It will be deleted from Thunderbird");
            list.delete();
          }
        }
      }
    }
    LOGGER.LOG("***Deleting old groups from Google***");
    this.deleteGroups();
  },
  /**
   * Sync.deleteGroups
   * Deletes all of the groups in mGroupsToDelete one at a time to avoid timing
   * issues.  Calls Sync.addGroups() when finished.
   */
  deleteGroups: function Sync_deleteGroups() {
    if (this.mGroupsToDelete.length == 0) {
      LOGGER.LOG("***Adding new groups to Google***");
      this.addGroups();
      return;
    }
    var group = this.mGroupsToDelete.shift();
    LOGGER.LOG("-Deleting group: " + group.getTitle());
    var httpReq = new GHttpRequest("delete", this.mCurrentAuthToken,
                                   group.getEditURL(), null,
                                   this.mCurrentUsername);
    httpReq.mOnSuccess = ["Sync.deleteGroups();"];
    httpReq.mOnError = ["LOGGER.LOG_ERROR('Error while deleting group', " +
                          "httpReq.responseText);",
                        "Sync.deleteGroups();"];
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.addHeaderItem("If-Match", "*");
    httpReq.send();
  },
  /**
   * Sync.addGroups
   * The first part of adding a group involves creating the XML representation
   * of the mail list and then calling Sync.addGroups2() upon successful
   * creation of a group.
   */
  addGroups: function Sync_addGroups() {
    if (this.mGroupsToAdd.length == 0) {
      LOGGER.LOG("***Updating groups from Google***");
      this.updateGroups();
      return;
    }
    var list = this.mGroupsToAdd[0];
    var group = new Group(null, list.getName());
    LOGGER.LOG("-Adding group: " + group.getTitle());
    if (Preferences.mSyncPrefs.verboseLog.value) {
      var body = serialize(group.xml);
      LOGGER.VERBOSE_LOG(" * XML feed of new group:\n" + body);
    }
    var httpReq = new GHttpRequest("addGroup", this.mCurrentAuthToken, null,
                                   body, this.mCurrentUsername);
    httpReq.mOnCreated = ["Sync.addGroups2(httpReq);"];
    httpReq.mOnError = ["LOGGER.LOG_ERROR('Error while adding group', " +
                                          "httpReq.responseText);",
                        "Sync.mGroupsToAddURI.shift()",
                        "Sync.addGroups();"];
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  /**
   * Sync.addGroups2
   * The second part of adding a group involves updating the list from which
   * this group was created so the two can be matched during the next sync.
   */
  addGroups2: function Sync_addGroups2(aResponse) {
    var group = new Group(aResponse.responseXML
                                   .getElementsByTagNameNS(gdata.namespaces.ATOM.url,
                                                           "entry")[0]);
    if (Preferences.mSyncPrefs.verboseLog.value)
      LOGGER.LOG(serializeFromText(aResponse.responseText));
    var list = this.mGroupsToAdd.shift();
    var id = group.getID();
    list.setNickName(id);
    if (list.update)
      list.update();
    this.mLists[id] = list;
    this.addGroups();
  },
  /**
   * Sync.updateGroups
   * Updates all groups in mGroupsToUpdate one at a time to avoid timing issues
   * and calls Sync.getContacts() when finished.
   */
  updateGroups: function Sync_updateGroups() {
    if (this.mGroupsToUpdate.length == 0) {
      this.getContacts();
      return;
    }
    var group = this.mGroupsToUpdate.shift();
    LOGGER.LOG("-Updating group: " + group.getTitle());
    if (Preferences.mSyncPrefs.verboseLog.value) {
      var body = serialize(group.xml);
      LOGGER.VERBOSE_LOG(" * XML feed of group: " + body);
    }
    var httpReq = new GHttpRequest("update", this.mCurrentAuthToken, group.getEditURL(),
                                   body, this.mCurrentUsername);
    httpReq.mOnSuccess = ["Sync.updateGroups();"];
    httpReq.mOnError = ["LOGGER.LOG_ERROR(httpReq.responseText);",
                        "Sync.updateGroups();"];
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.addHeaderItem("If-Match", "*");
    httpReq.send();
  },
  /**
   * Sync.schedule
   * Schedules another sync after the given delay if one is not already scheduled,
   * there isn't a sync currently running, if the delay is greater than 0, and
   * finally if the auto sync pref is set to true.
   * @param aDelay The duration of time to wait before synchronizing again
   */
  schedule: function Sync_schedule(aDelay) {
    // only schedule a sync if the delay is greater than 0, a sync is not
    // already schedule, and autosyncing is enabled
    if (aDelay && this.mSynced && !this.mSyncScheduled && aDelay > 0 &&
        Preferences.mSyncPrefs.autoSync.value) {
      this.mSyncScheduled = true;
      LOGGER.VERBOSE_LOG("Next sync in: " + aDelay + " milliseconds");
      setTimeout("Sync.begin();", aDelay);  
    }
  }
};
