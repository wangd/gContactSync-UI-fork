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
 * @class
 */
var AbListener = {
  /**
   * AbListener.onItemAdded
   * Unused.
   * @param aParentDir The parent directory to which an item was added.
   * @param aItem      The item added to the directory.
   */
  onItemAdded: function(aParentDir, aItem) { /* do nothing */ },
  /**
   * AbListener.onItemPropertyChanged
   * Unused.
   * @param aItem     The item whose property was changed.
   * @param aProperty The property changed.
   * @param aOldValue The former value of the property.
   * @param aNewValue The new value of the property.
   */
  onItemPropertyChanged: function(aItem, aProperty , aOldValue , aNewValue ) { },
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
  onItemRemoved: function(aParentDir, aItem) {
    aParentDir.QueryInterface(Ci.nsIAbDirectory);
    // only update if a card was removed from a mail list
    // if so, then update the card's lastModifiedDate in the mail list's parent
    if (aParentDir.isMailList && (aItem instanceof Ci.nsIAbCard) &&
        Overlay.mAddressBook) {
      try {
        aItem.QueryInterface(Ci.nsIAbCard);
        var now = (new Date).getTime()/1000;
        var ab = Overlay.mAddressBook;
        var uri = this.getURI(aParentDir);
        uri = uri.substring(0, uri.lastIndexOf("/")); // the URI of the list's parent
        var dir = this.getAbByURI(uri); // the list's parent directory
        // set the last modified date and update the card
        ab.setCardValue(aItem, "LastModifiedDate", now);
        this.updateCard(dir, aItem, uri);
      }
      catch(e) {
        LOGGER.LOG_WARNING("Error updating card after being removed: " + 
                            aItem + " " + e + " " + uri + " " + now);
      }
    }
  },
  /**
   * AbListener.updateCard
   * Updates the card passed in to the given directory (aDirectory or the
   * directory specified by aURI, depending on the version of Thunderbird).
   * @param aDirectory The directory to which the card should be updated.
   *                   Ignored if this isn't Thunderbird 3.
   * @param aCard      The card to update.
   * @param aURI       The URI of the directory to which this card should be
   *                   updated.  Ignored if this isn't Thunderbird 2.
   */
  updateCard: function(aDirectory, aCard, aURI) {
    if (aDirectory && aDirectory.modifyCard) // Thunderbird 3
      aDirectory.modifyCard(aCard);
    else if (aCard && aURI && aCard.editCardToDatabase) // Thunderbird 2
      aCard.editCardToDatabase(aURI);
    else // error...
      LOGGER.LOG_WARNING("unable to update card " + aCard + " to directory "
                         + aDirectory + " with URI " + aURI);
  },
  /**
   * AbListener.getURI
   * Gets the Uniform Resource Identifier (URI) of the specified directory.
   * @param aDirectory The directory whose URI is returned.
   * @return The URI of aDirectory.
   */
  getURI: function(aDirectory) {
    if (!aDirectory || !(aDirectory instanceof Ci.nsIAbDirectory)) {
      LOGGER.LOG_WARNING("AbListener could not get a URI for: " + aDirectory);
      return;
    }
    try {
      if (aDirectory.URI) // Thunderbird 3
        return aDirectory.URI;
      aDirectory.QueryInterface(Ci.nsIAbMDBDirectory); // Thunderbird 2
      if (aDirectory.getDirUri)
        return aDirectory.getDirUri();
    } catch(e) {}
    LOGGER.LOG_WARNING("AbListener could not get a URI for: " + aDirectory);
  },
  /**
   * AbListener.add
   * Adds this listener to be alerted whenever a directory item is removed.
   * It will be called whenever an item (card or mail list) is removed from a
   * directory (address book or mail list).
   */
  add: function() {
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
  remove: function() {
    if (Cc["@mozilla.org/abmanager;1"]) // Thunderbird 3
      Cc["@mozilla.org/abmanager;1"]
       .getService(Ci.nsIAbManager)
       .removeAddressBookListener(AbListener);
    else // Thunderbird 2
      Cc["@mozilla.org/addressbook/services/session;1"]
       .getService(Ci.nsIAddrBookSession)
       .removeAddressBookListener(AbListener);
  },
  /**
   * AbListener.getAbByURI
   * Returns the directory with the given Uniform Resource Identifier (URI).
   * @return The directory with the given URI.
   */
  getAbByURI: function(aURI) {
    if (!aURI)
      throw "Error - invalid 'aURI' argument sent to getAbByURI" +
            StringBundle.getStr("pleaseReport");
    var dir;
    try {
      if (Cc["@mozilla.org/abmanager;1"]) // Thunderbird 3, use the AB Manager
        dir = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager)
               .getDirectory(aURI).QueryInterface(Ci.nsIAbDirectory);
      else // Thunderbird 2, get the AB through the RDF service
        dir = Cc["@mozilla.org/rdf/rdf-service;1"].getService(Ci.nsIRDFService)
               .GetResource(aURI).QueryInterface(Ci.nsIAbDirectory);
    }
    catch(e) { LOGGER.VERBOSE_LOG("Error in getAbByURI: " + e); }
    return dir;
  }
};
