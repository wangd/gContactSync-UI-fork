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
var ContactConverter = {
  GD: {},
  ATOM: {},
  mConverterArr: [],
  // extra attributes added by this extension.  Doesn't include GoogleID or any
  // of the URLs
  mAddedAttributes: [
    "OtherAddress", "ThirdEmail", "FourthEmail", "TalkScreenName",
    "JabberScreenName", "YahooScreenName", "MSNScreenName", "ICQScreenName",
    "HomeFaxNumber", "OtherNumber", "FullHomeAddress", "FullWorkAddress"],
  mInitialized: false,
  init: function() {
    this.GD = gdata.namespaces.GD;
    this.ATOM = gdata.namespaces.ATOM;
    // function ConverterElement(aElement, aTbName, aIndex, aType)
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
      // IM
      new ConverterElement("im", "_AimScreenName", 0, "AIM"),
      new ConverterElement("im", "TalkScreenName", 0, "GOOGLE_TALK"),
      new ConverterElement("im", "JabberScreenName", 0, "JABBER"),
      new ConverterElement("im", "YahooScreenName", 0, "YAHOO"),
      new ConverterElement("im", "MSNScreenName", 0, "MSN"),
      new ConverterElement("im", "ICQScreenName", 0, "ICQ"),
      // the phone numbers
      new ConverterElement("phoneNumber", "HomePhone", 0, "home"),
      new ConverterElement("phoneNumber", "WorkPhone", 0, "work"),
      new ConverterElement("phoneNumber", "CellularNumber", 0, "mobile"),
      new ConverterElement("phoneNumber", "PagerNumber", 0, "pager"),
      new ConverterElement("phoneNumber", "FaxNumber", 0, "work_fax"),
      new ConverterElement("phoneNumber", "HomeFaxNumber", 0, "home_fax"),
      new ConverterElement("phoneNumber", "OtherNumber", 0, "other"),
      // company info
      new ConverterElement("orgTitle", "Company", 0),
      new ConverterElement("orgName", "JobTitle", 0),
      // "PhotoURL", "SelfURL", "EditURL"
      new ConverterElement("PhotoURL", "PhotoURL", 0),
      new ConverterElement("SelfURL", "SelfURL", 0),
      new ConverterElement("EditURL", "EditURL", 0),
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
   * Updates or creates a Google contact using its complementary Address Book
   * card.
   * @param aCard   The address book card used to update the Atom feed.
   * @param aXml    Optional. The Atom/XML representation of the contact, if
   *                it exists.
   * @return The contact as a serialized string of a card's Atom/XML representation.
   */
  cardToAtomXML: function(aCard, aContact) {
    if (!aContact)
      aContact = new GContact();
    var ab = Overlay.mAddressBook;
    ab.checkCard(aCard, "cardToAtomXML");
    ab.mCurrentCard = aCard;
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
      LOGGER.VERBOSE_LOG(value);
      aContact.setValue(obj.elementName, obj.index, obj.type, value);
    }
    // set the extended properties
    aContact.removeExtendedProperties();
    arr = Preferences.mExtendedProperties;
    for (var i = 0, length = arr.length; i < length; i++) {
      var value = ab.getCardValue(aCard, arr[i]);
      aContact.setExtendedProperty(arr[i], value);
    }
    // set the groups
    var groups = [];
    for (var i in Sync.mLists) {
      var list = Sync.mLists[i];
      if (list.hasCard(aCard))
        groups.push(i);
    }
    aContact.setGroups(groups);
    // cleanup
    aContact.removeElements();
    return aContact;
  },
  /**
   * Converts an Atom/XML representation of a contact to Thunderbird's nsIAbCard
   * object.
   * @param aContact  
   * @param aCard Optional.  An existing card that can be QueryInterfaced to
   *              Components.interfaces.nsIAbMDBCard if this is before 413260
   * @return    An nsIAbCard of the contact.
   */
  makeCard: function(aContact, aCard) {
    if (!aContact)
      throw StringBundle.getStr("error") + "aXml" +
            StringBundle.getStr("suppliedTo") +
           "makeCard" + StringBundle.getStr("errorEnd");
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
      var value = aContact.getValue(obj.elementName, obj.index, obj.type);
      LOGGER.VERBOSE_LOG(value);
      ab.setCardValue(card, obj.tbName, value);
    }
    // get the extended properties
    arr = Preferences.mExtendedProperties;
    for (var i = 0, length = arr.length; i < length; i++) {
      var value = aContact.getExtendedProperty(arr[i]);
      ab.setCardValue(card, arr[i], value);
    }

    ab.updateCard(card);
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
  },
  /**
   * ContactConverter.fixAddress
   * Fixes the address with the given prefix (Home or Work) and combines the
   * 6 address fields: Address Line 1, Address Line 2, City, State, Zip Code
   * Country into the field that allows multiple lines.
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
      // form the new address
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
      var arr = ["Address", "Address2", "City", "State", "ZipCode", "Country"];
      for (var i = 0, length = arr.length; i < length; i++)
        ab.setCardValue(aCard, aPrefix + arr[i], "");
      ab.updateCard(aCard);
    }
  },
  /**
   * Compares two contacts and returns true if they are considered equal
   * @param aCard   The nsIAbCard to compare.
   * @param aContact The contact from Google to compare.
   * @return True if the contacts are the same.
   */
  compareContacts: function(aCard, aContact) {
    if (!aContact || !aContact.xml || !aContact.xml.getElementsByTagNameNS)
      return false;
    var ab = Overlay.mAddressBook;
    ab.checkCard(aCard, "compareContacts");
    // get all of the address from the google contact
    var googleAddresses = aContact.xml.getElementsByTagNameNS(gdata.namespaces.GD.url, 'email');
    
    // and from the Thunderbird card
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
    for (var i = 0, length = googleAddresses.length; i < length; i++) {
      var emailAddress;
      if (googleAddresses[i] && googleAddresses[i].getAttribute)
        emailAddress = googleAddresses[i].getAttribute("address");
      if (!emailAddress)
        continue;
      toReturn = toReturn || tbAddresses[emailAddress];
    }
    return toReturn;
  }
}
