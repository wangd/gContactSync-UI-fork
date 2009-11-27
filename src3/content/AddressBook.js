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
 * A class for a Thunderbird Address Book with methods to add, modify, obtain, 
 * and delete cards.
 * @param aDirectory {nsIAbDirectory} The actual directory.
 * @constructor
 * @class
 */
com.gContactSync.AddressBook = function gCS_AddressBook(aDirectory) {
  this.mDirectory = aDirectory;
  // make sure the directory is valid
  if (!this.isDirectoryValid(this.mDirectory))
    throw "Invalid directory supplied to the AddressBook constructor" +
          "\nCalled by: " + this.caller +
          com.gContactSync.StringBundle.getStr("pleaseReport");
  // get the directory's URI
  if (this.mDirectory.URI)
    this.mURI = this.mDirectory.URI;
  else {
    this.mDirectory.QueryInterface(Components.interfaces.nsIAbMDBDirectory);
    this.mURI = this.mDirectory.getDirUri();
  }
}

com.gContactSync.AddressBook.prototype = {
  /** The Uniform Resource Identifier (URI) of the directory */
  mURI:         {},
  /** The cards within this address book */
  mCards:       [],
  /** set to true when mCards should be updated */
  mCardsUpdate: false,
  /**
   * Adds the card to this address book and returns the added card.
   * @param aCard {nsIAbCard} The card to add.
   * @returns {nsIAbMDBCard} An MDB card
   */
  addCard: function AddressBook_addCard(aCard) {
    com.gContactSync.AbManager.checkCard(aCard); // check the card's validity first
    try {
      this.mCards.push(aCard);
      return this.mDirectory.addCard(aCard); // then add it and return the MDBCard
    }
    catch(e) {
      com.gContactSync.LOGGER.LOG_ERROR("Unable to add card to the directory with URI: " +
                       this.URI, e);
    }
    return null;
  },
  /**
   * Returns an array of all of the cards in this Address Book.
   * @returns  An array of the nsIAbCards in this Address Book.
   */
  getAllCards: function AddressBook_getAllCards() {
    this.mCards = [];
    var iter = this.mDirectory.childCards;
    var data;
    if (iter instanceof Components.interfaces.nsISimpleEnumerator) { // Thunderbird 3
      while (iter.hasMoreElements()) {
        data = iter.getNext();
        if (data instanceof Components.interfaces.nsIAbCard && !data.isMailList)
          this.mCards.push(data);
      }
    }
    else if (iter instanceof Components.interfaces.nsIEnumerator) { // TB 2
      // use nsIEnumerator...
      try {
        iter.first();
        do {
          data = iter.currentItem();
          if(data instanceof Components.interfaces.nsIAbCard && !data.isMailList)
            this.mCards.push(data);
          iter.next();
        } while (Components.lastResult == 0);
      // An error is expected when finished
      }
      catch(e) {
        com.gContactSync.LOGGER.VERBOSE_LOG("(This error is expected): " + e);
      }
    }
    else {
      com.gContactSync.LOGGER.LOG_ERROR("Could not iterate through an address book's contacts");
      throw "Couldn't find an address book's contacts";
    }
    return this.mCards;
  },
  /**
   * Returns an an object containing MailList objects whose attribute name is
   * the name of the mail list.
   * @param skipGetCards {boolean} True to skip getting the cards of each list.
   * @returns An object containing MailList objects.
   */
  getAllLists: function AddressBook_getAllLists(skipGetCards) {
    // same in Thunderbird 2 and 3
    com.gContactSync.LOGGER.VERBOSE_LOG("Searching for mailing lists:");
    var iter = this.mDirectory.childNodes;
    var obj = {};
    var list, id, data;
    while (iter.hasMoreElements()) {
      data = iter.getNext();
      if (data instanceof Components.interfaces.nsIAbDirectory && data.isMailList) {
        list    = this.newListObj(data, this, skipGetCards);
        obj.push(list);
        com.gContactSync.LOGGER.VERBOSE_LOG(" * " + list.getName() + " - " + id);
      }
    }
    return obj;
  },
  /**
   * Finds and returns the first Mail List that matches the given nickname in
   * this address book.
   * @param aNickName {string} The nickname to search for.  If null then this
   *                           function returns nothing.
   * @returns {MailList} A new MailList object containing a list that matches the
   *                    nickname or nothing if the list wasn't found.
   */
  getListByNickName: function AddressBook_getListByNickName(aNickName) {
    if (!aNickName)
      return null;
    // same in Thunderbird 2 and 3
    var iter = this.mDirectory.childNodes;
    var data;
    while (iter.hasMoreElements()) {
      data = iter.getNext();
      if (data instanceof Components.interfaces.nsIAbDirectory && data.isMailList &&
          data.listNickName == aNickName) {
        return this.newListObj(data, this, true);
      }
    }
    return null;
  },
  /**
   * Creates a new mail list, adds it to the address book, and returns a
   * MailList object containing the list.
   * @param aName     {string} The new name for the mail list.
   * @param aNickName {string} The nickname for the mail list.
   * @returns {MailList} A new MailList object containing the newly-made List
   *                    with the given name and nickname.
   */
  addList: function AddressBook_addList(aName, aNickName) {
    if (!aName)
      throw "Error - aName sent to addList is invalid";
    if (!aNickName)
      throw "Error - aNickName sent to addList is invalid";
    var list          = Components.classes["@mozilla.org/addressbook/directoryproperty;1"]
                                  .createInstance(Components.interfaces.nsIAbDirectory);
    list.isMailList   = true;
    list.dirName      = aName;
    list.listNickName = aNickName;
    this.mDirectory.addMailList(list);
    // list can't be QI'd to an MDBDirectory, so the new list has to be found...
    var realList  = this.getListByNickName(aNickName);
    return realList;
  },
  /**
   * Deletes the nsIAbCards from the nsIAbDirectory Address Book.  If the cards
   * aren't in the book nothing will happen.
   * @param aCard {array} The cards to delete from the directory
   */
  deleteCards: function AddressBook_deleteCards(aCards) {
    if (!(aCards && aCards.length && aCards.length > 0))
      return;
    var arr;
    if (com.gContactSync.AbManager.mVersion == 3) { // TB 3
      arr = Components.classes["@mozilla.org/array;1"]
                      .createInstance(Components.interfaces.nsIMutableArray);
      for (var i = 0; i < aCards.length; i++) {
        com.gContactSync.AbManager.checkCard(aCards[i], "AddressBook.deleteCards()");
        arr.appendElement(aCards[i], false);
      }
    }
    else { // TB 2
      arr =  Components.classes["@mozilla.org/supports-array;1"]
                       .createInstance(Components.interfaces.nsISupportsArray);
      for (var i = 0; i < aCards.length; i++) {
        com.gContactSync.AbManager.checkCard(aCards[i], "AddressBook.deleteCards()");
        arr.AppendElement(aCards[i], false);
      }
    }
    if (arr) { // make sure arr isn't null (mailnews bug 448165)
      this.mCardsUpdate = true;
      this.mDirectory.deleteCards(arr);
    }
  },
  /**
   * Updates a card (commits changes) in this address book.
   * @param aCard The card to update.
   */
  updateCard: function AddressBook_updateCard(aCard) {
    com.gContactSync.AbManager.checkCard(aCard);
    this.mCardsUpdate = true;
    if (this.mDirectory && this.mDirectory.modifyCard)
      this.mDirectory.modifyCard(aCard);
    else
      aCard.editCardToDatabase(this.URI);
  },
  /**
   * Checks the validity of a mailing list and throws an error if it is invalid.
   * @param aCard        {nsIAbDirectory} An object that should be a mailing list.
   * @param aMethodName  {string} The name of the method calling checkList (used
   *                              when throwing the error)
   */
  checkList: function AddressBook_checkList(aList, aMethodName) {
    // if it is a MailList object, get it's actual list
    var list = aList && aList.mList ? aList.mList : aList;
    if (!list || !(list instanceof Components.interfaces.nsIAbDirectory) || !list.isMailList) {
      throw "Invalid list: " + aList + " sent to the '" + aMethodName +
            "' method" +  com.gContactSync.StringBundle.getStr("pleaseReport");
    }
  },
  /**
   * Checks the validity of a directory and throws an error if it is invalid.
   * @param aDirectory  {nsIAbDirectory} The directory to check.
   * @param aMethodName {strong} The name of the method calling checkDirectory
   *                             (used when throwing the error)
   */
  checkDirectory: function AddressBook_checkDirectory(aDirectory, aMethodName) {
    if (!this.isDirectoryValid(aDirectory))
      throw "Invalid Directory: " + aDirectory + " sent to the '" + aMethodName
            + "' method" +  com.gContactSync.StringBundle.getStr("pleaseReport");
  },
  /**
   * Checks the validity of a directory and returns false if it is invalid.
   * @param aDirectory {nsIAbDirectory} The directory to check.
   */
  isDirectoryValid: function AddressBook_isDirectoryValid(aDirectory) {
    return aDirectory && aDirectory instanceof Components.interfaces.nsIAbDirectory 
          && aDirectory.dirName != "" && (com.gContactSync.AbManager.mVersion == 3 || 
          aDirectory instanceof Components.interfaces.nsIAbMDBDirectory);
  },
  /**
   * Returns the value of the specifiec property in the given card, or throws an
   * error if it is not present or blank.
   * @param aCard     {nsIAbCard} The card to get the value from.
   * @param aAttrName {string}    The name of the attribute to get.
   */
   getCardValue: function AddressBook_getCardValue(aCard, aAttrName) {
     return com.gContactSync.AbManager.getCardValue(aCard, aAttrName);
   },
  /**
   * Sets the value of the specifiec property in the given card but does not
   * update the card in the database.
   * @param aCard     {nsIAbCard} The card to get the value from.
   * @param aAttrName {string}    The name of the attribute to set.
   * @param aValue    {string}    The value to set for the attribute.
   */
   setCardValue: function AddressBook_setCardValue(aCard, aAttrName, aValue) {
     return com.gContactSync.AbManager.setCardValue(aCard, aAttrName, aValue);
   },
  /**
   * Returns true if the given card has at least one address-related property
   * for the given type.
   * @param aCard    {nsIAbCard} The card to check.
   * @param aPrefix  {string} The prefix/type (Home or Work).
   * @returns {boolean} True if aCard has at least one address-related property
   *                   of the given type.
   */
  hasAddress: function AddressBook_hasAddress(aCard, aPrefix) {
    com.gContactSync.AbManager.checkCard(aCard);
    return this.getCardValue(aCard, aPrefix + "Address") || 
           this.getCardValue(aCard, aPrefix + "Address2") ||
           this.getCardValue(aCard, aPrefix + "City") ||
           this.getCardValue(aCard, aPrefix + "State") ||
           this.getCardValue(aCard, aPrefix + "ZipCode") ||
           this.getCardValue(aCard, aPrefix + "Country");
  },
  /**
   * Creates and returns a new address book card.
   * @returns {nsIAbCard} A new instantiation of nsIAbCard.
   */
  makeCard: function AddressBook_makeCard() {
    return Components.classes["@mozilla.org/addressbook/cardproperty;1"]
                     .createInstance(Components.interfaces.nsIAbCard);
  },
  /**
   * Returns true if the directory passed in is the same as the directory
   * stored by this AddressBook object.  Two directories are considered the same
   * if and only if their Uniform Resource Identifiers (URIs) are the same.
   * @param aOtherDir The directory to compare with this object's directory.
   * @returns {boolean} True if the URI of the passed directory is the same as
   *                   the URI of the directory stored by this object.
   */
  equals: function AddressBook_equals(aOtherDir) {
    // return false if the directory isn't valid
    if (!this.isDirectoryValid(aOtherDir))
      return false;
    // compare the URIs
    if (this.mDirectory.URI)
      return this.mDirectory.URI == aOtherDir.URI;
    return this.mDirectory.getDirUri() == aOtherDir.getDirUri();
  },
  /**
   * Returns the card in this directory, if any, with the same (not-null)
   * value for the GoogleID attribute, or, if the GoogleID is null, if the
   *         display name, primary, and second emails are the same.
   * @param aCard {nsIAbCard} The card being searched for.
   * @returns {nsIAbCard} The card in this list, if any, with the same, and
   *                     non-null value for its GoogleID attribute, or, if the
   *                     GoogleID is null, if the display name, primary, and
   *                     second emails are the same.
   */
  hasCard: function AddressBook_hasCard(aCard) {
    com.gContactSync.AbManager.checkCard(aCard);
    if (this.mCardsUpdate)
      this.getAllCards();
    var card, aCardID;
    for (var i = 0, length = this.mCards.length; i < length; i++) {
      card = this.mCards[i];
      aCardID = com.gContactSync.AbManager.getCardValue(aCard, "GoogleID");
      // if it is an old card (has id) compare IDs
      if (aCardID) {
        if (aCardID == com.gContactSync.AbManager.getCardValue(card, "GoogleID"))
          return card;
      }
      // else check that display name, primary and second email are equal
      else if (com.gContactSync.AbManager.getCardValue(aCard, "DisplayName") ==
                                      com.gContactSync.AbManager.getCardValue(card,"DisplayName")
              && com.gContactSync.AbManager.getCardValue(aCard, "PrimaryEmail") ==
                                        com.gContactSync.AbManager.getCardValue(card, "PrimaryEmail")
              && com.gContactSync.AbManager.getCardValue(aCard, "SecondEmail") ==
                                        com.gContactSync.AbManager.getCardValue(card, "SecondEmail"))
        return card;
    }
    return null;
  },
  /**
   * Sets the preference id for this mailing list.  The update method must be
   * called in order for the change to become permanent.
   * @param aPrefId {string} The new preference ID for this mailing list.
   */
  setPrefId: function AddressBook_setPrefId(aPrefId) {
    this.mDirectory.dirPrefId = aPrefId;
  },
  /**
   * Returns the preference ID of this directory.
   * @returns {string} The preference ID of this directory.
   */
  getPrefId: function AddressBook_getPrefId() {
    return this.mDirectory.dirPrefId;
  },
  /**
   * Gets and returns the string preference, if possible, with the given name.
   * Returns null if this list doesn't have a preference ID or if there was an
   * error getting the preference.
   * @param aName         {string} The name of the preference to get.
   * @param aDefaultValue {string} The value to set the preference at if it
   *                               fails.  Only used in Thunderbird 3.
   * @returns {string} The value of the preference with the given name in the
   *                  preference branch specified by the preference ID, if
   *                  possible.  Otherwise null.
   */
  getStringPref: function AddressBook_getStringPref(aName, aDefaultValue) {
    var id = this.getPrefId();
    //com.gContactSync.LOGGER.VERBOSE_LOG("Getting pref named: " + aName + " from the branch: " + id);
    /* The code below is commented out for backward compatibility with TB 2,
     * which crashes if you set a custom pref for a directory.  It is a somewhat
     * sloppy workaround that, instead of using preferences from the directory's
     * actual branch, uses a preference with from the directory's pref. ID
     * and appends the preference name to that ID without a period in between
     * ex. "ldap_2.servers.emailaddrgmailcomgContactSyncPrimary" instead of
     * "ldap_2.servers.emailaddrgmailcom.gContactSyncPrimary" 
     */
    /*
    if (this.mDirectory.getStringValue) {
      try {
        var value = this.mDirectory.getStringValue(aName, aDefaultValue);
        com.gContactSync.LOGGER.VERBOSE_LOG("-Found the value: " + value);
        return value;
      } catch (e) { return 0; }
      return null;
    }*/
    if (!id)
      return null;
    try {
      var branch = Components.classes["@mozilla.org/preferences-service;1"]
                             .getService(Components.interfaces.nsIPrefService)
                             .getBranch(id)
                             .QueryInterface(Components.interfaces.nsIPrefBranch2);
      var value = branch.getCharPref(aName);
      //com.gContactSync.LOGGER.VERBOSE_LOG("-Found the value: " + value);
      return value;
    }
    // an error is expected if the value isn't present
    catch(e) {
      return 0;
    }
    return null;
  },
  /**
   * Sets the string preference, if possible, with the given name and value.
   * @param aName  {string} The name of the preference to set.
   * @param aValue {string} The value to which the preference is set.
   */
  setStringPref: function AddressBook_setStringPref(aName, aValue) {
    var id = this.getPrefId();
    com.gContactSync.LOGGER.VERBOSE_LOG("Setting pref named: " + aName + " to value: " + aValue +
                       " to the branch: " + id);
    /* The code below is commented out for backward compatibility with TB 2,
     * which crashes if you set a custom pref for a directory.  It is a somewhat
     * sloppy workaround that, instead of using preferences from the directory's
     * actual branch, uses a preference with from the directory's pref. ID
     * and appends the preference name to that ID without a period in between
     * ex. "ldap_2.servers.emailaddrgmailcomgContactSyncPrimary" instead of
     * "ldap_2.servers.emailaddrgmailcom.gContactSyncPrimary"
     */
    /*
    if (this.mDirectory.setStringValue) {
      try {
        this.mDirectory.setStringValue(aName, aValue);
      } catch (e) { com.gContactSync.LOGGER.LOG_WARNING("Error while setting directory pref", e); }
      return;
    }*/
    if (!id) {
      com.gContactSync.LOGGER.VERBOSE_LOG("Invalid ID");
      return;
    }
    if (!aName || aName == "") {
      com.gContactSync.LOGGER.VERBOSE_LOG("Invalid name");
      return;
    }
    try {
      var branch = Components.classes["@mozilla.org/preferences-service;1"]
                             .getService(Components.interfaces.nsIPrefService)
                             .getBranch(id)
                             .QueryInterface(Components.interfaces.nsIPrefBranch2);
      branch.setCharPref(aName, aValue);
    } catch(e) { com.gContactSync.LOGGER.LOG_WARNING("Error while setting directory pref", e); }
  },

  /**
   * Returns the name of this address book.
   * @returns {string} The name of this address book.
   */
  getName: function AddressBook_getName() {
    return this.mDirectory.dirName;
  },
  /**
   * Sets the name of this address book.  Throws an error if the name is set to
   * either the PAB or CAB's name.
   * @param aName {string} The new name for this directory.
   */
  setName: function AddressBook_setName(aName) {
    // make sure it isn't being set to the PAB or CAB name and make sure that
    // this isn't the PAB or CAB
    var pab = com.gContactSync.AbManager.getAbByURI("moz-abmdbdirectory://abook.mab");
    var cab = com.gContactSync.AbManager.getAbByURI("moz-abmdbdirectory://history.mab");
    if (aName == pab.dirName || aName == cab.dirName)
      throw "Error - cannot rename a directory to the PAB or CAB's name";
    if (this.getName() == pab.dirName || this.getName() == cab.dirName)
      throw "Error - cannot rename the PAB or CAB";
    // in TB 3, it is as simple as changing a property of the directory
    if (com.gContactSync.AbManager.mVersion == 3)
      this.mDirectory.dirName = aName;
    // in TB 2 a few extra steps are necessary...
    else {
      /* NOTE: this code is originally from
      * mailnews/addrbook/resources/content/addressbook.js:
      * http://mxr.mozilla.org/mozilla1.8/source/mailnews/addrbook/resources/content/addressbook.js#353
      */
      var addressbook = Components.classes["@mozilla.org/addressbook;1"]
                                  .createInstance(Components.interfaces.nsIAddressBook);
      // the rdf service
      var RDF = Components.classes["@mozilla.org/rdf/rdf-service;1"]
                          .getService(Components.interfaces.nsIRDFService);
      // get the datasource for the addressdirectory
      var datasource = RDF.GetDataSource("rdf:addressdirectory");

      // moz-abdirectory:// is the RDF root to get all types of addressbooks.
      var parent = RDF.GetResource("moz-abdirectory://")
                      .QueryInterface(Components.interfaces.nsIAbDirectory);
      // Copy existing dir type category id and mod time so they won't get reset.
      var properties = this.mDirectory.directoryProperties;
      properties.description = aName;
      // Now do the modification.
      addressbook.modifyAddressBook(datasource, parent, this.mDirectory, properties);
    }
  },
  /**
   * Returns the directory type of this address book.
   * See mailnews/addrbook/src/nsDirPrefs.h
   * @returns {integer} The directory type of this address book.
   */
  getDirType: function AddressBook_getDirType() {
    return this.mDirectory.dirType;
  },
  /**
   * Creates a new mailing list in this directory and returns a MailList object
   * representing the new list.
   * @returns {MailList} A new MailList object.
   */
  newListObj: function AddressBook_newListObj(aList, aParentDirectory, aNew) {
    return new com.gContactSync.MailList(aList, aParentDirectory, aNew);
  },
  /**
   * Permanently deletes this address book without a confirmation dialog.
   * This will not allow deleting the PAB or CAB and will show a popup
   * if there is an attempt to delete one of those ABs.
   * @returns {boolean} True if the AB was deleted.
   */
  deleteAB: function AddressBook_delete() {
    return com.gContactSync.AbManager.deleteAB(this.mURI);
  }
}
