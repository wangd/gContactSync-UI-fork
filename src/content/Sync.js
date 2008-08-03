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

  // an array of commands to execute when offline during an HTTP Request
  mOfflineCommand: ["Overlay.setStatusBarText(StringBundle.getStr('offlineStatusText'));", "Sync.finish();"],

  // booleans used for timing to make sure things don't happen out order
  mSynced: true,
  mSyncScheduled: false,
  mGroups: {}, // used to store groups
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
      throw StringBundle.getStr("couldntMakeAb") + StringBundle.getStr("pleaseReport");

    Overlay.setStatusBarText(StringBundle.getStr("syncing"));
    if (FileIO.mLogFile && FileIO.mLogFile.exists())
      FileIO.mLogFile.remove(false); // delete the old log file
    LOGGER.LOG(StringBundle.getStr("startSync") + " " + Date() + "\n");

    var httpReq = new GHttpRequest("getGroups", gdata.mAuthToken, null, null);
    httpReq.mOnSuccess = ["Sync.getGroups(httpReq.responseXML);"],
    httpReq.mOnError = ["LOGGER.LOG_ERROR(httpReq.responseText);",
                    "Sync.getGroups();"]; // if there is an error, try to sync w/o groups                   
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
      LOGGER.LOG_ERROR(StringBundle.getStr("errDuringSync") + "\n" + aError);
    if (LOGGER.mErrorCount > 0)
      Overlay.setStatusBarText(StringBundle.getStr("errDuringSync"));
    else {
      FileIO.writeLastSync();
      Overlay.writeTimeToStatusBar();
      LOGGER.LOG("\n" + StringBundle.getStr("done") + " " + Date());
    }
    Overlay.mAddressBook.mCurrentCard = {};
    this.mSynced = true;
    if (aStartOver)
      this.begin();
    else
      this.schedule(Preferences.mSyncPrefs.refreshInterval.value * 60000);
  },
  confirmFirst: function() {
    Overlay.setStatusBarText(StringBundle.getStr("initialSetup"));
    if(confirm(StringBundle.getStr("confirmFirstSync"))) {
      this.mFirstSync = true;
      this.begin();
    }
  },
  /**
   * Sync.sync
   * Synchronizes the Address Book with the contacts obtained from Google.
   * @param aAtom The contacts from Google in an Atom.
   * XXX rename
   */
  sync: function(aAtom) {
    if (Preferences.mSyncPrefs.verboseLog.value) {
      var string = (new XMLSerializer()).serializeToString(aAtom);
      LOGGER.LOG(string + "\n"); // VERBOSE_LOG checks the pref, but serializing isn't
                          // always necessary.
    }
    var googleContacts = aAtom.getElementsByTagName('entry');
    var abCards = Overlay.mAddressBook.getAllCards();
    var lastSync = FileIO.getLastSync();
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
      this.finish(StringBundle.getStr("maxContacts"), true);
      return;
    }

    this.mContactsToAdd = [];
    this.mContactsToDelete = [];
    var gContact;

     // get the strings outside of the loop so they are only found once
    var found = StringBundle.getStr("found");
    var bothChanged = StringBundle.getStr("bothChanged");
    var bothGoogle = StringBundle.getStr("bothGoogle");
    var bothTB = StringBundle.getStr("bothThunderbird");

    for (var i = 0, length = googleContacts.length; i < length; i++) {
      gContact = new GContact(googleContacts[i]);
      var id = gContact.getValue("id")
      LOGGER.LOG(gContact.getName());
      // a new array with only the unmatched cards                 
      var abCards2 = [];
      for (var j = 0, length2 = abCards.length; j < length2; j++) {
        var abCard = abCards[j];

        // if the cards are the same...
        if (ab.getCardValue(abCard, "GoogleID") == id) {
          LOGGER.LOG(found);
          var gCardDate = gContact.getLastModifiedDate();
          var tbCardDate;
          tbCardDate = Overlay.mAddressBook.getCardValue(abCard, "LastModifiedDate");
          if (!tbCardDate)
            tbCardDate = 0;
          // TODO add pref to prompt user for each one.
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
            LOGGER.LOG(StringBundle.getStr("gNewer"));
            ContactConverter.makeCard(gContact, abCard);
          }
          // if the tbcard is newer
          else if (tbCardDate > lastSync/1000) {
            LOGGER.LOG(StringBundle.getStr("tbNewer"));
            var toUpdate = {};
            toUpdate.gContact = gContact;
            toUpdate.abCard = abCard;
            this.mContactsToUpdate.push(toUpdate);
          }
          else
            LOGGER.LOG(StringBundle.getStr("noChange"));
          gContact.matched = true;
        }
        // duplicate...
        else if (ContactConverter.compareContacts(abCard, gContact)) {
          LOGGER.LOG(StringBundle.getStr("duplicate"));
          // default to deleting duplicates, but if the user wants to confirm
          // each duplicate ask for confirmation
          if (!Preferences.mSyncPrefs.confirmDuplicates.value || 
              confirm(StringBundle.getStr("duplicatePrompt")
              + " " + abCard.displayName + " " + abCard.primaryEmail + 
              StringBundle.getStr("duplicatePrompt2"))) {
            cardsToDelete.push(abCard);
            LOGGER.LOG(StringBundle.getStr("duplicateDeleted"));
          }
          else
            LOGGER.LOG(StringBundle.getStr("duplicateIgnored"));
        }
        else
          abCards2.push(abCard);
      }// end of inner for loop

      //copy over the new array
      abCards = abCards2;
      abCards2 = [];

      if (!gContact.matched) {
        LOGGER.LOG(StringBundle.getStr("noMatch"));
        if (gContact.getLastModifiedDate() > lastSync) {
          LOGGER.LOG(StringBundle.getStr("addingToTb"));
          ContactConverter.makeCard(gContact);
        }
        else {
          LOGGER.LOG(StringBundle.getStr("willDelete"));
          this.mContactsToDelete.push(gContact);
        }
      }
    }// end of outer for loop

    for (var i = 0; i < abCards.length; i++) {
      var card = abCards[i];
      if (card != null && card instanceof nsIAbCard) {
        LOGGER.LOG(card.displayName + StringBundle.getStr("noMatch"));
        // if it is a new card, add it to Google
        var id = ab.getCardValue(card, "GoogleID");
        var date = ab.getCardValue(card, "LastModifiedDate")
        var isNew = date > lastSync || date == 0;
        // current will add the card if it doesn't have a GoogleID or if it's
        // if was just added/modified
        if (!id || isNew) {
          this.mContactsToAdd.push(card);
          LOGGER.LOG(StringBundle.getStr("addingToG"));
        }
        // otherwise it should be removed
        else {
          cardsToDelete.push(card);
          LOGGER.LOG(StringBundle.getStr("willDelete"));
        }
      }
    } // end of for loop
    ab.deleteCards(cardsToDelete);
    LOGGER.LOG("\n" + StringBundle.getStr("deleting"));
    this.mAddedEmails = [];
    
    // start with deleting ab cards
    this.processDeleteQueue();
  },
  /**
   * Deletes all cards from Google included in the this.mContactsToDelete global array one
   * at a time to avoid timing conflicts. Calls syncHelperAddCards when done
   * XXX switch to batch processing for deletion
   */
  processDeleteQueue: function() {
    if (!this.mContactsToDelete || this.mContactsToDelete.length == 0) {
      LOGGER.LOG("\n" + StringBundle.getStr("adding"));
      this.processAddQueue();
      return;
    }
    Overlay.setStatusBarText(StringBundle.getStr("deleting") + " " +
                             this.mContactsToDelete.length + " " +
                             StringBundle.getStr("remaining"));
    var contact = this.mContactsToDelete.shift();
    var string = (new XMLSerializer()).serializeToString(contact.xml);
    LOGGER.VERBOSE_LOG("\n" + string + "\n");
    LOGGER.LOG(contact.getName());
    var editURL = contact.getValue("EditURL");
  
    var httpReq = new GHttpRequest("delete", gdata.mAuthToken, editURL, null);
    httpReq.mOnSuccess = ["Sync.processDeleteQueue();"];
    httpReq.mOnError = ["LOGGER.LOG_ERROR(httpReq.responseText);",
                        "Sync.processDeleteQueue();"],
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  /**
   * Adds all cards to Google included in the this.mContactsToAdd global array one at a 
   * time to avoid timing conflicts.  Calls syncHelperUpdateCards() when done
   */
  processAddQueue: function() {
    if (!this.mContactsToAdd || this.mContactsToAdd.length == 0) {
      LOGGER.LOG("\n" + StringBundle.getStr("updating"));
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
      LOGGER.LOG(StringBundle.getStr("duplicate"));
      // default to deleting duplicates, but if the user wants to confirm
      // each duplicate ask for confirmation
      if (!Preferences.mSyncPrefs.confirmDuplicates.value || 
          confirm(StringBundle.getStr("duplicatePrompt")
          + " " + cardToAdd.displayName + " " + cardToAdd.primaryEmail + 
          StringBundle.getStr("duplicatePrompt2"))) {
        this.ab.deleteCards([cardToAdd]);
        LOGGER.LOG(StringBundle.getStr("duplicateDeleted"));
      }
      else
        LOGGER.LOG(StringBundle.getStr("duplicateIgnored"));
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
      var string = (new XMLSerializer()).serializeToString(xml);
      LOGGER.VERBOSE_LOG("\n" + string + "\n");
      var httpReq = new GHttpRequest("add", gdata.mAuthToken, null, string);
      var onCreated = [
        "var ab = Overlay.mAddressBook",
        "var card = ab.mCurrentCard;",
        "ab.setCardValue(card, 'GoogleID', httpReq.responseXML.getElementsByTagNameNS"
        + "(gdata.namespaces.ATOM.url, 'id')[0].childNodes[0].nodeValue);",
        "Overlay.mAddressBook.updateCard(card);",
        "Sync.processAddQueue();"];
      httpReq.mOnCreated = onCreated;
      httpReq.mOnError = ["LOGGER.LOG_ERROR(httpReq.responseText);",
                          "Sync.processAddQueue();"];
      httpReq.mOnOffline = this.mOfflineCommand;
      httpReq.send();
    }
  },
  /**
   * Updates all cards to Google included in the this.mContactsToUpdate global array one at a 
   * time to avoid timing conflicts.  Calls finishSync() when done
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
    var string = (new XMLSerializer()).serializeToString(xml);
    LOGGER.VERBOSE_LOG("\n" + string + "\n");
    var httpReq = new GHttpRequest("update", gdata.mAuthToken, editURL, string)
    httpReq.mOnSuccess = ["Sync.processUpdateQueue();"],
    httpReq.mOnError = ["LOGGER.LOG_ERROR(httpReq.responseText);",
                        "Sync.processUpdateQueue();"],
    httpReq.mOnOffline = this.mOfflineCommand
    httpReq.send();
  },
  /**
   * Sync.getGroups
   * Gets all contact groups.
   */
  getGroups: function(aAtom) {
    // reset the groups object
    this.mGroups = {};
    // if there wasn't an error, setup groups
    if (aAtom) {
      if (Preferences.mSyncPrefs.verboseLog.value) {
        var string = (new XMLSerializer()).serializeToString(aAtom);
        LOGGER.LOG(string + "\n"); // VERBOSE_LOG checks the pref, but serializing isn't
                            // always necessary.
      }
      var ns = gdata.namespaces.ATOM
      var arr = aAtom.getElementsByTagNameNS(ns.url, "entry");
      for (var i = 0; i < arr.length; i++) {
        try {
          // add the ID to mGroups by making a new property with the ID as the
          // name and the title as the value for easy lookup for contacts
          var id = arr[i].getElementsByTagNameNS(ns.url, "id")[0].childNodes[0].nodeValue;
          var title = arr[i].getElementsByTagNameNS(ns.url, "title")[0].childNodes[0].nodeValue;
          this.mGroups[id] = title;
          this.mGroups[title] = id;
        }
        catch(e) { LOGGER.LOG_ERROR(e); }
      }
    
    }
    // get the contacts from Google and sync the address book with the response
    var httpReq = new GHttpRequest("getAll", gdata.mAuthToken, null, null);
    httpReq.mOnSuccess = ["Sync.sync(httpReq.responseXML);"];
    httpReq.mOnError = ["LOGGER.LOG_ERROR(httpReq.responseText);",
                        "Sync.finish(httpReq.responseText);"];
    httpReq.mOnOffline = this.mOfflineCommand
    httpReq.send();

  },
  /**
   * Sync.schedule
   * Schedules another sync after the given delay if one is not already scheduled,
   * there isn't a sync currently running, and if the delay is greater than 0.
   *
   * @param aDelay The duration of time to wait before synchronizing again
   */
  schedule: function(aDelay) {
    if (aDelay && this.mSynced && !this.mSyncScheduled && aDelay > 0) {
      this.mSyncScheduled = true;
      setTimeout("Sync.begin();", aDelay);  
    }
  }
};
