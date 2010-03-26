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

/**
 * AbManager
 * An object that can obtain address books by the name or URI, find the synced
 * address books, and edit cards.
 * @class
 */
var AbManager = {
  mVersion: Cc["@mozilla.org/abmanager;1"] ? 3 : 2,
  mBug413260: Cc["@mozilla.org/addressbook/cardproperty;1"]
              .createInstance(nsIAbCard)
              .getProperty ? true : false,
  // attributes that can be set by getCardValue and setCardValue
  mBasicAttributes: [
    "DisplayName", "Notes", "CellularNumber", "HomePhone", "WorkPhone",
    "PagerNumber", "FaxNumber", "_AimScreenName", "PrimaryEmail", "SecondEmail",
    "Company", "JobTitle", "HomeAddress", "WorkAddress", "NickName", "LastName",
    "FirstName", "HomeAddress2", "HomeCity", "HomeState", "HomeZipCode",
    "HomeCountry", "WorkAddress2", "WorkCity", "WorkState", "WorkZipCode",
    "WorkCountry", "WebPage1", "WebPage2", "Department", "Custom1", "Custom2",
    "Custom3", "Custom4", "WorkPhoneType", "HomePhoneType", "CellularNumberType",
    "FaxNumberType", "PagerNumberType"],
  /**
   * AbManager.isRegularAttribute
   * Returns true if the given attribute is able to be set/obtained through the
   * setCardValue and getCardValue functions of nsIAbCard.
   * @param aAttribute The attribute to check.
   * @return True if aAttribute is usable with set/getCardValue.
   */
  isRegularAttribute: function AbManager_isRegularAttribute(aAttribute) {
    return this.mBasicAttributes.indexOf(aAttribute) != -1;
  },
  getSyncedAddressBooks: function AbManager_getSyncedAddressBooks(aMakeArray) {
    this.mAddressBooks = {};
    var iter;
    if (this.mVersion == 3) { // TB 3
      var abManager = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager);
      iter = abManager.directories;
    }
    else { // TB 2
      // obtain the main directory through the RDF service
      var dir = Cc["@mozilla.org/rdf/rdf-service;1"]
                 .getService(Ci.nsIRDFService)
                 .GetResource("moz-abdirectory://")
                 .QueryInterface(Ci.nsIAbDirectory);
      iter = dir.childNodes;
    }
    var data;
    while(iter.hasMoreElements()) {
      data = iter.getNext();
      if (data instanceof Ci.nsIAbDirectory && (this.mVersion == 3 ||
          data instanceof Ci.nsIAbMDBDirectory)) {
        var ab = new AddressBook(data);
        var username = ab.getUsername();
        if (username && username != "") {
          if (!this.mAddressBooks[username])
            this.mAddressBooks[username] = {
              primary: {},
              secondary: []
            };
          var primary = ab.getPrimary();
          if (primary)
            this.mAddressBooks[username].primary = ab;
          else
            this.mAddressBooks[username].secondary.push(ab);
        }
      }
    }
    if (!aMakeArray)
      return this.mAddressBooks;
    // now convert to an array
    var arr = [];
    for (var i in this.mAddressBooks) {
      arr.push({
        username: i,
        primary: this.mAddressBooks[i].primary,
        secondary: this.mAddressBooks[i].secondary
      });
    }
    return arr;
  },
  /**
   * AbManager.checkDirectory
   * Checks the validity of a directory and returns false if it is invalid.
   * @param aDirectory The directory to check.
   */
  isDirectoryValid: function AbManager_isDirectoryValid(aDirectory) {
    return aDirectory && aDirectory instanceof Ci.nsIAbDirectory 
          && aDirectory.dirName != "";
  },
  /**
   * AbManager.checkCard
   * Checks the validity of a card and throws an error if the card is invalid.
   * @param aCard        An object that should be an instance of nsIAbCard
   * @param aMethodName  The name of the method calling checkCard (used when
   *                     throwing the error)
   */
  checkCard: function AbManager_checkCard(aCard, aMethodName) {
    var card = aCard && aCard.mCard ? aCard.mCard : aCard;
    if (!card || (!(card instanceof Ci.nsIAbCard) &&
                  !(Ci.nsIAbMDBCard && card instanceof Ci.nsIAbMDBCard))) {
      throw "Invalid card: " + aCard + "passed to the '" + aMethodName +
            "' method." + StringBundle.getStr("pleaseReport");
    }
  },
  /**
   * AbManager.getCardValue
   * Returns the value of the specifiec property in the given card, or throws an
   * error if it is not present or blank.
   * @param aCard     The card to get the value from.
   * @param aAttrName The name of the attribute to get.
   */
  getCardValue: function AbManager_getCardValue(aCard, aAttrName) {
    this.checkCard(aCard, "getCardValue");
    var value;
    if (this.mBug413260) // if the patch for Bug 413260 is applied
      value = aCard.getProperty(aAttrName, null);
    else {
      if (aAttrName == "LastModifiedDate")
        return aCard.lastModifiedDate; // workaround for lastModifiedDate bug
      if (this.isRegularAttribute(aAttrName))
        try { value = aCard.getCardValue(aAttrName); }
        catch (e) { LOGGER.LOG_WARNING("Error in getCardValue: " + e); }
      else if (Ci.nsIAbMDBCard && aCard instanceof Ci.nsIAbMDBCard)
        value = this.getMDBCardValue(aCard, aAttrName);
      else
        LOGGER.LOG_WARNING("Couldn't get the value " + aAttrName + " of the card "
                           + aCard);
    }
    // make sure the GoogleID always uses HTTPS
    if (aAttrName == "GoogleID")
      value = gCS_fixURL(value);
    return value;
  },
  /**
   * AbManager.getCardEmailAddresses
   * Returns an object with a property for each of the e-mail addresses of this
   * card as recognized by gContactSync (PrimaryEmail, SecondEmail, ThirdEmail,
   * and FourthEmail)
   * @param aCard The card from which the e-mail addresses are obtained.
   * @return An object with the card's e-mail addresses.
   */
  getCardEmailAddresses: function AbManager_getCardEmailAddresses(aCard) {
    this.checkCard(aCard, "getCardEmailAddresses");
    var primaryEmail = this.getCardValue(aCard, "PrimaryEmail");
    var addresses = [];
    if (primaryEmail)
      addresses[primaryEmail] = true;
    var secondEmail = this.getCardValue(aCard, "SecondEmail");
    if (secondEmail)
      addresses[secondEmail] = true;
    var thirdEmail = this.getCardValue(aCard, "ThirdEmail");
    if (thirdEmail)
      addresses[thirdEmail] = true;
    var fourthEmail = this.getCardValue(aCard, "FourthEmail");
    if (fourthEmail)
      addresses[fourthEmail] = true;
    return addresses;
  },
  /**
   * AbManager.getCardEmailAddresses
   * Returns an object with a property for each of the e-mail addresses of this
   * card as recognized by gContactSync (PrimaryEmail, SecondEmail, ThirdEmail,
   * and FourthEmail)
   * @param aCard      The card from which the e-mail addresses are obtained.
   * @param aAddresses An object with the card's e-mail addresses as returned by
   *                   AbManager.getCardEmailAddresses
   * @return True if the card has at least one e-mail address in common with
   *         aAddresses
   */
  cardHasEmailAddress: function AbManager_cardHasEmailAddress(aCard, aAddresses) {
    this.checkCard(aCard, "getCardEmailAddresses");
    if (!aAddresses)
      return false;
    var cardAddresses = this.getCardEmailAddresses(aCard);
    for (var i in cardAddresses) {
      if (aAddresses[i])
        return true;
    }
    return false;
  },
  /**
   * AbManager.getCardValue
   * Sets the value of the specifiec property in the given card but does not
   * update the card in the database.
   * @param aCard     The card to get the value from.
   * @param aAttrName The name of the attribute to set.
   * @param aValue    The value to set for the attribute.
   */
  setCardValue: function AbManager_setCardValue(aCard, aAttrName, aValue) {
    this.checkCard(aCard, "setCardValue");
    if (!aValue)
      aValue = "";
    // make sure the last modified date is in milliseconds since 1/1/1970 UTC
    // and not in microseconds
    if (aAttrName == "LastModifiedDate" && parseInt(aValue) > 2147483647) {
      LOGGER.LOG_WARNING("Had to adjust last modified date from " + aValue);
      aValue = aValue/1000;
    }
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
     else if (Ci.nsIAbMDBCard && aCard instanceof Ci.nsIAbMDBCard)
        this.setMDBCardValue(aCard, aAttrName, aValue);
     else
       LOGGER.LOG_WARNING("Couldn't set the value " + aAttrName + " of the card "
                          + aCard);
    }
  },
  /**
    * AbManager.setMDBCardValue
    * Sets the requested value of an MDB card's attribute.  Performs a
    * QueryInterface if necessary.
    * @param aCard     The MDB card to set the value for.
    * @param aAttrName The name of the attribute whose value is set.
    * @param aValue    The value to set for aAttrName.
    */
  setMDBCardValue: function AbManager_setMDBCardValue(aCard, aAttrName, aValue) {
    try {
      aCard.setStringAttribute(aAttrName, aValue);
    }
    catch(e) {
      LOGGER.LOG_WARNING("Error in setMDBCardValue: " + e + "\n" + aAttrName +
                         "\n" + aValue);
    }
  },
  /**
   * AbManager.getMDBCardValue
   * Returns the requested value of an MDB card's attribute.  Performs a
   * QueryInterface if necessary.
   * @param aCard     The MDB card to get the value from.
   * @param aAttrName The name of the attribute whose value is returned.
   * @return The value of aCard's attribute aAttrName.
   */
  getMDBCardValue: function AbManager_getMDBCardValue(aCard, aAttrName) {
    try {
      return aCard.getStringAttribute(aAttrName);
    }
    catch(e) {
      LOGGER.LOG_WARNING("Error in getMDBCardValue: " + e + "\n" + aAttrName);
    }
  },
  /**
   * AbManager.getAbByURI
   * Returns the address book with the given URI, if found.  Does not attempt
   * to make a new address book if not found and returns null.
   * @return  The Address Book with the given URI
   */
  getAbByURI: function AbManager_getAbByURI(aURI) {
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
    catch(e) { LOGGER.LOG_ERROR("Error in getAbByURI", e); }
  },
  /**
   * AbManager.getAbByName
   * Returns the Address Book if it can be found.  If it cannot be found
   * it tries once to make it and return the newly made address book.
   * @param aDirName    The name of the address book
   * @param aDontMakeAb True if the address book shouldn't be created if not
   *                    found. 
   * @return            The Address Book with the name given
   */
  getAbByName: function AbManager_getAbByName(aDirName, aDontMakeAb) {
    if (!aDirName || aDirName.length == 0)
      throw "Invalid aDirName passed to the 'getAbByName' method." +
            StringBundle.getStr("pleaseReport");
    var iter, data;
    if (this.mVersion == 3) { // TB 3
      var abManager = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager);
      iter = abManager.directories;
    }
    else { // TB 2
      // obtain the main directory through the RDF service
      var dir = Cc["@mozilla.org/rdf/rdf-service;1"]
                 .getService(Ci.nsIRDFService)
                 .GetResource("moz-abdirectory://")
                 .QueryInterface(Ci.nsIAbDirectory);
      iter = dir.childNodes;
    }
    while(iter.hasMoreElements()) {
      data = iter.getNext();
      if (data instanceof Ci.nsIAbDirectory)
        if (data.dirName == aDirName)
          return data;
    }
    if (aDontMakeAb)
      return;
    // the AB doesn't exist, so make one:
    if (this.mVersion == 3) { // TB 3
      abManager.newAddressBook(aDirName, "moz-abmdbdirectory://", 2);
      iter = abManager.directories;
    }
    else {
      // setup the "properties" of the new address book
      var properties = Cc["@mozilla.org/addressbook/properties;1"]
	                   .createInstance(Ci.nsIAbDirectoryProperties);
	    properties.description = aDirName;
	    properties.dirType = 2; // address book
      dir.createNewDirectory(properties);
      iter = dir.childNodes;
    }
    while(iter.hasMoreElements()) {
      data = iter.getNext();
      if (data instanceof Ci.nsIAbDirectory)
        if (data.dirName == aDirName) {
          var ab = new AddressBook(data);
          ab.setLastSyncDate(0);
          return data;
        }
    }// end of while loop
    return null;
  }
}
