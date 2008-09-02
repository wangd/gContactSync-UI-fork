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
 * AbListener
 * AbListener is a listener for the Address Book that is currently only used to
 * update the last modified date of mailing lists and cards contained within
 * them.
 * TODO remove the prefs when a directory is deleted
 * @class
 */
var AbListener = {
  /**
   * AbListener.onItemAdded
   * Unused.
   * @param aParentDir The parent directory to which an item was added.
   * @param aItem      The item added to the directory.
   */
  onItemAdded: function AbListener_onItemAdded(aParentDir, aItem) { /* do nothing */ },
  /**
   * AbListener.onItemPropertyChanged
   * Unused.
   * @param aItem     The item whose property was changed.
   * @param aProperty The property changed.
   * @param aOldValue The former value of the property.
   * @param aNewValue The new value of the property.
   */
  onItemPropertyChanged: function AbListener_onItemPropertyChanged(aItem, aProperty , aOldValue , aNewValue ) {},
  /**
   * AbListener.onItemRemoved
   * Used just to update the lastModifiedDate of cards removed from a mail list.
   * If a mail list is removed nothing needs to be done since the Group will be
   * deleted in Gmail.
   * @param aParentDir The directory from which an item was removed.  Ignored
   *                   unless it is a mail list.
   * @param aItem      The item removed from a directory.  Ignored unless it is
   *                   an Address Book card removed from a mail list.
   */
  onItemRemoved: function AbListener_onItemRemoved(aParentDir, aItem) {
    aParentDir.QueryInterface(Ci.nsIAbDirectory);
    // only update if a card was removed from a mail list
    // if so, then update the card's lastModifiedDate in the mail list's parent
    if (aParentDir.isMailList && (aItem instanceof Ci.nsIAbCard)) {
      try {
        aItem.QueryInterface(Ci.nsIAbCard);
        var now = (new Date).getTime()/1000;
        var uri = this.getURI(aParentDir);
        // the URI of the list's parent
        uri = uri.substring(0, uri.lastIndexOf("/"));
        // the parent of aParentDir (aParentDir is a mailing list, dir is the
        // directory in which aParentDir is stored)
        var dir = new AddressBook(AbManager.getAbByURI(uri));
        // set the last modified date and update the card
        dir.setCardValue(aItem, "LastModifiedDate", now);
        dir.updateCard(aItem);
      }
      catch(e) {
        LOGGER.LOG_WARNING("Error updating card after being removed: " + 
                           aItem + " " + uri + " " + now, e);
      }
    }
  },
  /**
   * AbListener.getURI
   * Gets the Uniform Resource Identifier (URI) of the specified directory.
   * @param aDirectory The directory whose URI is returned.
   * @return The URI of aDirectory.
   */
  getURI: function AbListener_getURI(aDirectory) {
    var error;
    try {
      if (aDirectory && (aDirectory instanceof Ci.nsIAbDirectory)) {
        if (aDirectory.URI) // Thunderbird 3
          return aDirectory.URI;
        aDirectory.QueryInterface(Ci.nsIAbMDBDirectory); // Thunderbird 2
        if (aDirectory.getDirUri)
          return aDirectory.getDirUri();
     } 
    } catch(e) { error = e; }
    LOGGER.LOG_WARNING("AbListener could not get a URI for: " + aDirectory,
                       error);
  },
  /**
   * AbListener.add
   * Adds this listener to be alerted whenever a directory item is removed.
   * It will be called whenever an item (card or mail list) is removed from a
   * directory (address book or mail list).
   */
  add: function AbListener_add() {
    if (Cc["@mozilla.org/abmanager;1"]) { // Thunderbird 3
      var flags = Ci.nsIAbListener.directoryItemRemoved;
      Cc["@mozilla.org/abmanager;1"]
       .getService(Ci.nsIAbManager)
       .addAddressBookListener(AbListener, flags);
    }
    else { // Thunderbird 2
      var flags = Ci.nsIAddrBookSession.directoryItemRemoved;
      Cc["@mozilla.org/addressbook/services/session;1"]
       .getService(Ci.nsIAddrBookSession)
       .addAddressBookListener(AbListener, flags);
    }
  },
  /**
   * AbListener.remove
   * Removes this listener.
   */
  remove: function AbListener_remove() {
    if (Cc["@mozilla.org/abmanager;1"]) // Thunderbird 3
      Cc["@mozilla.org/abmanager;1"]
       .getService(Ci.nsIAbManager)
       .removeAddressBookListener(AbListener);
    else // Thunderbird 2
      Cc["@mozilla.org/addressbook/services/session;1"]
       .getService(Ci.nsIAddrBookSession)
       .removeAddressBookListener(AbListener);
  }
};
