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
* An extension of AddressBook that adds functionality specific to gContactSync.
* @param aDirectory {nsIAbDirectory} The actual directory.
* @param aNoPrefs   {boolean}        Set this to true to skip fetching the
*                                    preferences.
* @constructor
* @class
* @extends com.gContactSync.AddressBook
*/
com.gContactSync.GAddressBook = function gCS_GAddressBook(aDirectory, aNoPrefs) {
  // call the AddressBook constructor using this object
  com.gContactSync.AddressBook.call(this, aDirectory);

  // Preferences for this address book
  // If these aren't set the global preference with the same name, if any, is used
  // NOTE: All these preferences are converted to strings
  this.mPrefs = {
    Plugin:         "", // The name of the plugin to use
    Username:       "", // The username of the acct synced with
    Disabled:       "", // Temporarily disable synchronization with this AB
    // NOTE: These three prefs aren't combined into a single pref for backwards
    // compatibility with 0.2.x
    myContacts:     "", // true if only one group should be synced
    myContactsName: "", // The name of the group to sync
    syncGroups:     "", // Synchronize groups
    // NOTE: These two prefs aren't combined into a single pref for backwards
    // compatibility with 0.2.x
    readOnly:       "", // Fetch updates from Google but don't send any changes
    writeOnly:      "", // Send changes to the server, but don't fetch any changes
    getPhotos:      "", // Fetch contact photos
    parseNames:     "", // Try to parse names into first and last
    updateGoogleInConflicts: "" // If a contact was updated in Google and TB then
                                // this pref determines which contact to update
  };
  if (!aNoPrefs)
    this.getPrefs();
};

// Copy the AB prototype (methods and member variables)
com.gContactSync.GAddressBook.prototype = com.gContactSync.AddressBook.prototype;

// A prefix for all preferences used to prevent conflicts with other extensions
com.gContactSync.GAddressBook.prototype.prefPrefix = "gContactSync";

/**
 * Fetches all of this directory's preferences.  If the directory does not have
 * any given preferences this function will use the global preference's value,
 * if any.
 */
com.gContactSync.GAddressBook.prototype.getPrefs = function GAddressBook_getPrefs() {
  com.gContactSync.LOGGER.VERBOSE_LOG("\nGetting Prefs for AB '" + this.getName() + "':");
  var i, val, pref;
  for (i in this.mPrefs) {
    val = this.getStringPref(this.prefPrefix + i);
    // getStringPref returns 0 iff the pref doesn't exist
    // if the pref doesn't exist, then use the global gContactSync pref
    // this behavior is mostly for backwards compatibility
    if (val === 0) {
      pref = com.gContactSync.Preferences.mSyncPrefs[i];
      val = pref ? String(pref.value) : "";
    }
    com.gContactSync.LOGGER.VERBOSE_LOG(" * " + i + " = " + val);
    this.mPrefs[i] = val;
  }
  com.gContactSync.LOGGER.VERBOSE_LOG("\n");
};

/**
 * Save the value of a given preference for this address book.
 *
 * @param aName  {string} The name of the preference to set.
 * @param aValue {string} The value to set the preference to.
 */
com.gContactSync.GAddressBook.prototype.savePref = function GAddressBook_savePref(aName, aValue) {
  com.gContactSync.LOGGER.VERBOSE_LOG(" * Setting pref '" + aName + "' to value '" + aValue + "'");
  this.setStringPref(this.prefPrefix + aName, aValue);
  this.mPrefs[aName] = aValue;
};

/**
 * Sets the username for the account with which this address book is synced.
 * @param aUsername {string} The username for the Google account.
 */
com.gContactSync.GAddressBook.prototype.setUsername = function GAddressBook_setUsername(aUsername) {
  this.setStringPref("gContactSyncUsername", aUsername);
  this.mPrefs.username = aUsername;
};

/**
 * GAddressBook.getGroupID
 * Gets and returns the ID of the group in Google with which this Address
 * Book is synchronized, if any.
 * @returns {string} The ID of the group with which this directory is
 *                  synchronized.
 */
 com.gContactSync.GAddressBook.prototype.getGroupID = function GAddressBook_getGroupID() {
   return this.getStringPref("GroupID");
 };
 
/**
 * Sets the ID of the group in Google with which this Address Book is
 * synchronized.
 * @param aGroupID {string} The ID of the group.
 * @returns {string} The ID of the group with which this directory is
 *                  synchronized.
 */
 com.gContactSync.GAddressBook.prototype.setGroupID = function GAddressBook_setGroupID(aGroupID) {
   this.setStringPref("GroupID", aGroupID);
 };
 
 /**
  * Returns the last time this address book was synchronized in milliseconds
  * since the epoch.
  * @returns {string} The last time this address book was synchronized.
  */
 com.gContactSync.GAddressBook.prototype.getLastSyncDate = function GAddressBook_getLastSyncDate() {
   return this.getStringPref("lastSync");
 };
 
 /**
  * Sets the last time this address book was synchronized, in milliseconds
  * since the epoch.
  * @param aLastSync {integer} The last sync time.
  */
 com.gContactSync.GAddressBook.prototype.setLastSyncDate = function GAddressBook_setLastSyncDate(aLastSync) {
   this.setStringPref("lastSync", aLastSync);
 };
 
 /**
  * 'Resets' this address book making it appear to be brand new and never
  * synchronized.
  * The username is NOT erased.
  * 
  * This includes:
  *   - Deleting all mailing lists
  *   - Deleting all contacts
  *   - Setting the GroupID to ""
  *   - Setting primary to true
  *   - Setting the last sync date to 0
  */
com.gContactSync.GAddressBook.prototype.reset = function GAddressBook_reset() {
  com.gContactSync.LOGGER.LOG("Resetting the " + this.getName() + " directory.");
  var lists, i;
  try {
    lists = this.getAllLists(true);
  } catch (e) {}
  com.gContactSync.LOGGER.VERBOSE_LOG(" * Deleting all lists");
  for (i in lists) {
    if (lists[i] instanceof com.gContactSync.GMailList) {
      com.gContactSync.LOGGER.VERBOSE_LOG("  - Deleting list " + lists[i].getName());
      lists[i].remove();
    }
  }
  com.gContactSync.LOGGER.VERBOSE_LOG(" * Finished deleting lists");
  com.gContactSync.LOGGER.VERBOSE_LOG(" * Deleting all contacts");
  this.deleteContacts(this.getAllContacts());
  com.gContactSync.LOGGER.VERBOSE_LOG(" * Setting Last Sync Date to 0");
  this.setLastSyncDate(0);
  com.gContactSync.LOGGER.LOG("Finished resetting the directory.");
};
/**
 * Returns a new GMailList object given the same parameters as the GMailList
 * constructor.
 *
 * See the GMailList constructor for the most recent comments.
 *
 * @param aList {Ci.nsIAbDirectory}       The actual nsIAbDirectory
 *                                        representation of a mailing list.
 * @param aParentDirectory {GAddressBook} The parent directory (as an
 *                                        AddressBook object) containing this
 *                                        mailing list.
 * @param aNew             {boolean}      Set as true for new mailing lists where
 *                                        no attempt should be made to fetch the
 *                                        contacts contained in the list.
 * @returns {GMailList} A new GMailList.
 */
com.gContactSync.GAddressBook.prototype.newListObj = function GAddressBook_newListObj(aList, aParentDirectory, aNew) {
  return new com.gContactSync.GMailList(aList, aParentDirectory, aNew);
};

/**
 * Returns an an object containing GMailList objects whose attribute name is
 * the name of the mail list.
 * @param skipGetCards {boolean} True to skip getting the cards of each list.
 * @returns {object} An object containing GMailList objects.
 */
com.gContactSync.GAddressBook.prototype.getAllLists = function GAddressBook_getAllLists(skipGetCards) {
  // same in Thunderbird 2 and 3
  com.gContactSync.LOGGER.VERBOSE_LOG("Searching for mailing lists:");
  var iter = this.mDirectory.childNodes,
      obj  = {},
      list,
      id,
      data;
  while (iter.hasMoreElements()) {
    data = iter.getNext();
    if (data instanceof Components.interfaces.nsIAbDirectory && data.isMailList) {
      list    = this.newListObj(data, this, skipGetCards);
      id      = list.getGroupID();
      obj[id] = list;
      com.gContactSync.LOGGER.VERBOSE_LOG(" * " + list.getName() + " - " + id);
    }
  }
  return obj;
};
