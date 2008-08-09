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
 * AddressBook
 * A class for a Thunderbird Address Book with methods to add, modify, obtain, 
 * and delete cards.
 * @param aName The name of the address book.
 * @param aURI  Optional.  The URI of the address book to obtain.  If present,
 *              ignores the given name.
 * @constructor
 * @class
 */
function AddressBook(aName, aURI) {
  // get the version of Thunderbird
  if (Cc["@mozilla.org/abmanager;1"]) // The AB Manager is in Thunderbird 3
    this.mVersion = 3;
  else
    this.mVersion = 2;
  // get the address book by either the URI or name or throw an error
  if (aURI)
    this.mDirectory = this.getAbByURI(aURI);
  else if (aName)
    this.mDirectory = this.getAbByName(aName);
  else
    throw "Invalid aURI supplied to the AddressBook constructor" +
          StringBundle.getStr("pleaseReport");
  // make sure the directory is valid
  if (!this.isDirectoryValid(this.mDirectory))
    throw "Invalid aURI or aName supplied to the AddressBook constructor" +
          StringBundle.getStr("pleaseReport");
  this.mURI = this.mDirectory.URI;
  // figure out if this is post-bug 413260
  var card = Cc["@mozilla.org/addressbook/cardproperty;1"]
              .createInstance(nsIAbCard);
  this.mBug413260 = card.getProperty ? true : false;
}

AddressBook.prototype = {
  mCurrentCard: {}, // the last card modified
  mBug413260: false, // true if bug 413260 has landed
  mURI: {}, // the uniform resource identifier of the directory
  // attributes that can be set by getCardValue and setCardValue
  mBasicAttributes: [
    "DisplayName", "Notes", "CellularNumber", "HomePhone", "WorkPhone",
    "PagerNumber", "FaxNumber", "_AimScreenName", "PrimaryEmail", "SecondEmail",
    "Company", "JobTitle", "HomeAddress", "WorkAddress", "NickName",
    "FirstName", "LastName", "HomeAddress2", "HomeCity", "HomeState",
    "HomeZipCode", "HomeCountry", "WorkAddress2", "WorkCity", "WorkState",
    "WorkZipCode", "WorkCountry", "WebPage1", "WebPage2", "Department",
    "Custom1", "Custom2", "Custom3", "Custom4"],
  /**
   * AddressBook.addCard
   * Adds the card to this address book and returns the added card.
   * @param aCard The card to add.
   * @return An MDB
   */
  addCard: function(aCard) {
    this.checkCard(aCard, "addCardTo"); // check the card's validity first
    try {
      return this.mDirectory.addCard(aCard); // then add it and return the MDBCard
    }
    catch(e) {
      LOGGER.LOG_ERROR("Unable to add card to the directory with URI: " +
                       this.URI, e);
    }
  },
  /**
   * AddressBook.getAbByURI
   * Returns the address book with the given URI, if found.  Does not attempt
   * to make a new address book if not found and returns null.
   * @return  The Address Book with the given URI
   */
  getAbByURI: function(aURI) {
    if (!aURI) {
      LOGGER.LOG_WARNING("Invalid aURI supplied to the 'getAbByURI' method" +
                         StringBundle.getStr("pleaseReport"));
      return;
    }
    try {
      var dir;
      if (this.mVersion == 3)
        dir = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager)
               .getDirectory(aURI).QueryInterface(Ci.nsIAbDirectory);
      else
       dir = Cc["@mozilla.org/rdf/rdf-service;1"]
              .getService(Ci.nsIRDFService)
              .GetResource(aURI)
              .QueryInterface(Ci.nsIAbDirectory);
      // checks that the directory exists and is valid.  returns null if not.
      if (!this.isDirectoryValid(dir))
        return null;
      return dir;
    }
    catch(e) { LOGGER.LOG_ERROR("Error in getAbByURI" + e); }
  },
  /**
   * AddressBook.getAbByName
   * Returns the Address Book if it can be found.  If it cannot be found
   * it tries once to make it and return the newly made address book.
   * @param aDirName     The name of the address book
   * @return             The Address Book with the name given
   */
  getAbByName: function(aDirName) {
    if (!aDirName || aDirName.length == 0)
      throw "Invalid aDirName passed to the 'getAbByName' method." +
            StringBundle.getStr("pleaseReport");

    if (this.mVersion == 3) { // TB 3
      var abManager = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager);
      var data;
      var iter = abManager.directories;
      while(iter.hasMoreElements()) {
        data = iter.getNext();
        if (data instanceof Ci.nsIAbDirectory)
          if (data.dirName == aDirName)
            return data;
      }
      // the AB doesn"t exist, so make one:
      abManager.newAddressBook(aDirName, "moz-abmdbdirectory://", 2);
      // write a blank sync file to reset last sync date
      FileIO.writeToFile(FileIO.mDataFile, "0");
      iter = abManager.directories;
      while(iter.hasMoreElements()) {
        data = iter.getNext();
        if (data instanceof Ci.nsIAbDirectory)
          if (data.dirName == aDirName)
            return data;
      }// end of while loop
      return null;
    }
    else { // TB 2
      // obtain the main directory through the RDF service
      var dir = Cc["@mozilla.org/rdf/rdf-service;1"]
                 .getService(Ci.nsIRDFService)
                 .GetResource("moz-abdirectory://")
                 .QueryInterface(Ci.nsIAbDirectory);
      var iter = dir.childNodes;
      while(iter.hasMoreElements()) {
        data = iter.getNext();
        if (data instanceof Ci.nsIAbDirectory)
          if (data.dirName == aDirName)
            return data;
      }
      // the AB doesn't exist...
      // write a 0 to the data file to reset the last sync date
      FileIO.writeToFile(FileIO.mDataFile, "0");
      // setup the "properties" of the new address book
      var properties = Cc["@mozilla.org/addressbook/properties;1"]
	                     .createInstance(Ci.nsIAbDirectoryProperties);
	    properties.description = aDirName;
	    properties.dirType = 2; // address book
      dir.createNewDirectory(properties);
      var iter = dir.childNodes;
      while(iter.hasMoreElements()) {
        data = iter.getNext();
        if (data instanceof Ci.nsIAbDirectory)
          if (data.dirName == aDirName)
            return data;
      }
   }
    return null;
  },
  /**
   * AddressBook.getAllCards
   * Returns an array of all of the cards in this Address Book.
   * @return  An array of the nsIAbCards in this Address Book.
   */
  getAllCards: function() {
    var arr = [];
    var iter = this.mDirectory.childCards;
    if (this.mVersion == 3) { // TB 3
      while (iter.hasMoreElements()) {
        data = iter.getNext();
        if (data instanceof nsIAbCard && !data.isMailList)
          arr.push(data);
      }
    }
    else { // TB 2
      // use nsIEnumerator...
      try {
        iter.first();
        do {
          var data = iter.currentItem();
          if(data instanceof nsIAbCard && !data.isMailList)
            arr.push(data);
          iter.next();
        } while (Components.lastResult == 0);
      } catch(e) {} // error is expected when finished   
    }
    return arr;
  },
  /**
   * AddressBook.getAllLists
   * Returns an an object containing MailList objects whose attribute name is
   * the name of the mail list.
   * @param skipGetCards True to skip getting the cards of each list.
   * @return An object containing MailList objects.
   */
  getAllLists: function(skipGetCards) {
    // same in Thunderbird 2 and 3
    var iter = this.mDirectory.childNodes;
    var obj = {};
    while (iter.hasMoreElements()) {
      data = iter.getNext();
      if (data instanceof Ci.nsIAbDirectory && data.isMailList)
        var list = new MailList(data, this, skipGetCards);
        var description = list.getDescription();
        if (!description)
         description = "no description " + (new Date).getTime();
        obj[description] = list;
    }
    return obj;
  },
  /**
   * AddressBook.getListByDesc
   * Finds and returns the first Mail List that matches the given description in
   * this address book.
   * @param aDescription The description to search for.  If null then this
   *                     function returns nothing.
   * @return A new MailList object containing a list that matches the
   *         description or nothing if the list wasn't found.
   */
  getListByDesc: function(aDescription) {
    if (!aDescription)
      return;
    // same in Thunderbird 2 and 3
    var iter = this.mDirectory.childNodes;
    while (iter.hasMoreElements()) {
      data = iter.getNext();
      if (data instanceof Ci.nsIAbDirectory && data.isMailList &&
          data.description == aDescription) {
        var list = new MailList(data, this, true);
        return list;
      }
    }
  },
  /**
   * AddressBook.addList
   * Creates a new mail list, adds it to the address book, and returns a
   * MailList object containing the list.
   * @param aName        The new name for the mail list.
   * @param aDescription The description of the mail list.
   * @return A new MailList object containing the newly-made Mail List with the
   *         given name and description.
   */
  addList: function(aName, aDescription) {
    if (!aName)
      throw "Error - aName sent to addList is invalid";
    if (!aDescription)
      throw "Error - aDescription sent to addList is invalid";
    var list = Cc["@mozilla.org/addressbook/directoryproperty;1"]
                .createInstance(Ci.nsIAbDirectory);
    list.dirName = aName;
    list.description = aDescription;
    list.isMailList = true;
    this.mDirectory.addMailList(list);
    LOGGER.VERBOSE_LOG("getting the new list");
    // list can't be QI'd to an MDBDirectory, so the new list has to be found...
    var realList = this.getListByDesc(aDescription);
    return realList;
  },
  /**
   * AddressBook.deleteCards
   * Deletes the nsIAbCard from the nsIAbDirectory Address Book.  If the card
   * isn't in the book nothing will happen
   * @param aCard   The card to delete from the directory
   */
  deleteCards: function(aCards) {
    if (!(aCards && aCards.length && aCards.length > 0))
      return;
    var arr;
    if (this.mVersion == 3) { // TB 3
      arr = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
      for (var i = 0; i < aCards.length; i++) {
        this.checkCard(aCards[i], "deleteAbCard");
        arr.appendElement(aCards[i], false);
      }
    }
    else { // TB 2
      arr =  Cc["@mozilla.org/supports-array;1"]
              .createInstance(Ci.nsISupportsArray);
      for (var i = 0; i < aCards.length; i++) {
        this.checkCard(aCards[i], "deleteAbCard");
        arr.AppendElement(aCards[i], false);
      }
    }
    if (arr) // make sure arr isn't null (mailnews bug 448165)
      this.mDirectory.deleteCards(arr);
  },
  /**
   * AddressBook.updateCard
   * Updates a card in this address book.
   * @param aCard The card to update.
   */
  updateCard: function(aCard) {
    this.checkCard(aCard, "updateCard");
    if (this.mDirectory && this.mDirectory.modifyCard)
      this.mDirectory.modifyCard(aCard);
    else
      aCard.editCardToDatabase(this.URI);
  },
  /**
   * AddressBook.checkCard
   * Checks the validity of a card and throws an error if the card is invalid.
   * @param aCard        An object that should be an instance of nsIAbCard
   * @param aMethodName  The name of the method calling checkCard (used when
   *                     throwing the error)
   */
  checkCard: function(aCard, aMethodName) {
    var card = aCard && aCard.mCard ? aCard.mCard : aCard;
    if (!card || (!(card instanceof Ci.nsIAbCard) &&
                  !(card instanceof Ci.nsIAbMDBCard))) {
      throw "Invalid card: " + aCard + "passed to the '" + aMethodName +
            "' method." + StringBundle.getStr("pleaseReport");
    }
  },
  /**
   * AddressBook.checkList
   * Checks the validity of a mailing list and throws an error if it is invalid.
   * @param aCard        An object that should be a mailing list
   * @param aMethodName  The name of the method calling checkList (used when
   *                     throwing the error)
   */
  checkList: function(aList, aMethodName) {
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
  checkDirectory: function(aDirectory, aMethodName) {
    if (!this.isDirectoryValid(aDirectory))
      throw "Invalid Directory: " + aDirectory + " sent to the '" + aMethodName
            + "' method" +  StringBundle.getStr("pleaseReport");
  },
  /**
   * AddressBook.checkDirectory
   * Checks the validity of a directory and returns false if it is invalid.
   * @param aDirectory The directory to check.
   */
  isDirectoryValid: function(aDirectory) {
    return aDirectory && aDirectory instanceof Ci.nsIAbDirectory 
          && aDirectory.dirName != "";
  },
  /**
   * AddressBook.getCardValue
   * Returns the value of the specifiec property in the given card, or throws an
   * error if it is not present or blank.
   * @param aCard     The card to get the value from.
   * @param aAttrName The name of the attribute to get.
   */
   getCardValue: function(aCard, aAttrName) {
     this.checkCard(aCard, "getCardValue");
     if (this.mBug413260) // if the patch for Bug 413260 is applied
       return aCard.getProperty(aAttrName, null);
     else {
       if (aAttrName == "LastModifiedDate")
         return aCard.lastModifiedDate; // workaround for lastModifiedDate bug
       var value;
       if (this.isRegularAttribute(aAttrName))
         try { return aCard.getCardValue(aAttrName); }
         catch (e) { LOGGER.LOG_WARNING("Error in getCardValue: " + e); }
       else if (aCard instanceof Ci.nsIAbMDBCard)
         return this.getMDBCardValue(aCard, aAttrName);
       else
         LOGGER.LOG_WARNING("Couldn't get the value " + aAttrName + " of the card "
                            + aCard);
     }
   },
  /**
   * AddressBook.getCardValue
   * Sets the value of the specifiec property in the given card but does not
   * update the card in the database.
   * @param aCard     The card to get the value from.
   * @param aAttrName The name of the attribute to set.
   * @param aValue    The value to set for the attribute.
   */
   setCardValue: function(aCard, aAttrName, aValue) {
     this.checkCard(aCard, "setCardValue");
     if (!aValue)
       aValue = "";
     if (this.mBug413260) { // if the patch for Bug 413260 is applied
       if (aAttrName == "PreferMailFormat") {
         switch (aValue) {
           case "plaintext":
           case "text":
           case "1":
             aValue = 1;
             break;
           case "html":
           case "2":
             aValue = 2;
             break;
           default: // if it is anything else set as unknown
             aValue = 0;
         }
       }
       aCard.setProperty(aAttrName, aValue);
     }
     else {
       // workaround a last modified date bug
       if (aAttrName == "LastModifiedDate")
         try {
           if (aValue == "")
             aValue = 0;
           aCard.lastModifiedDate = aValue;
         } catch(e) { LOGGER.LOG_WARNING("Invalid lastModifiedDate"); }
       else if (aAttrName == "AllowRemoteContent") {
         // AllowRemoteContent may be 1/0 if the patch or true/false otherwise
         var value = aValue == "1" || (aValue != "0" && aValue);
         aCard.allowRemoteContent = value;
       }
       else if (aAttrName == "PreferMailFormat") {
         // can be a 0/1/2 or unknown/plaintext/html
         var value;
         switch (aValue) {
           case "plaintext":
           case "text":
           case "1":
             value = 1;
             break;
           case "html":
           case "2":
             value = 2;
             break;
           default: // if it is anything else set as unknown
             value = 0;
         }
         aCard.preferMailFormat = value;
       }
       else if (this.isRegularAttribute(aAttrName))
         try { aCard.setCardValue(aAttrName, aValue); }
         catch (e) { LOGGER.LOG_WARNING("Error in setCardValue: " + e); }
      else if (aCard instanceof Ci.nsIAbMDBCard)
         this.setMDBCardValue(aCard, aAttrName, aValue);
      else
        LOGGER.LOG_WARNING("Couldn't set the value " + aAttrName + " of the card "
                           + aCard);
     }
   },
   /**
    * AddressBook.setMDBCardValue
    * Sets the requested value of an MDB card's attribute.  Performs a
    * QueryInterface if necessary.
    * @param aCard     The MDB card to set the value for.
    * @param aAttrName The name of the attribute whose value is set.
    * @param aValue    The value to set for aAttrName.
    */
   setMDBCardValue: function(aCard, aAttrName, aValue) {
     try {
       aCard.setStringAttribute(aAttrName, aValue);
     }
     catch(e) {
       LOGGER.LOG_WARNING("Error in setMDBCardValue: " + e + "\n" + aAttrName +
                          "\n" + aValue);
     }
   },
   /**
    * AddressBook.getMDBCardValue
    * Returns the requested value of an MDB card's attribute.  Performs a
    * QueryInterface if necessary.
    * @param aCard     The MDB card to get the value from.
    * @param aAttrName The name of the attribute whose value is returned.
    * @return The value of aCard's attribute aAttrName.
    */
   getMDBCardValue: function(aCard, aAttrName) {
     try {
       return aCard.getStringAttribute(aAttrName);
     }
     catch(e) {
       LOGGER.LOG_WARNING("Error in getMDBCardValue: " + e + "\n" + aAttrName);
     }
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
  hasAddress: function(aCard, aPrefix) {
    this.checkCard(aCard, "hasAddress");
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
  makeCard: function() {
    return Cc["@mozilla.org/addressbook/cardproperty;1"]
           .createInstance(Ci.nsIAbCard);
  },
  /**
   * AddressBook.isRegularAttribute
   * Returns true if the given attribute is able to be set/obtained through the
   * setCardValue and getCardValue functions of nsIAbCard.
   * @param aAttribute The attribute to check.
   * @return True if aAttribute is usable with set/getCardValue.
   */
  isRegularAttribute: function(aAttribute) {
    return this.mBasicAttributes.indexOf(aAttribute) != -1;
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
  equals: function(aOtherDir) {
    // return false if the directory isn't valid
    if (!this.isDirectoryValid(aOtherDir))
      return false;
    // compare the URIs
    if (this.mDirectory.URI)
      return this.mDirectory.URI == aOtherDir.URI;
    return this.mDirectory.getDirUri() == aOtherDir.getDirUri();
  }
};
