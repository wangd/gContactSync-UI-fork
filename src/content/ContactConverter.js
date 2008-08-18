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
 * ContactConverter
 * Converts contacts between Thunderbird's format (a 'card') and the Atom/XML
 * representation of a contact.  Must be initialized before the first use by
 * calling the init() function.
 * NOTE: The first 6 screennames of a contact from Google are stored as:
 * _AimScreenName, TalkScreenName, ICQScreenName, YahooScreenName, MSNScreenName
 * and JabberScreenName for compatibility with gContactSync 0.1b1 and the
 * default type for those textboxes.
 * @class
 */
var ContactConverter = {
  // two namespaces
  GD: {},
  ATOM: {},
  mCurrentCard: {},
  mConverterArr: [],
  // extra attributes added by this extension.  Doesn't include GoogleID or any
  // of the URLs.  Should be obtained w/ ContactConverter.getExtraSyncAttributes
  mAddedAttributes: [
    "OtherAddress", "ThirdEmail", "FourthEmail", "TalkScreenName",
    "JabberScreenName", "YahooScreenName", "MSNScreenName", "ICQScreenName",
    "HomeFaxNumber", "OtherNumber", "FullHomeAddress", "FullWorkAddress",
    "PrimaryEmailType", "SecondEmailType", "_AimScreenNameType"],
  mInitialized: false,
  /**
   * ContactConverter.init
   * Initializes this object by populating the array of ConverterElement
   * objects and the two namespaces most commonly used by this object.
   */
  init: function() {
    this.GD = gdata.namespaces.GD;
    this.ATOM = gdata.namespaces.ATOM;
    // ConverterElement(aElement, aTbName, aIndex, aType)
    this.mConverterArr = [
      // general
      new ConverterElement("title", "DisplayName", 0),
      new ConverterElement("notes", "Notes", 0),
      new ConverterElement("id", "GoogleID", 0),
      new ConverterElement("postalAddress", "OtherAddress", 0, "other"),
      // e-mail addresses
      new ConverterElement("email", "PrimaryEmail", 0, "other"),
      new ConverterElement("email", "SecondEmail", 1, "other"),
      new ConverterElement("email", "ThirdEmail", 2, "other"),
      new ConverterElement("email", "FourthEmail", 3, "other"),
      // IM screennames
      new ConverterElement("im", "_AimScreenName", 0, "AIM"),
      new ConverterElement("im", "TalkScreenName", 1, "GOOGLE_TALK"),
      new ConverterElement("im", "ICQScreenName", 2, "ICQ"),
      new ConverterElement("im", "YahooScreenName", 3, "YAHOO"),
      new ConverterElement("im", "MSNScreenName", 4, "MSN"),
      new ConverterElement("im", "JabberScreenName", 5, "JABBER"),
      // the phone numbers
      new ConverterElement("phoneNumber", "HomePhone", 0, "home"),
      new ConverterElement("phoneNumber", "WorkPhone", 0, "work"),
      new ConverterElement("phoneNumber", "CellularNumber", 0, "mobile"),
      new ConverterElement("phoneNumber", "PagerNumber", 0, "pager"),
      new ConverterElement("phoneNumber", "FaxNumber", 0, "work_fax"),
      new ConverterElement("phoneNumber", "HomeFaxNumber", 0, "home_fax"),
      new ConverterElement("phoneNumber", "OtherNumber", 0, "other"),
      // company info
      new ConverterElement("orgTitle", "JobTitle", 0),
      new ConverterElement("orgName", "Company", 0),
      // the URLs from Google - Photo, Self, and Edit
      new ConverterElement("PhotoURL", "PhotoURL", 0),
      new ConverterElement("SelfURL", "SelfURL", 0),
      new ConverterElement("EditURL", "EditURL", 0),
      // the new address fields
      new ConverterElement("postalAddress", "FullHomeAddress", 0, "home"),
      new ConverterElement("postalAddress", "FullWorkAddress", 0, "work"),
    ];
    this.mInitialized = true;
  },
  /**
   * ContactConverter.getAllSyncAttributes
   * Returns an array of all of the extra attributes synced by this extension.
   * @param aIncludeURLs Should be true if the URL-related attributes should be
   *                     returned.
   */
  getExtraSyncAttributes: function(aIncludeURLs) {
    var arr = this.mAddedAttributes;
    if (aIncludeURLs)
      arr = arr.concat("PhotoURL", "SelfURL", "EditURL", "GoogleID");
    return arr;
  },
  /**
   * ContactConverter.cardToAtomXML
   * Updates or creates a GContact object's Atom/XML representation using its 
   * complementary Address Book card.
   * @param aCard    The address book card used to update the Atom feed.
   * @param aContact Optional. The GContact object with the Atom/XML
   *                 representation of the contact, if it exists.  If not
   *                 supplied, a contact and feed will be created.
   * @return A GContact object with the Atom feed for the contact.
   */
  cardToAtomXML: function(aCard, aContact) {
    if (!aContact)
      aContact = new GContact();
    var ab = Overlay.mAddressBook;
    ab.checkCard(aCard, "cardToAtomXML");
    this.mCurrentCard = aCard;
    // use the address with multiple lines instead of the 6 fields
    // if the full address doesn't exist, but the card has at least 1 of the
    // fields convert those to the full address
    this.fixAddress(aCard, "Home");
    this.fixAddress(aCard, "Work");
    var arr = this.mConverterArr;
    // set the regular properties from the array mConverterArr
    for (var i = 0, length = arr.length; i < length; i++) {
      // skip the URLs
      if (arr[i].tbName.indexOf("URL") != -1 || arr[i].tbName == "GoogleID")
        continue;
      var obj = arr[i];
      LOGGER.VERBOSE_LOG(obj.tbName);
      var value = ab.getCardValue(aCard, obj.tbName);
      // for the type, get the type from the card, or use its default
      var type = ab.getCardValue(aCard, obj.tbName + "Type");
      if (!type || type == "")
        type = obj.type;
      LOGGER.VERBOSE_LOG(value + " type: " + type);
      aContact.setValue(obj.elementName, obj.index, type, value);
    }
    // set the extended properties
    aContact.removeExtendedProperties();
    arr = Preferences.mExtendedProperties;
    for (var i = 0, length = arr.length; i < length; i++) {
      var value = ab.getCardValue(aCard, arr[i]);
      aContact.setExtendedProperty(arr[i], value);
    }
    if (Preferences.mSyncPrefs.syncGroups.value) {
      // set the groups
      var groups = [];
      for (var i in Sync.mLists) {
        var list = Sync.mLists[i];
        if (list.hasCard(aCard))
          groups.push(i);
      }
      aContact.setGroups(groups);
    }
    // cleanup
    aContact.removeElements();
    return aContact;
  },
  /**
   * Converts an GContact's Atom/XML representation of a contact to
   * Thunderbird's address book card format.
   * @param aContact A GContact object with the contact to convert.
   * @param aCard Optional.  An existing card that can be QueryInterfaced to
   *              Components.interfaces.nsIAbMDBCard if this is before 413260
   * @return An nsIAbCard of the contact.
   */
  makeCard: function(aContact, aCard) {
    if (!aContact)
      throw "Invalid aXml parameter supplied to the 'makeCard' method" +
            StringBundle.getStr("pleaseReport");
    var ab = Overlay.mAddressBook;
    var card;
    if (aCard)
      card = aCard;
    else
      card = ab.addCard(ab.makeCard());
    var arr = this.mConverterArr;
    // get the regular properties from the array mConverterArr
    for (var i = 0, length = arr.length; i < length; i++) {
      var obj = arr[i];
      LOGGER.VERBOSE_LOG(obj.tbName);
      var property = aContact.getValue(obj.elementName, obj.index, obj.type);
      property = property ? property : new Property("", "");
      LOGGER.VERBOSE_LOG(property.value + " - " + property.type);
      ab.setCardValue(card, obj.tbName, property.value);
      // set the type
      ab.setCardValue(card, obj.tbName + "Type", property.type);
    }
    // get the extended properties
    arr = Preferences.mExtendedProperties;
    for (var i = 0, length = arr.length; i < length; i++) {
      var value = aContact.getExtendedProperty(arr[i]);
      value = value ? value.value : null;
      ab.setCardValue(card, arr[i], value);
    }
    ab.updateCard(card);
    if (Preferences.mSyncPrefs.syncGroups.value) {
      // get the groups after updating the card
      var groups = aContact.getValue("groupMembershipInfo");
      var lists = Sync.mLists;
      for (var i in lists) {
        var group = groups[i];
        var list = lists[i];
        // delete the card from the list, if necessary
        if (list.hasCard(card)) {
          if (!group)
            list.deleteCards([card]);
        }
        // add the card to the list, if necessary
        else if (group)
          list.addCard(card);
      }
    }
  },
  /**
   * ContactConverter.fixAddress
   * Fixes the address with the given prefix (Home or Work) and combines the
   * 6 address fields: Address Line 1, Address Line 2, City, State, Zip Code,
   * and Country into a field that allows multiple lines.
   * @param aCard   The card with the address to fix.
   * @param aPrefix The prefix (Home or Work)
   */
  fixAddress: function(aCard, aPrefix) {
    if (!aCard || !aPrefix || (aPrefix != "Home" && aPrefix != "Work"))
      return;
    var ab = Overlay.mAddressBook;
    // if there isn't a value in the Full (multi-lined address) then create one
    // from the existing address, if present
    if (!ab.getCardValue(aCard, "Full" + aPrefix + "Address") &&
        ab.hasAddress(aCard, aPrefix)) {
      // get the current info
      var address1 = ab.getCardValue(aCard, aPrefix + "Address");
      var address2 = ab.getCardValue(aCard, aPrefix + "Address2");
      var city = ab.getCardValue(aCard, aPrefix + "City");
      var state = ab.getCardValue(aCard, aPrefix + "State");
      var zip = ab.getCardValue(aCard, aPrefix + "ZipCode");
      var country = ab.getCardValue(aCard, aPrefix + "Country");
      // form the new address from the old
      var newAddress = "";
      if (address1)
        newAddress = address1;
      if (address2)
        newAddress += "\n" + address2;
      if (city) {
        if (newAddress != "")
          newAddress += "\n";
        newAddress += city;
        if (state)
          newAddress += " " + state;
        if (zip)
          newAddress += "  " + zip;
      }
      else if (state) {
        if (newAddress != "")
          newAddress += "\n";
        newAddress += state;
        if (zip)
          newAddress += "  " + zip;
      }
      else if (zip) {
        if (newAddress != "")
          newAddress += "\n";
        newAddress += zip;
      }
      if (country) {
        if (newAddress != "")
          newAddress += "\n"
        newAddress += country;
      }
      // set the attribute and update the card
      ab.setCardValue(aCard, "Full" + aPrefix + "Address", newAddress);
      // clear the old attributes (so an address can be removed)
      if (Preferences.mSyncPrefs.removeOldAddresses.value) {
        var arr = ["Address", "Address2", "City", "State", "ZipCode", "Country"];
        for (var i = 0, length = arr.length; i < length; i++)
          ab.setCardValue(aCard, aPrefix + arr[i], "");
      }
      ab.updateCard(aCard);
    }
  },
  /**
   * ContactConverter.compareContacts
   * Compares two contacts and returns true if they share at least one e-mail
   * address.
   * @param aCard    The nsIAbCard to compare.
   * @param aContact A GContact element containing the Google contact to compare.
   * @return True if the contacts share at least one e-mail address.
   */
  compareContacts: function(aCard, aContact) {
    if (!aContact || !aContact.xml || !aContact.xml.getElementsByTagNameNS)
      return false;
    var ab = Overlay.mAddressBook;
    ab.checkCard(aCard, "compareContacts");
    // get all of the address from the google contact
    var googleAddresses = aContact.xml
                                  .getElementsByTagNameNS(gdata.namespaces.GD.url,
                                                          'email');
    // and from the Thunderbird card as an object with the e-mail addresses
    // as the names of properties whose values are set as the boolean value true
    var tbAddresses = {};
    var primaryEmail = ab.getCardValue(aCard, "PrimaryEmail");
    if (primaryEmail)
      tbAddresses[primaryEmail] = true;
    var secondEmail = ab.getCardValue(aCard, "SecondEmail");
    if (secondEmail)
      tbAddresses[secondEmail] = true;
    var thirdEmail = ab.getCardValue(aCard, "ThirdEmail");
    if (thirdEmail)
      tbAddresses[thirdEmail] = true;
    var fourthEmail = ab.getCardValue(aCard, "FourthEmail");
    if (fourthEmail)
      tbAddresses[fourthEmail] = true;

    // then check for duplicate e-mail addresses
    var toReturn = false;
    for (var i = 0, length = googleAddresses.length; i < length && !toReturn; i++) {
      var emailAddress;
      if (googleAddresses[i] && googleAddresses[i].getAttribute)
        emailAddress = googleAddresses[i].getAttribute("address");
      if (!emailAddress)
        continue;
      toReturn = toReturn || tbAddresses[emailAddress];
    }
    return toReturn;
  }
};
