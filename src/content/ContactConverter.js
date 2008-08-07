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
    // set the home and work addresses
    var address = this.encodeAddress(aCard, "Home");
    aContact.setValue("postalAddress", 0, "home", address);
    var address = this.encodeAddress(aCard, "Work");
    aContact.setValue("postalAddress", 0, "work", address);
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
   *              Components.interfaces.nsIAbMDBCard
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
      card = aCard;//this.clearCard(aCard);
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

    // get the home and work addresses
    card = this.decodeAddress(card, aContact.getValue("postalAddress", 0, "home"), "Home");
    card = this.decodeAddress(card, aContact.getValue("postalAddress", 0, "work"), "Work");

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
   * Compares two contacts and returns true if they are considered equal
   * @param aCard   The nsIAbCard to compare.
   * @param aContact The contact from Google to compare.
   * @return True if the contacts are the same.
   */
  compareContacts: function(aCard, aContact) {
    if (!aContact)
      return false;
    var ab = Overlay.mAddressBook;
    ab.checkCard(aCard, "compareContacts");
    var aEmail = aContact.xml.getElementsByTagNameNS(gdata.namespaces.GD.url, 'email');
    var email = aEmail[0] ? aEmail[0].getAttribute("address") : null;
    var email2 = aEmail[1] ? aEmail[1].getAttribute("address") : null;
    var primaryEmail = ab.getCardValue(aCard, "PrimaryEmail");
    var secondEmail = ab.getCardValue(aCard, "SecondEmail");
    var toReturn = false;

    if (primaryEmail) {
      var toReturn = primaryEmail == email || primaryEmail == email;
      if (secondEmail)
        toReturn = toReturn || secondEmail == email || secondEmail == email;
    }
    //if it has a second e-mail...
    if (secondEmail)
      toReturn = toReturn || secondEmail == email || secondEmail == email;

    //if it doesn't have e-mail address, figure out if the names are the same
    if (aCard.displayName && aContact.xml.getElementsByTagName('title')[0] 
        && aContact.xml.getElementsByTagName('title')[0].childNodes[0])
      toReturn = toReturn || aCard.displayName ==
                 aContact.xml.getElementsByTagName('title')[0].childNodes[0].nodeValue;
    return toReturn;
  },
  /**
   * Returns an single string representing a card's address.
   *
   * @param aCard   The card from which the address is taken.
   * @param aPrefix "Home" or "Work"
   */
  encodeAddress: function(aCard, aPrefix) {
    var ab = Overlay.mAddressBook;
    ab.checkCard(aCard, "encodeAddress");
    if (!aPrefix)
      throw StringBundle.getStr("error") + "aPrefix" +
            StringBundle.getStr("suppliedTo") + "encodeAddress" +
            StringBundle.getStr("errorEnd");
    var str = "";
    var prefArr = Preferences.mAddressProperties;
    var hasOne = false;
    for (var i = 0; i < prefArr.length; i++) {
        var value = ab.getCardValue(aCard, aPrefix + prefArr[i]);
        if (value) {
          str += value + "\n";
          hasOne = true;
        }
        else
          str += "\n";
    }
    if (hasOne)
      return str;
  },
  /**
   * Sets the home and work addresses for a card
   *
   * @param aCard     The card to which the address is added.
   * @param aAddress  The address to decode
   * @param aPrefix   The prefix - "Home" or "Work"
   */
  decodeAddress: function(aCard, aAddress, aPrefix) {
    Overlay.mAddressBook.checkCard(aCard, "decodeAddress");
    if (!aPrefix)
      throw StringBundle.getStr("error") + "aPrefix" +
            StringBundle.getStr("suppliedTo") + "decodeAddress" +
            StringBundle.getStr("errorEnd");
    var address = {};
    if (aAddress)
      address = aAddress.split("\n");
    var prefArr = Preferences.mAddressProperties;
    var ab = Overlay.mAddressBook;
    // set the value of each item in the preferences array as the value obtained
    // from Google, or blank if there was no value
    for (var i = 0, length = prefArr.length; i < length; i++) {
      var value = address[i] ? address[i] : ""; 
      ab.setCardValue(aCard, aPrefix + prefArr[i], value);
    }
    return aCard;
  }
}
