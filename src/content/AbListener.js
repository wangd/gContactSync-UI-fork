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
  onItemAdded: function(aParentDir, aItem) { /* do nothing */ },
  onItemPropertyChanged: function(aItem, aProperty , aOldValue , aNewValue ) {
    // do nothing
  },
  onItemRemoved: function(aParentDir, aItem) {
    aParentDir.QueryInterface(Ci.nsIAbDirectory);
    // only update if a card was removed from a mail list
    // if so, then update the card's lastModifiedDate in the mail list's parent
    if (aParentDir.isMailList && (aItem instanceof Ci.nsIAbCard)) {
      var uri = this.getURI(aParentDir);
      uri = uri.substring(0, uri.lastIndexOf("/")); // the URI of the list's parent
      var dir = this.getAbByURI(uri); // the list's parent directory
      aItem.QueryInterface(Ci.nsIAbMDBCard);
      aItem.lastModifiedDate = (new Date).getTime();
      this.updateCard(dir, aItem, uri);
    }
    
  },
  updateCard: function(aDirectory, aCard, aURI) {
    if (aDirectory && aDirectory.modifyCard)
      aDirectory.modifyCard(aCard);
    else if (aCard && aURI && aCard.editCardToDatabase)
      aCard.editCardToDatabase(aURI);
    else
      LOGGER.LOG_WARNING("unable to update card " + aCard + " to directory "
                         + aDirectory + " with URI " + aURI);
  },
  updateList: function(aList) {
    if (Cc["@mozilla.org/abmanager;1"])
      aList.editMailListToDatabase(null);
    else
      aList.editMailListToDatabase(this.getURI(aList), null);
  },
  getURI: function(aDirectory) {
    if (aDirectory.URI)
      return aDirectory.URI;
    aDirectory.QueryInterface(Ci.nsIAbMDBDirectory);
    if (aDirectory.getDirUri)
      return aDirectory.getDirUri();
    LOGGER.LOG_WARNING('AbListener could not get a URI for: ' + aDirectory);
  },
  add: function() {
    if (Cc["@mozilla.org/abmanager;1"]) {
      var flags = Ci.nsIAbListener.directoryItemRemoved;
      Cc["@mozilla.org/abmanager;1"]
       .getService(Ci.nsIAbManager)
       .addAddressBookListener(AbListener, flags);
    }
    else {
      var flags = Ci.nsIAddrBookSession.directoryItemRemoved;
      Cc["@mozilla.org/addressbook/services/session;1"]
       .getService(Ci.nsIAddrBookSession)
       .addAddressBookListener(AbListener, flags);
    }
  },
  remove: function() {
    if (Cc["@mozilla.org/abmanager;1"]) {
      Cc["@mozilla.org/abmanager;1"]
       .getService(Ci.nsIAbManager)
       .removeAddressBookListener(AbListener);
    }
    else {
      Cc["@mozilla.org/addressbook/services/session;1"]
       .getService(Ci.nsIAddrBookSession)
       .removeAddressBookListener(AbListener);
    }
  },
  getAbByURI: function(aURI) {
    if (!aURI)
      throw StringBundle.getStr("error") + "aURI" + StringBundle.getStr("suppliedTo") +
            "getAbByURI" + StringBundle.getStr("errorEnd");
    try {
      var dir;
      if (Cc["@mozilla.org/abmanager;1"])
        dir = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager)
               .getDirectory(aURI).QueryInterface(Ci.nsIAbDirectory);
      else
       dir = Cc["@mozilla.org/rdf/rdf-service;1"]
              .getService(Ci.nsIRDFService)
              .GetResource(aURI)
              .QueryInterface(Ci.nsIAbDirectory);
      return dir;
    }
    catch(e) { LOGGER.VERBOSE_LOG("Error in getAbByURI: " + e); }
  }
}
