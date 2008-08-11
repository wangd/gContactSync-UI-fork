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
  mAddedEmails: [],
  mGroupsToDelete: [],
  mGroupsToAdd: [],
  mGroupsToUpdate: [],
  mGroupsToAddURI: [],
  // an array of commands to execute when offline during an HTTP Request
  mOfflineCommand: ["Overlay.setStatusBarText(StringBundle.getStr('offlineStatusText'));", "Sync.finish();"],

  // booleans used for timing to make sure things don't happen out order
  mSynced: true,
  mSyncScheduled: false,
  mGroups: {}, // used to store groups
  mLists: {}, // stores the mail lists
  mFirstSync: false,
  /**
   * Sync.begin
   * Performs the first steps of the sync process.
   */
  begin: function() {
    if (!gdata.isAuthValid()) {
      alert(StringBundle.getStr("pleaseAuth"));
      return;
   }
    // quit if still syncing.
    if (!this.mSynced)
      return;
    // if this is the first sync, have the user setup some prefs
    if (!this.mFirstSync && FileIO.getLastSync() == 0) {
      this.confirmFirst();
      return;
    }
    Preferences.getSyncPrefs(); // get the preferences
    this.mSyncScheduled = false;
    this.mSynced = false;
    LOGGER.mErrorCount = 0; // reset the error count

    // get (and make, if necessary) the Google address book
    Overlay.mAddressBook.mDirectory = Overlay.mAddressBook.getAbByName(Preferences
                                             .mSyncPrefs.addressBookName.value);
    if (!Overlay.mAddressBook.mDirectory)
      throw "Unable to create Address Book" + StringBundle.getStr("pleaseReport");

    Overlay.setStatusBarText(StringBundle.getStr("syncing"));
    if (FileIO.mLogFile && FileIO.mLogFile.exists())
      FileIO.mLogFile.remove(false); // delete the old log file
    LOGGER.LOG("Starting Synchronization at: " + Date() + "\n");

    var httpReq = new GHttpRequest("getGroups", gdata.mAuthToken, null, null);
    httpReq.mOnSuccess = ["Sync.syncGroups(httpReq.responseXML);"],
    httpReq.mOnError = ["LOGGER.LOG_ERROR(httpReq.responseText);",
                        "Sync.begin();"]; // if there is an error, try to sync w/o groups                   
    httpReq.mOnOffline = this.mOfflineCommand
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
  finish: function(aError, aStartOver) {
    if (aError)
      LOGGER.LOG_ERROR("Error during sync", aError);
    if (LOGGER.mErrorCount > 0)
      Overlay.setStatusBarText(StringBundle.getStr("errDuringSync"));
    else {
      FileIO.writeLastSync();
      Overlay.writeTimeToStatusBar();
      LOGGER.LOG("Finished Synchronization at: " + Date());
    }
    Overlay.mAddressBook.mCurrentCard = {};
    this.mSynced = true;
    if (UpdateCardView)
      UpdateCardView(); // refresh the card view in case a contact was updated
    if (aStartOver)
      this.begin();
    else
      this.schedule(Preferences.mSyncPrefs.refreshInterval.value * 60000);
  },
  confirmFirst: function() {
    Overlay.setStatusBarText(StringBundle.getStr("initialSetup"));
    this.mFirstSync = true;
    this.begin();
  },
  /**
   * Sync.sync
   * Synchronizes the Address Book with the contacts obtained from Google.
   * @param aAtom The contacts from Google in an Atom.
   */
  sync: function(aAtom) {
    if (Preferences.mSyncPrefs.verboseLog.value) {
      var string = (new XMLSerializer()).serializeToString(aAtom);
      LOGGER.LOG(string + "\n");
    }
    // have to update the lists or TB 2 won't work properly
    this.mLists = Overlay.mAddressBook.getAllLists();
    var googleContacts = aAtom.getElementsByTagName('entry');
    var abCards = Overlay.mAddressBook.getAllCards();
    var lastSync = FileIO.getLastSync();
    LOGGER.VERBOSE_LOG("Last sync was at: " + lastSync);
    var cardsToDelete = [];
    this.ab = Overlay.mAddressBook;
    var ab = this.ab;
    ab.mDirectory.QueryInterface(Ci.nsIAbMDBDirectory);
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
    var gContact;

     // get the strings outside of the loop so they are only found once
    var found = " * Found a match Last Modified Dates:";
    var bothChanged = " * Conflict detected: the contact has been updated in " +
                      "both Google and Thunderbird";
    var bothGoogle = " * The contact from Google will be updated";
    var bothTB = " * The card from Thunderbird will be updated";
    LOGGER.LOG("***Finding and matching contacts from Google and Thunderbird***");
    for (var i = 0, length = googleContacts.length; i < length; i++) {
      gContact = new GContact(googleContacts[i]);
      var id = gContact.getValue("id");
      LOGGER.LOG("-" + gContact.getName());
      // a new array with only the unmatched cards                 
      var abCards2 = [];
      for (var j = 0, length2 = abCards.length; j < length2; j++) {
        var abCard = abCards[j];

        // if the cards are the same...
        if (ab.getCardValue(abCard, "GoogleID") == id) {
          var gCardDate = gContact.getLastModifiedDate();
          var tbCardDate = ab.getCardValue(abCard, "LastModifiedDate");
          if (!tbCardDate)
            tbCardDate = 0;
          LOGGER.LOG(found + "  -  " + gCardDate + " - " + tbCardDate);
          // If there is a conflict, looks at the updateGoogleInConflicts
          // preference and updates Google if it's true, or Thunderbird if false
          if (gCardDate > lastSync && tbCardDate > lastSync/1000) {
            LOGGER.LOG(bothChanged);
            if (Preferences.mSyncPrefs.updateGoogleInConflicts.value) {
              LOGGER.LOG(bothGoogle);
              var toUpdate = {};
              toUpdate.gContact = gContact;
              toUpdate.abCard = abCard;
              this.mContactsToUpdate.push(toUpdate);
            }
            else { // update thunderbird
              LOGGER.LOG(bothTB);
              ContactConverter.makeCard(gContact, abCard);
            }
          }
          // if the card from google is newer
          else if (gCardDate > lastSync) {
            LOGGER.LOG(" * The contact from Google is newer...Updating the" +
                       " card from Thunderbird");
            ContactConverter.makeCard(gContact, abCard);
          }
          // if the tbcard is newer
          else if (tbCardDate > lastSync/1000) {
            LOGGER.LOG(" * The card from Thunderbird is newer...Updating the" +
                       " contact from Google");
            var toUpdate = {};
            toUpdate.gContact = gContact;
            toUpdate.abCard = abCard;
            this.mContactsToUpdate.push(toUpdate);
          }
          else
            LOGGER.LOG(" * Neither card has changed");
          gContact.matched = true;
        }
        // duplicate...
        else if (ContactConverter.compareContacts(abCard, gContact)) {
          LOGGER.LOG(" * Duplicate detected");
          // default to deleting duplicates, but if the user wants to confirm
          // each duplicate ask for confirmation
          if (!Preferences.mSyncPrefs.confirmDuplicates.value || 
              confirm(StringBundle.getStr("duplicatePrompt")
              + " " + abCard.displayName + " " + abCard.primaryEmail + 
              StringBundle.getStr("duplicatePrompt2"))) {
            cardsToDelete.push(abCard);
            LOGGER.LOG("   o Duplicate deleted");
          }
          else
            LOGGER.LOG("   o Duplicate ignored");
        }
        else
          abCards2.push(abCard);
      }// end of inner for loop

      //copy over the new array
      abCards = abCards2;
      abCards2 = [];

      if (!gContact.matched) {
        LOGGER.LOG(" * No match was found");
        if (gContact.getLastModifiedDate() > lastSync) {
          LOGGER.LOG(" * The contact is new and will be added to Thunderbird");
          ContactConverter.makeCard(gContact);
        }
        else {
          LOGGER.LOG(" * The contact is old will be deleted");
          this.mContactsToDelete.push(gContact);
        }
      }
    }// end of outer for loop
    LOGGER.LOG("***Looking for unmatched Thunderbird cards***");
    for (var i = 0; i < abCards.length; i++) {
      var card = abCards[i];
      if (card != null && card instanceof nsIAbCard) {
        LOGGER.LOG("-" + card.displayName + " was not matched");
        // if it is a new card, add it to Google
        var id = ab.getCardValue(card, "GoogleID");
        var date = ab.getCardValue(card, "LastModifiedDate");
        var isNew = date > lastSync || date == 0;
        // will add the card if it doesn't have a GoogleID or if it was just
        // added/modified
        if (!id || isNew) {
          this.mContactsToAdd.push(card);
          LOGGER.LOG(" * It is new and will be added to Google - " + date);
        }
        // otherwise it should be removed
        else {
          cardsToDelete.push(card);
          LOGGER.LOG(" * It is old and will be deleted from Thunderbird - " +
                     date);
        }
      }
    } // end of for loop
    ab.deleteCards(cardsToDelete);
    LOGGER.LOG("***Deleting contacts from Google***");
    this.mAddedEmails = [];
    
    // start with deleting ab cards
    this.processDeleteQueue();
  },
  /**
   * Deletes all contacts from Google included in the mContactsToDelete
   * array one at a time to avoid timing conflicts. Calls Sync.processAddQueue()
   * when finished.
   */
  processDeleteQueue: function() {
    if (!this.mContactsToDelete || this.mContactsToDelete.length == 0) {
      LOGGER.LOG("***Adding contacts to Google***");
      this.processAddQueue();
      return;
    }
    Overlay.setStatusBarText(StringBundle.getStr("deleting") + " " +
                             this.mContactsToDelete.length + " " +
                             StringBundle.getStr("remaining"));
    var contact = this.mContactsToDelete.shift();
    var editURL = contact.getValue("EditURL");
    LOGGER.LOG(" * " + contact.getName() + "  -  " + editURL);

    var httpReq = new GHttpRequest("delete", gdata.mAuthToken, editURL, null);
    httpReq.mOnSuccess = ["Sync.processDeleteQueue();"];
    httpReq.mOnError = ["LOGGER.LOG_ERROR('Error while deleting contact', " +
                          "httpReq.responseText);",
                        "Sync.processDeleteQueue();"];
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  /**
   * Adds all cards to Google included in the mContactsToAdd array one at a 
   * time to avoid timing conflicts.  Calls Sync.processUpdateQueue() when
   * finished.
   */
  processAddQueue: function() {
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
    var primary = this.ab.getCardValue(cardToAdd, "PrimaryEmail");
    var second = this.ab.getCardValue(cardToAdd, "SecondEmail");
    var third = this.ab.getCardValue(cardToAdd, "ThirdEmail");
    var fourth = this.ab.getCardValue(cardToAdd, "FourthEmail");

    // if a similar card was already added, prompt to delete it
    if ((primary && this.mAddedEmails.indexOf(primary) != -1) ||
        (second && this.mAddedEmails.indexOf(second) != -1) ||
        (third && this.mAddedEmails.indexOf(third) != -1) ||
        (primary && this.mAddedEmails.indexOf(fourth) != -1)) {
      LOGGER.LOG(" * Duplicate detected");
      // default to deleting duplicates, but if the user wants to confirm
      // each duplicate ask for confirmation
      if (!Preferences.mSyncPrefs.confirmDuplicates.value || 
          confirm(StringBundle.getStr("duplicatePrompt")
          + " " + cardToAdd.displayName + " " + cardToAdd.primaryEmail + 
          StringBundle.getStr("duplicatePrompt2"))) {
        this.ab.deleteCards([cardToAdd]);
        LOGGER.LOG("   o Duplicate deleted");
      }
      else
        LOGGER.LOG("   o Duplicate ignored");
      Sync.processAddQueue();              
    }
    else {
      if (primary)
        this.mAddedEmails.push(primary);
      if (second)
        this.mAddedEmails.push(second);
      if (third)
        this.mAddedEmails.push(third);
      if (fourth)
        this.mAddedEmails.push(fourth);

      var xml = ContactConverter.cardToAtomXML(cardToAdd).xml;
      if (Preferences.mSyncPrefs.verboseLog.value) {
        var string = (new XMLSerializer()).serializeToString(xml);
        LOGGER.LOG("  - XML of contact being added:\n" + string + "\n");
      }
      var httpReq = new GHttpRequest("add", gdata.mAuthToken, null, string);
      var onCreated = [
        "var ab = Overlay.mAddressBook",
        "var card = ab.mCurrentCard;",
        "ab.setCardValue(card, 'GoogleID', httpReq.responseXML.getElementsByTagNameNS"
        + "(gdata.namespaces.ATOM.url, 'id')[0].childNodes[0].nodeValue);",
        "Overlay.mAddressBook.updateCard(card);",
        "Sync.processAddQueue();"];
      httpReq.mOnCreated = onCreated;
      httpReq.mOnError = ["LOGGER.LOG_ERROR('Error while adding contact', " +
                          "httpReq.responseText);",
                          "Sync.processAddQueue();"];
      httpReq.mOnOffline = this.mOfflineCommand;
      httpReq.send();
    }
  },
  /**
   * Updates all cards to Google included in the mContactsToUpdate array one at
   * a time to avoid timing conflicts.  Calls Sync.finish() when done
   */
  processUpdateQueue: function() {
    if (!this.mContactsToUpdate || this.mContactsToUpdate.length == 0) {this.finish(); return;}
    Overlay.setStatusBarText(StringBundle.getStr("updating") + " " +
                             this.mContactsToUpdate.length + " " +
                             StringBundle.getStr("remaining"));
    var obj = this.mContactsToUpdate.shift();
    var gContact = obj.gContact;
    var abCard = obj.abCard;

    var editURL = gContact.getValue("EditURL");
    var xml = ContactConverter.cardToAtomXML(abCard, gContact).xml;

    LOGGER.LOG("\n" + gContact.getName());
    if (Preferences.mSyncPrefs.verboseLog.value) {
        var string = (new XMLSerializer()).serializeToString(xml);
        LOGGER.LOG("  - XML of contact being updated:\n" + string + "\n");
    }
    var httpReq = new GHttpRequest("update", gdata.mAuthToken, editURL, string)
    httpReq.mOnSuccess = ["Sync.processUpdateQueue();"];
    httpReq.mOnError = ["LOGGER.LOG_ERROR('Error while updating contact', " +
                          "httpReq.responseText);",
                        "Sync.processUpdateQueue();"],
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  /**
   * Sync.syncGroups
   * Syncs all contact groups with mailing lists.
   */
  syncGroups: function(aAtom) {
    // reset the groups object
    this.mGroups = {};
    // if there wasn't an error, setup groups
    if (aAtom) {
      if (Preferences.mSyncPrefs.verboseLog.value) {
        var string = (new XMLSerializer()).serializeToString(aAtom);
        LOGGER.LOG("***Groups XML feed:\n" + string);
      }
      var ab = Overlay.mAddressBook;
      var ns = gdata.namespaces.ATOM;
      LOGGER.VERBOSE_LOG("***Getting all groups***");
      var arr = aAtom.getElementsByTagNameNS(ns.url, "entry");
      LOGGER.VERBOSE_LOG("***Getting all lists***");
      this.mLists = Overlay.mAddressBook.getAllLists(true);
      var lastSync = FileIO.getLastSync();
      for (var i = 0; i < arr.length; i++) {
        try {
          var group = new Group(arr[i]);
          // add the ID to mGroups by making a new property with the ID as the
          // name and the title as the value for easy lookup for contacts
          var id = group.getID();
          var title = group.getTitle();
          var modifiedDate = group.getLastModifiedDate();
          LOGGER.LOG("-Found group with ID: " + id + " name: " + title +
                             " last modified: " + modifiedDate);
          var list = this.mLists[id];
          this.mGroups[id] = group;
          if (modifiedDate < lastSync) { // it's an old group
            if (list) {
              list.matched = true;
              // if the name is different, update the group's title
              var listName = list.getName();
              LOGGER.LOG(" * Matched with mailing list " + listName);
              if (listName != title) {
                LOGGER.LOG(" * Going to rename the group to " + listName);
                group.setTitle(listName);
                this.mGroupsToUpdate.push(group);
              }
            }
            else {
              this.mGroupsToDelete.push(group);
              LOGGER.LOG(" * Didn't find a matching mail list.  It will be deleted");
            }
          }
          else { // it is new or updated
            if (list) { // the group has been updated
              LOGGER.LOG(" * Matched with mailing list " + listName);
              // if the name changed, update the mail list's name
              if (list.getName() != title) {
                LOGGER.LOG(" * The group's name changed, updating the list");
                list.setName(title);
                list.update();
                list.matched = true;
              }
            }
            else { // the group is new
              // make a new mailing list with the same name
              LOGGER.LOG(" * The group is new");
              var list = ab.addList(title, id);
              LOGGER.VERBOSE_LOG(" * List added to address book");
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
  deleteGroups: function() {
    if (this.mGroupsToDelete.length == 0) {
      LOGGER.LOG("***Adding new groups to Google***");
      this.addGroups();
      return;
    }
    var group = this.mGroupsToDelete.shift();
    LOGGER.LOG("-Deleting group: " + group.getTitle());
    var httpReq = new GHttpRequest("delete", gdata.mAuthToken, group.getEditURL());
    httpReq.mOnSuccess = ["Sync.deleteGroups();"];
    httpReq.mOnError = ["LOGGER.LOG_ERROR('Error while deleting group', " +
                          "httpReq.responseText);",
                        "Sync.deleteGroups();"];
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  addGroups: function() {
    if (this.mGroupsToAdd.length == 0) {
      LOGGER.LOG("***Updating groups from Google***");
      this.updateGroups();
      return;
    }
    var list = this.mGroupsToAdd[0];
    var group = new Group(null, list.getName());
    LOGGER.LOG("-Adding group: " + group.getTitle());
    if (Preferences.mSyncPrefs.verboseLog.value) {
      var body = (new XMLSerializer()).serializeToString(group.xml);
      LOGGER.VERBOSE_LOG(" * XML feed of new group:\n" + body);
    }
    var httpReq = new GHttpRequest("addGroup", gdata.mAuthToken, null, body);
    httpReq.mOnCreated = ["Sync.addGroups2(httpReq);"];
    httpReq.mOnError = ["LOGGER.LOG_ERROR('Error while adding group', " +
                                          "httpReq.responseText);",
                        "Sync.mGroupsToAddURI.shift()",
                        "Sync.addGroups();"];
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  addGroups2: function(aResponse) {
    var group = new Group(aResponse.responseXML
                                   .getElementsByTagNameNS(gdata.namespaces.ATOM.url,
                                                           "entry")[0]);
    LOGGER.VERBOSE_LOG(aResponse.responseText);
    var list = this.mGroupsToAdd.shift();
    var id = group.getID();
    list.setNickName(id);
    list.update();
    this.mLists[id] = list;
    this.addGroups();
  },
  updateGroups: function() {
    if (this.mGroupsToUpdate.length == 0) {
      // get the contacts from Google and sync the address book with the response
      LOGGER.LOG("***Beginning Synchronization***");
      var httpReq = new GHttpRequest("getAll", gdata.mAuthToken, null, null);
      httpReq.mOnSuccess = ["Sync.sync(httpReq.responseXML);"];
      httpReq.mOnError = ["LOGGER.LOG_ERROR('Error while updating group', " +
                          "httpReq.responseText);",
                          "Sync.finish(httpReq.responseText);"];
      httpReq.mOnOffline = this.mOfflineCommand;
      httpReq.send();
      return;
    }
    var group = this.mGroupsToUpdate.shift();
    LOGGER.LOG("-Updating group: " + group.getTitle());
    if (Preferences.mSyncPrefs.verboseLog.value) {
      var body = (new XMLSerializer()).serializeToString(group.xml);
      LOGGER.VERBOSE_LOG(" * XML feed of group: " + body);
    }
    var httpReq = new GHttpRequest("update", gdata.mAuthToken, group.getEditURL(),
                                   body);
    httpReq.mOnSuccess = ["Sync.updateGroups();"];
    httpReq.mOnError = ["LOGGER.LOG_ERROR(httpReq.responseText);",
                        "Sync.updateGroups();"];
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  /**
   * Sync.schedule
   * Schedules another sync after the given delay if one is not already scheduled,
   * there isn't a sync currently running, if the delay is greater than 0, and
   * finally if the auto sync pref is set to true.
   * @param aDelay The duration of time to wait before synchronizing again
   */
  schedule: function(aDelay) {
    if (aDelay && this.mSynced && !this.mSyncScheduled && aDelay > 0 &&
        Preferences.mSyncPrefs.autoSync.value) {
      this.mSyncScheduled = true;
      setTimeout("Sync.begin();", aDelay);  
    }
  }
};
