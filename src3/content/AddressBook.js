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
 * AddressBook
 * A class for a Thunderbird Address Book with methods to add, modify, obtain, 
 * and delete cards.
 * @param aDirectory The actual directory.
 * @constructor
 * @class
 */
function AddressBook(aDirectory) {
  this.mDirectory = aDirectory;
  // make sure the directory is valid
  if (!this.isDirectoryValid(this.mDirectory))
    throw "Invalid directory supplied to the AddressBook constructor" +
          "\nCalled by: " + this.caller +
          StringBundle.getStr("pleaseReport");
  // get the directory's URI
  if (this.mDirectory.URI)
    this.mURI = this.mDirectory.URI;
  else {
    this.mDirectory.QueryInterface(Ci.nsIAbMDBDirectory);
    this.mURI = this.mDirectory.getDirUri();
  }
}

AddressBook.prototype = {
  mURI:         {}, // the uniform resource identifier of the directory
  mCards:       [], // the cards within this address book
  mCardsUpdate: false, // set to true when mCards should be updated
  /**
   * AddressBook.addCard
   * Adds the card to this address book and returns the added card.
   * @param aCard The card to add.
   * @return An MDB
   */
  addCard: function AddressBook_addCard(aCard) {
    AbManager.checkCard(aCard); // check the card's validity first
    try {
      this.mCards.push(aCard);
      return this.mDirectory.addCard(aCard); // then add it and return the MDBCard
    }
    catch(e) {
      LOGGER.LOG_ERROR("Unable to add card to the directory with URI: " +
                       this.URI, e);
    }
    return null;
  },
  /**
   * AddressBook.getAllCards
   * Returns an array of all of the cards in this Address Book.
   * @return  An array of the nsIAbCards in this Address Book.
   */
  getAllCards: function AddressBook_getAllCards() {
    this.mCards = [];
    var iter = this.mDirectory.childCards;
    var data;
    if (AbManager.mVersion == 3) { // TB 3
      while (iter.hasMoreElements()) {
        data = iter.getNext();
        if (data instanceof nsIAbCard && !data.isMailList)
          this.mCards.push(data);
      }
    }
    else { // TB 2
      // use nsIEnumerator...
      try {
        iter.first();
        do {
          data = iter.currentItem();
          if(data instanceof nsIAbCard && !data.isMailList)
            this.mCards.push(data);
          iter.next();
        } while (Components.lastResult == 0);
      } catch(e) {} // error is expected when finished   
    }
    return this.mCards;
  },
  /**
   * AddressBook.getAllLists
   * Returns an an object containing MailList objects whose attribute name is
   * the name of the mail list.
   * @param skipGetCards True to skip getting the cards of each list.
   * @return An object containing MailList objects.
   */
  getAllLists: function AddressBook_getAllLists(skipGetCards) {
    // same in Thunderbird 2 and 3
    LOGGER.VERBOSE_LOG("Searching for mailing lists:");
    var iter = this.mDirectory.childNodes;
    var obj = {};
    var list, id, data;
    while (iter.hasMoreElements()) {
      data = iter.getNext();
      if (data instanceof Ci.nsIAbDirectory && data.isMailList) {
        list    = this.newListObj(data, this, skipGetCards);
        obj.push(list);
        LOGGER.VERBOSE_LOG(" * " + list.getName() + " - " + id);
      }
    }
    return obj;
  },
  /**
   * AddressBook.getListByDesc
   * Finds and returns the first Mail List that matches the given nickname in
   * this address book.
   * @param aNickName The nickname to search for.  If null then this
   *                  function returns nothing.
   * @return A new MailList object containing a list that matches the
   *         nickname or nothing if the list wasn't found.
   */
  getListByNickName: function AddressBook_getListByNickName(aNickName) {
    if (!aNickName)
      return null;
    // same in Thunderbird 2 and 3
    var iter = this.mDirectory.childNodes;
    var data;
    while (iter.hasMoreElements()) {
      data = iter.getNext();
      if (data instanceof Ci.nsIAbDirectory && data.isMailList &&
          data.listNickName == aNickName) {
        return this.newListObj(data, this, true);
      }
    }
    return null;
  },
  /**
   * AddressBook.addList
   * Creates a new mail list, adds it to the address book, and returns a
   * MailList object containing the list.
   * @param aName     The new name for the mail list.
   * @param aNickName The nickname for the mail list.
   * @return A new MailList object containing the newly-made Mail List with the
   *         given name and nickname.
   */
  addList: function AddressBook_addList(aName, aNickName) {
    if (!aName)
      throw "Error - aName sent to addList is invalid";
    if (!aNickName)
      throw "Error - aNickName sent to addList is invalid";
    var list          = Cc["@mozilla.org/addressbook/directoryproperty;1"]
                         .createInstance(Ci.nsIAbDirectory);
    list.dirName      = aName;
    list.listNickName = aNickName;
    list.isMailList   = true;
    this.mDirectory.addMailList(list);
    // list can't be QI'd to an MDBDirectory, so the new list has to be found...
    var realList  = this.getListByNickName(aNickName);
    return realList;
  },
  /**
   * AddressBook.deleteCards
   * Deletes the nsIAbCard from the nsIAbDirectory Address Book.  If the card
   * isn't in the book nothing will happen
   * @param aCard   The card to delete from the directory
   */
  deleteCards: function AddressBook_deleteCards(aCards) {
    if (!(aCards && aCards.length && aCards.length > 0))
      return;
    var arr;
    if (AbManager.mVersion == 3) { // TB 3
      arr = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
      for (var i = 0; i < aCards.length; i++) {
        AbManager.checkCard(aCards[i], "AddressBook.deleteCards()");
        arr.appendElement(aCards[i], false);
      }
    }
    else { // TB 2
      arr =  Cc["@mozilla.org/supports-array;1"]
              .createInstance(Ci.nsISupportsArray);
      for (var i = 0; i < aCards.length; i++) {
        AbManager.checkCard(aCards[i], "AddressBook.deleteCards()");
        arr.AppendElement(aCards[i], false);
      }
    }
    if (arr) { // make sure arr isn't null (mailnews bug 448165)
      this.mCardsUpdate = true;
      this.mDirectory.deleteCards(arr);
    }
  },
  /**
   * AddressBook.updateCard
   * Updates a card in this address book.
   * @param aCard The card to update.
   */
  updateCard: function AddressBook_updateCard(aCard) {
    AbManager.checkCard(aCard);
    this.mCardsUpdate = true;
    if (this.mDirectory && this.mDirectory.modifyCard)
      this.mDirectory.modifyCard(aCard);
    else
      aCard.editCardToDatabase(this.URI);
  },
  /**
   * AddressBook.checkList
   * Checks the validity of a mailing list and throws an error if it is invalid.
   * @param aCard        An object that should be a mailing list
   * @param aMethodName  The name of the method calling checkList (used when
   *                     throwing the error)
   */
  checkList: function AddressBook_checkList(aList, aMethodName) {
    // if it is a MailList object, get it's actual list
    var list = aList && aList.mList ? aList.mList : aList;
    if (!list || !(list instanceof Ci.nsIAbDirectory) || !list.isMailList) {
      throw "Invalid list: " + aList + " sent to the '" + aMethodName +
            "' method" +  StringBundle.getStr("pleaseReport");
    }
  },
  /**
   * AddressBook.checkDirectory
   * Checks the validity of a directory and throws an error if it is invalid.
   * @param aDirectory The directory to check.
   * @param aMethodName  The name of the method calling checkDirectory (used when
   *                     throwing the error)
   */
  checkDirectory: function AddressBook_checkDirectory(aDirectory, aMethodName) {
    if (!this.isDirectoryValid(aDirectory))
      throw "Invalid Directory: " + aDirectory + " sent to the '" + aMethodName
            + "' method" +  StringBundle.getStr("pleaseReport");
  },
  /**
   * AddressBook.checkDirectory
   * Checks the validity of a directory and returns false if it is invalid.
   * @param aDirectory The directory to check.
   */
  isDirectoryValid: function AddressBook_isDirectoryValid(aDirectory) {
    return aDirectory && aDirectory instanceof Ci.nsIAbDirectory 
          && aDirectory.dirName != "" && (AbManager.mVersion == 3 || 
          aDirectory instanceof Ci.nsIAbMDBDirectory);
  },
  /**
   * AddressBook.getCardValue
   * Returns the value of the specifiec property in the given card, or throws an
   * error if it is not present or blank.
   * @param aCard     The card to get the value from.
   * @param aAttrName The name of the attribute to get.
   */
   getCardValue: function AddressBook_getCardValue(aCard, aAttrName) {
     return AbManager.getCardValue(aCard, aAttrName);
   },
  /**
   * AddressBook.getCardValue
   * Sets the value of the specifiec property in the given card but does not
   * update the card in the database.
   * @param aCard     The card to get the value from.
   * @param aAttrName The name of the attribute to set.
   * @param aValue    The value to set for the attribute.
   */
   setCardValue: function AddressBook_setCardValue(aCard, aAttrName, aValue) {
     return AbManager.setCardValue(aCard, aAttrName, aValue);
   },
  /**
   * AddressBook.hasAddress
   * Returns true if the given card has at least one address-related property
   * for the given type.
   * @param aCard    The card to check.
   * @param aPrefix  The prefix/type (Home or Work).
   * @return True if aCard has at least one address-related property of the
   *         given type.
   */
  hasAddress: function AddressBook_hasAddress(aCard, aPrefix) {
    AbManager.checkCard(aCard);
    return this.getCardValue(aCard, aPrefix + "Address") || 
           this.getCardValue(aCard, aPrefix + "Address2") ||
           this.getCardValue(aCard, aPrefix + "City") ||
           this.getCardValue(aCard, aPrefix + "State") ||
           this.getCardValue(aCard, aPrefix + "ZipCode") ||
           this.getCardValue(aCard, aPrefix + "Country");
  },
  /**
   * AddressBook.makeCard
   * Creates and returns a new address book card.
   * @return A new instantiation of nsIAbCard.
   */
  makeCard: function AddressBook_makeCard() {
    return Cc["@mozilla.org/addressbook/cardproperty;1"]
           .createInstance(Ci.nsIAbCard);
  },
  
  /**
   * AddressBook.equals
   * Returns true if the directory passed in is the same as the directory
   * stored by this AddressBook object.  Two directories are considered the same
   * if and only if their Uniform Resource Identifiers (URIs) are the same.
   * @param aOtherDir The directory to compare with this object's directory.
   * @return True if the URI of the passed directory is the same as the URI of
   *         the directory stored by this object.
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
   * AddressBook.hasCard
   * Returns the card in this directory, if any, with the same (not-null)
   * value for the GoogleID attribute, or, if the GoogleID is null, if the
   *         display name, primary, and second emails are the same.
   * @param aCard The card being searched for.
   * @return The card in this list, if any, with the same, and non-null value
   *         for its GoogleID attribute, or, if the GoogleID is null, if the
   *         display name, primary, and second emails are the same.
   */
  hasCard: function AddressBook_hasCard(aCard) {
    AbManager.checkCard(aCard);
    if (this.mCardsUpdate)
      this.getAllCards();
    var card, aCardID;
    for (var i = 0, length = this.mCards.length; i < length; i++) {
      card = this.mCards[i];
      aCardID = AbManager.getCardValue(aCard, "GoogleID");
      // if it is an old card (has id) compare IDs
      if (aCardID) {
        if (aCardID == AbManager.getCardValue(card, "GoogleID"))
          return card;
      }
      // else check that display name, primary and second email are equal
      else if (AbManager.getCardValue(aCard, "DisplayName") ==
                                      AbManager.getCardValue(card,"DisplayName")
              && AbManager.getCardValue(aCard, "PrimaryEmail") ==
                                        AbManager.getCardValue(card, "PrimaryEmail")
              && AbManager.getCardValue(aCard, "SecondEmail") ==
                                        AbManager.getCardValue(card, "SecondEmail"))
        return card;
    }
    return null;
  },
  /**
   * AddressBook.setPrefId
   * Sets the preference id for this mailing list.  The update method must be
   * called in order for the change to become permanent.
   * @param aPrefId The new preference ID for this mailing list.
   */
  setPrefId: function AddressBook_setPrefId(aPrefId) {
    this.mDirectory.dirPrefId = aPrefId;
  },
  /**
   * AddressBook.getPrefId
   * Returns the preference ID of this directory.
   * @return The preference ID of this directory.
   */
  getPrefId: function AddressBook_getPrefId() {
    return this.mDirectory.dirPrefId;
  },
  /**
   * AddressBook.getStringPref
   * Gets and returns the string preference, if possible, with the given name.
   * Returns null if this list doesn't have a preference ID or if there was an
   * error getting the preference.
   * @param aName         The name of the preference to get.
   * @param aDefaultValue The value to set the preference at if it fails.  Only
   *                      used in Thunderbird 3.
   * @return The value of the preference with the given name in the preference
   *         branch specified by the preference ID, if possible.  Otherwise null.
   */
  getStringPref: function AddressBook_getStringPref(aName, aDefaultValue) {
    var id = this.getPrefId();
    //LOGGER.VERBOSE_LOG("Getting pref named: " + aName + " from the branch: " + id);
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
        LOGGER.VERBOSE_LOG("-Found the value: " + value);
        return value;
      } catch (e) { return 0; }
      return null;
    }*/
    if (!id)
      return null;
    try {
      var branch = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService)
                    .getBranch(id)
                    .QueryInterface(Ci.nsIPrefBranch2);
      var value = branch.getCharPref(aName);
      //LOGGER.VERBOSE_LOG("-Found the value: " + value);
      return value;
    }
    // an error is expected if the value isn't present
    catch(e) {
      return 0;
    }
    return null;
  },
  /**
   * AddressBook.setStringPref
   * Setshe string preference, if possible, with the given name and value.
   * @param aName  The name of the preference to get.
   * @param aValue The value to set the preference to.
   */
  setStringPref: function AddressBook_setStringPref(aName, aValue) {
    var id = this.getPrefId();
    LOGGER.VERBOSE_LOG("Setting pref named: " + aName + " to value: " + aValue +
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
      } catch (e) { LOGGER.LOG_WARNING("Error while setting directory pref", e); }
      return;
    }*/
    if (!id) {
      LOGGER.VERBOSE_LOG("Invalid ID");
      return;
    }
    if (!aName || aName == "") {
      LOGGER.VERBOSE_LOG("Invalid name");
      return;
    }
    try {
      var branch = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService)
                    .getBranch(id)
                    .QueryInterface(Ci.nsIPrefBranch2);
      branch.setCharPref(aName, aValue);
    } catch(e) { LOGGER.LOG_WARNING("Error while setting directory pref", e); }
  },

  /**
   * AddressBook.getName
   * Returns the name of this address book.
   * @return The name of this address book.
   */
  getName: function AddressBook_getName() {
    return this.mDirectory.dirName;
  },
  /**
   * AddressBook.setName
   * Sets the name of this address book.  Throws an error if the name is set to
   * either the PAB or CAB's name.
   * @param aName The new name for this directory.
   */
  setName: function AddressBook_setName(aName) {
    // make sure it isn't being set to the PAB or CAB name and make sure that
    // this isn't the PAB or CAB
    var pab = AbManager.getAbByURI("moz-abmdbdirectory://abook.mab");
    var cab = AbManager.getAbByURI("moz-abmdbdirectory://history.mab");
    if (aName == pab.dirName || aName == cab.dirName)
      throw "Error - cannot rename a directory to the PAB or CAB's name";
    if (this.getName() == pab.dirName || this.getName() == cab.dirName)
      throw "Error - cannot rename the PAB or CAB";
    // in TB 3, it is as simple as changing a property of the directory
    if (AbManager.mVersion == 3)
      this.mDirectory.dirName = aName;
    // in TB 2 a few extra steps are necessary...
    else {
      /* NOTE: this code is originally from
      * mailnews/addrbook/resources/content/addressbook.js:
      * http://mxr.mozilla.org/mozilla1.8/source/mailnews/addrbook/resources/content/addressbook.js#353
      */
      var addressbook = Cc["@mozilla.org/addressbook;1"]
                         .createInstance(Ci.nsIAddressBook);
      // the rdf service
      var RDF = Cc["@mozilla.org/rdf/rdf-service;1"].getService(Ci.nsIRDFService);
      // get the datasource for the addressdirectory
      var datasource = RDF.GetDataSource("rdf:addressdirectory");

      // moz-abdirectory:// is the RDF root to get all types of addressbooks.
      var parent = RDF.GetResource("moz-abdirectory://")
                         .QueryInterface(Ci.nsIAbDirectory);
      // Copy existing dir type category id and mod time so they won't get reset.
      var properties = this.mDirectory.directoryProperties;
      properties.description = aName;
      // Now do the modification.
      addressbook.modifyAddressBook(datasource, parent, this.mDirectory, properties);
    }
  },
  newListObj: function AddressBook_newListObj(aList, aParentDirectory, aNew) {
    return new MailList(aList, aParentDirectory, aNew);
  }
}
