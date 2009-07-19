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
 * GAddressBook
 * An extension of AddressBook that adds functionality specific to gContactSync.
 * @param aDirectory The actual directory.
 * @constructor
 * @class
 * @extends AddressBook
 */
function GAddressBook(aDirectory) {
  // call the AddressBook constructor using this object
  AddressBook.call(this, aDirectory);
}

// Copy the AB prototype (methods and member variables)
GAddressBook.prototype = AddressBook.prototype;

/**
 * AddressBook.setUsername
 * Sets the username for the account with which this address book is synced.
 * @param aUsername The username for the Google account.
 */
GAddressBook.prototype.setUsername = function GAddressBook_setUsername(aUsername) {
  this.setStringPref("gContactSyncUsername", aUsername);
}

/**
 * AddressBook.getUsername
 * Returns the username for the account with which this address book is synced.
 * @return The username for the Google account.
 */
GAddressBook.prototype.getUsername = function GAddressBook_getUsername() {
  return this.getStringPref("gContactSyncUsername");
}

/**
 * AddressBook.setPrimary
 * Sets whether or not this address book is the primary book to synchronize
 * with the account.
 * @param aPrimary True if this address book is the primary AB with which the
 *                 account is synchronized.
 */
GAddressBook.prototype.setPrimary = function GAddressBook_setPrimary(aPrimary) {
  this.setStringPref("gContactSyncPrimary", aPrimary);
}

/**
 * AddressBook.setPrimary
 * Returns true if this address book is the primary AB with which the account
 * is synchronized.
 * @return True if this is the primary AB for the account.
 */
GAddressBook.prototype.getPrimary = function GAddressBook_getPrimary() {
  return this.getStringPref("gContactSyncPrimary");
}

/**
 * AddressBook.getGroupID
 * Gets and returns the ID of the group in Google with which this Address
 * Book is synchronized, if any.
 * @return The ID of the group with which this directory is synchronized.
 */
 GAddressBook.prototype.getGroupID = function GAddressBook_getGroupID() {
   return this.getStringPref("GroupID");
 }
 
 /**
 * AddressBook.getGroupID
 * Setsthe ID of the group in Google with which this Address Book is
 * synchronized.
 * @return The ID of the group with which this directory is synchronized.
 */
 GAddressBook.prototype.setGroupID = function GAddressBook_setGroupID(aGroupID) {
   this.setStringPref("GroupID", aGroupID);
 }
 
 /**
  * AddressBook.getLastSyncDate
  * Returns the last time this address book was synchronized in milliseconds
  * since the epoch.
  * @return The last time this address book was synchronized.
  */
 GAddressBook.prototype.getLastSyncDate = function GAddressBook_getLastSyncDate() {
   return this.getStringPref("lastSync");
 }
 
 /**
  * AddressBook.setLastSyncDate
  * Sets the last time this address book was synchronized, in milliseconds
  * since the epoch.
  * @param aLastSync The last sync time.
  */
 GAddressBook.prototype.setLastSyncDate = function GAddressBook_setLastSyncDate(aLastSync) {
   this.setStringPref("lastSync", aLastSync);
 }
 
 /**
  * AddressBook.reset
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
GAddressBook.prototype.reset = function GAddressBook_reset(checkListener) {
  LOGGER.LOG("Resetting the " + this.getName() + " directory.");
  var original = false;
  if (checkListener) {
    // disable the address book listener
    var original = Preferences.getPref(Preferences.mSyncBranch,
                                       Preferences.mSyncPrefs.listenerDeleteFromGoogle.label,
                                       Preferences.mSyncPrefs.listenerDeleteFromGoogle.type);
    if (original) {
      LOGGER.LOG("Disabled the listener");
      changeDeleteListener(false);
    }
  }
  try {
    var lists = this.getAllLists(true);
  } catch (e) {}
  LOGGER.VERBOSE_LOG(" * Deleting all lists");
  for (var i in lists) {
    LOGGER.VERBOSE_LOG("  - Deleting list " + lists[i].getName());
    lists[i].delete();
  }
  LOGGER.VERBOSE_LOG(" * Finished deleting lists");
  LOGGER.VERBOSE_LOG(" * Deleting all contacts");
  this.deleteCards(this.getAllCards());
  LOGGER.VERBOSE_LOG(" * Setting GroupID to ''");
  this.setGroupID("");
  LOGGER.VERBOSE_LOG(" * Setting primary to true");
  this.setPrimary(true);
  LOGGER.VERBOSE_LOG(" * Setting Last Sync Date to 0");
  this.setLastSyncDate(0);
  LOGGER.LOG("Finished resetting the directory.");
  // re-enable the address book listener, if necessary
  if (original) {
    LOGGER.LOG("Re-enabled the listener");
    changeDeleteListener(true);
  }
}

GAddressBook.prototype.newListObj = function GAddressBook_newListObj(aList, aParentDirectory, aNew) {
  return new GMailList(aList, aParentDirectory, aNew);
}
/**
 * GAddressBook.getAllLists
 * Returns an an object containing GMailList objects whose attribute name is
 * the name of the mail list.
 * @param skipGetCards True to skip getting the cards of each list.
 * @return An object containing GMailList objects.
 */
GAddressBook.prototype.getAllLists = function GAddressBook_getAllLists(skipGetCards) {
  // same in Thunderbird 2 and 3
  LOGGER.VERBOSE_LOG("Searching for mailing lists:");
  var iter = this.mDirectory.childNodes;
  var obj = {};
  var list, id, data;
  while (iter.hasMoreElements()) {
    data = iter.getNext();
    if (data instanceof Ci.nsIAbDirectory && data.isMailList) {
      list    = this.newListObj(data, this, skipGetCards);
      id      = list.getGroupID();
      obj[id] = list;
      LOGGER.VERBOSE_LOG(" * " + list.getName() + " - " + id);
    }
  }
  return obj;
}