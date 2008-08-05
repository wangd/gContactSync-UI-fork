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
  if (Cc["@mozilla.org/abmanager;1"])
    this.mVersion = 3;
  else
    this.mVersion = 2;

  if (aURI)
    this.mDirectory = this.getAbByURI(aURI);
  else if (aName)
    this.mDirectory = this.getAbByName(aName);
  else
    throw StringBundle.getStr("error") + "aURI" + StringBundle.getStr("suppliedTo") +
          "AddressBook constructor" + StringBundle.getStr("errorEnd");
  if (!this.isDirectoryValid(this.mDirectory))
    throw StringBundle.getStr("error") + "aURI" + StringBundle.getStr("suppliedTo") +
          "AddressBook constructor" + StringBundle.getStr("errorEnd");
  this.mURI = this.mDirectory.URI;
  var card = Cc["@mozilla.org/addressbook/cardproperty;1"]
              .createInstance(nsIAbCard);
  this.mBug413260 = card.getProperty ? true : false;
}

AddressBook.prototype = {
  mCurrentCard: {},
  mBug413260: null,
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
   * Adds the card to this address book 
   * @param aCard      The card to add
   */
  addCard: function(aCard) {
    this.checkCard(aCard, "addCardTo");
    this.checkDirectory(this.mDirectory, "addCard");
    return this.mDirectory.addCard(aCard);
  },
  /**
   * AddressBook.getAbByURI
   * Returns the address book with the given URI, if found.  Does not attempt
   * to make a new address book if not found and returns null.
   * @return  The Address Book with the given URI
   */
  getAbByURI: function(aURI) {
    if (!aURI)
      throw StringBundle.getStr("error") + "aURI" + StringBundle.getStr("suppliedTo") +
            "getAbByURI" + StringBundle.getStr("errorEnd");
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
    catch(e) { LOGGER.VERBOSE_LOG("Error in getAbByURI: " + e); }
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
      throw StringBundle.getStr("error") + "aDirName" + StringBundle.getStr("suppliedTo") +
            "getAbByName" + StringBundle.getStr("errorEnd");

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
      // write a blank sync file to reset last sync date
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
   * Gets all the Cards in the Address Book
   * @return   An array of the nsIAbCards in the book
   */
  getAllCards: function() {
    this.checkDirectory(this.mDirectory, "getAllCards");
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
  getListByDesc: function(aDescription) {
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
  addList: function(aName, aDescription) {
    if (!aName)
      throw "Error - aName sent to addList is invalid";
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
    this.checkDirectory(this.mDirectory, "deleteAbCard");
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
      throw StringBundle.getStr("invalidCard") + aMethodName +
            StringBundle.getStr("errorEnd");
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
      throw StringBundle.getStr("invalidList") + aMethodName +
            StringBundle.getStr("errorEnd");
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
      throw StringBundle.getStr("invalidBook") + aMethodName +
            StringBundle.getStr("Overlay.mErrors.errorEnd");
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
       else
         return this.getMDBCardValue(aCard, aAttrName);
     }
   },
  /**
   * AddressBook.getCardValue
   * Sets the value of the specifiec property in the given card.  If the patch
   * for Bug 413260 isn't applied setting values for unexisting properties will
   * not set a new property.
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
      else
         this.setMDBCardValue(aCard, aAttrName, aValue);
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
       if (!(aCard instanceof Ci.nsIAbMDBCard))
         aCard.QueryInterface(Ci.nsIAbMDBCard);
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
       if (!(aCard instanceof Ci.nsIAbMDBCard))
         aCard.QueryInterface(Ci.nsIAbMDBCard);
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
   * @return A new instance of nsIAbCard.
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
  }
};
