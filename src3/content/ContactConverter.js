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
  GD:            {},
  ATOM:          {},
  mCurrentCard:  {},
  mConverterArr: [],
  // extra attributes added by this extension.  Doesn't include GoogleID or any
  // of the URLs.  Should be obtained w/ ContactConverter.getExtraSyncAttributes
  mAddedAttributes: [
    "HomeFaxNumber", "OtherNumber", "OtherAddress", "ThirdEmail", "FourthEmail",
    "TalkScreenName", "ICQScreenName", "YahooScreenName", "MSNScreenName", 
    "JabberScreenName", "FullHomeAddress", "FullWorkAddress", "PrimaryEmailType",
    "SecondEmailType", "_AimScreenNameType", "HomePhoneType", "WorkPhoneType",
    "FaxNumberType", "CellularNumberType", "PagerNumberType",
    "HomeFaxNumberType", "OtherNumberType", "Relation0", "Relation0Type",
    "Relation1", "Relation1Type", "Relation2", "Relation2Type", "Relation3",
    "Relation3Type", "CompanySymbol", "JobDescription", "PhotoETag",
    "WebPage1Type", "WebPage2Type"],
  mInitialized: false,
  /**
   * ContactConverter.init
   * Initializes this object by populating the array of ConverterElement
   * objects and the two namespaces most commonly used by this object.
   */
  init: function ContactConverter_init() {
    this.GD = gdata.namespaces.GD;
    this.ATOM = gdata.namespaces.ATOM;
    // ConverterElement(aElement, aTbName, aIndex, aType)
    // This array stores info on what tags in Google's feed sync with which
    // properties in Thunderbird.  gdata.contacts has info on these tags
    this.mConverterArr = [
      // Various components of a name
      new ConverterElement("fullName",       "DisplayName",    0),
      new ConverterElement("givenName",      "FirstName",      0),
      new ConverterElement("familyName",     "LastName",       0),
      new ConverterElement("additionalName", "AdditionalName", 0),
      new ConverterElement("namePrefix",     "namePrefix",     0),
      new ConverterElement("nameSuffix",     "nameSuffix",     0),
      new ConverterElement("nickname",       "NickName",       0),
      // general
      new ConverterElement("notes",          "Notes",          0),
      new ConverterElement("id",             "GoogleID",       0),
      new ConverterElement("postalAddress",  "OtherAddress",   0, "other"),
      // e-mail addresses
      new ConverterElement("email", "PrimaryEmail", 0, "other"),
      new ConverterElement("email", "SecondEmail",  1, "other"),
      new ConverterElement("email", "ThirdEmail",   2, "other"),
      new ConverterElement("email", "FourthEmail",  3, "other"),
      // IM screennames
      new ConverterElement("im", "_AimScreenName",   0, "AIM"),
      new ConverterElement("im", "TalkScreenName",   1, "GOOGLE_TALK"),
      new ConverterElement("im", "ICQScreenName",    2, "ICQ"),
      new ConverterElement("im", "YahooScreenName",  3, "YAHOO"),
      new ConverterElement("im", "MSNScreenName",    4, "MSN"),
      new ConverterElement("im", "JabberScreenName", 5, "JABBER"),
      // the phone numbers
      new ConverterElement("phoneNumber", "WorkPhone",      0, "work"),
      new ConverterElement("phoneNumber", "HomePhone",      1, "home"),
      new ConverterElement("phoneNumber", "FaxNumber",      2, "work_fax"),
      new ConverterElement("phoneNumber", "CellularNumber", 3, "mobile"),
      new ConverterElement("phoneNumber", "PagerNumber",    4, "pager"),
      new ConverterElement("phoneNumber", "HomeFaxNumber",  5, "home_fax"),
      new ConverterElement("phoneNumber", "OtherNumber",    6, "other"),
      // company info
      new ConverterElement("orgTitle",          "JobTitle",       0),
      new ConverterElement("orgName",           "Company",        0),
      new ConverterElement("orgDepartment",     "Department",     0),
      new ConverterElement("orgJobDescription", "JobDescription", 0),
      new ConverterElement("orgSymbol",         "CompanySymbol",  0),
      // the URLs from Google - Photo, Self, and Edit
      new ConverterElement("PhotoURL", "PhotoURL", 0),
      new ConverterElement("SelfURL",  "SelfURL",  0),
      new ConverterElement("EditURL",  "EditURL",  0),
      // the new address fields
      new ConverterElement("postalAddress", "FullHomeAddress", 0, "home"),
      new ConverterElement("postalAddress", "FullWorkAddress", 0, "work"),
      // relation fields
      new ConverterElement("relation", "Relation0", 0, ""),
      new ConverterElement("relation", "Relation1", 1, ""),
      new ConverterElement("relation", "Relation2", 2, ""),
      new ConverterElement("relation", "Relation3", 3, ""),
      // websites
      new ConverterElement("website",   "WebPage1", 0, "work"),
      new ConverterElement("website",   "WebPage2", 1, "home")
    ];
    this.mInitialized = true;
  },
  /**
   * ContactConverter.getAllSyncAttributes
   * Returns an array of all of the extra attributes synced by this extension.
   * @param aIncludeURLs Should be true if the URL-related attributes should be
   *                     returned.
   */
  getExtraSyncAttributes: function ContactConverter_getExtraSyncAttributes(aIncludeURLs) {
    if (!this.mInitialized)
      this.init();
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
  cardToAtomXML: function ContactConverter_cardToAtomXML(aCard, aContact) {
    var isNew = !aContact;
    if (!aContact)
      aContact = new GContact();
    if (!this.mInitialized)
      this.init();
    var ab = Sync.mCurrentAb;
    AbManager.checkCard(aCard, "cardToAtomXML");
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
      LOGGER.VERBOSE_LOG(" * " + obj.tbName);
      var value = this.checkValue(AbManager.getCardValue(aCard, obj.tbName));
      // for the type, get the type from the card, or use its default
      var type = AbManager.getCardValue(aCard, obj.tbName + "Type");
      if (!type || type == "")
        type = obj.type;
      // see the dummy e-mail note below
      if (obj.tbName == dummyEmailName &&
          isDummyEmail(value)) {
        value = null;
        type = null;
      }
      LOGGER.VERBOSE_LOG("   - " + value + " type: " + type);
      aContact.setValue(obj.elementName, obj.index, type, value);
    }
    // Birthday can be either YYYY-M-D or --M-D for no year.
    // TB can have all three, just a day/month, or just a year through the UI
    var birthDay    = AbManager.getCardValue(aCard, "BirthDay");
    var birthMonth  = isNaN(parseInt(birthDay, 10))
                        ? null
                        : AbManager.getCardValue(aCard, "BirthMonth");
    var birthdayVal = null;
    // if the contact has a birth month (and birth day) add it to the contact
    // from Google
    if (birthMonth && !isNaN(parseInt(birthMonth, 10))) {
      var birthYear = AbManager.getCardValue(aCard, "BirthYear");
      if (!birthYear || isNaN(parseInt(birthYear, 10)))
        birthYear = "-";
      birthdayVal = birthYear + "-" + birthMonth + "-" + birthDay;
    }
    LOGGER.VERBOSE_LOG(" * Birthday: " + birthdayVal);
    aContact.setValue("birthday", 0, null, birthdayVal);
      
    // set the extended properties
    aContact.removeExtendedProperties();
    arr = Preferences.mExtendedProperties;
    for (var i = 0, length = arr.length; i < length; i++) {
      var value = this.checkValue(AbManager.getCardValue(aCard, arr[i]));
      aContact.setExtendedProperty(arr[i], value);
    }
    // If the myContacts pref is set and this contact is new then add the
    // myContactsName group
    if (Preferences.mSyncPrefs.myContacts.value) {
      if (isNew && Sync.mContactsUrl) {
        aContact.setGroups([Sync.mContactsUrl]);
      }
    }
    else if (Preferences.mSyncPrefs.syncGroups.value) {
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
  makeCard: function ContactConverter_makeCard(aContact, aCard) {
    if (!aContact)
      throw "Invalid aXml parameter supplied to the 'makeCard' method" +
            StringBundle.getStr("pleaseReport");
    if (!this.mInitialized)
      this.init();
    var ab = Sync.mCurrentAb;
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
      // Thunderbird has problems with contacts who do not have an e-mail addr
      // and are in Mailing Lists.  To avoid problems, use a dummy e-mail addr
      // that is hidden from the user
      if (obj.tbName == dummyEmailName && !property.value) {
        property.value = makeDummyEmail(aContact);
        property.type  = "home";
      }
      ab.setCardValue(card, obj.tbName, property.value);
      // set the type, if it is an attribute with a type
      if (property.type)
        ab.setCardValue(card, obj.tbName + "Type", property.type);
    }
    // get the extended properties
    arr = Preferences.mExtendedProperties;
    for (var i = 0, length = arr.length; i < length; i++) {
      var value = aContact.getExtendedProperty(arr[i]);
      value = value ? value.value : null;
      ab.setCardValue(card, arr[i], value);
    }
    
    // parse the DisplayName into FirstName and LastName
    if (Preferences.mSyncPrefs.parseNames.value) {
      var name  = ab.getCardValue(card, "DisplayName");
      var first = ab.getCardValue(card, "FirstName");
      var last  = ab.getCardValue(card, "LastName");
      // only parse if the contact has a name and there isn't already a first
      // or last name set
      if (name && !first && !last) {
        var nameArr = [];
        if (name.split) {
          // If the name has a comma, it is probably <last>, <first>
          var commaIndex = name.indexOf(",");
          if (commaIndex != -1) {
            name = name.replace(", ", ",");
            var tmpArr = name.split(",");
            nameArr.push(tmpArr[1]);
            nameArr.push(tmpArr[0]);
            // now fix the DisplayName
            ab.setCardValue(card, "DisplayName", tmpArr[1] + " " + tmpArr[0]);
          }
          // Otherwise assume it is <first> <last>
          else
            nameArr = name.split(" ");
        }
        else
          nameArr = [name];
        // take the first part of the name and set it as the first name
        // then take the last and set it as the last name
        first = nameArr.shift();
        last  = nameArr.join(" ");
        LOGGER.VERBOSE_LOG("FirstName\n" + first + "\nLastName\n" + last);
        ab.setCardValue(card, "FirstName", first);
        ab.setCardValue(card, "LastName", last);
      }
    }
    
    // Get the birthday info
    var bday = aContact.getValue("birthday", 0, gdata.contacts.types.UNTYPED);
    var year  = null;
    var month = null;
    var day   = null;
    // If it has a birthday...
    if (bday && bday.value) {
      LOGGER.VERBOSE_LOG(" * Found a birthday value of " + bday.value);
      // If it consists of all three date elements: YYYY-M-D
      if (bday.value.indexOf("--") == -1) {
        var arr = bday.value.split("-");
        year  = arr[0];
        month = arr[1];
        day   = arr[2];
      }
      // Else it is just a month and day: --M-D
      else {
        var arr = bday.value.replace("--", "").split("-");
        month = arr[0];
        day   = arr[1];
      }
      LOGGER.VERBOSE_LOG("  - Year:  " +  year);
      LOGGER.VERBOSE_LOG("  - Month: " +  month);
      LOGGER.VERBOSE_LOG("  - Day:   " +  day);
    }
    ab.setCardValue(card, "BirthYear",  year);
    ab.setCardValue(card, "BirthMonth", month);
    ab.setCardValue(card, "BirthDay",   day);    

    if (Preferences.mSyncPrefs.getPhotos.value) {
      var info = aContact.getPhotoInfo();
      if (info) {
        var file = aContact.writePhoto(Sync.mCurrentAuthToken);
        if (file) {
          ab.setCardValue(card, "PhotoName", file.leafName);
          ab.setCardValue(card, "PhotoType", "file");
          ab.setCardValue(card, "PhotoURI",  info.url);
          ab.setCardValue(card, "PhotoEtag", info.etag);
        }
      }
    }

    ab.updateCard(card);
    if (Preferences.mSyncPrefs.syncGroups.value && !Preferences.mSyncPrefs.myContacts.value) {
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
          // if the 'list' is a directory, update the card there, too
          // this isn't necessary if the list is a mail list
          else if (list.updateCard)
            list.updateCard(card);
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
  fixAddress: function ContactConverter_fixAddress(aCard, aPrefix) {
    if (!aCard || !aPrefix || (aPrefix != "Home" && aPrefix != "Work"))
      return;
    if (!this.mInitialized)
      this.init();
    var ab = Sync.mCurrentAb;
    // if there isn't a value in the Full (multi-lined address) then create one
    // from the existing address
    if (!AbManager.getCardValue(aCard, "Full" + aPrefix + "Address")) {   
      // form the new address from the old
      var newAddress = "";
      var pref = Preferences.mSyncPrefs[aPrefix.toLowerCase() + "Address"];
      // use the preference that describes how to format the address
      if (pref && pref.value) {
        var curToken = "";
        var isToken = false;
        for (var i = 0; i < pref.value.length; i++) {
          var character = pref.value[i];
          if (isToken) {
            if (character == ']') {
              var cardValue = AbManager.getCardValue(aCard, curToken);
              newAddress += cardValue ? cardValue : "";
              curToken = "";
              isToken = false;
            }
            else if (character != ']') {
              curToken += character;
            }
          }
          else {
            if (character == '[') {
              isToken = true;
            }
            else {
              newAddress += character;
            }
          }
        }
        // remove any blank lines
        var newAddressArr = newAddress.split('\n');
        var arr = [];
        newAddress = "";
        for (var i = 0; i < newAddressArr.length; i++) {
          // if the current line is valid, add it to the address
          if (this.validAddrLine(newAddressArr[i]))
            arr.push(newAddressArr[i]);
        }
        newAddress = arr.join('\n');
      }
      // if the preference wasn't found default to the old hard-coded way
      else {
        // get the current info
        var address1 = AbManager.getCardValue(aCard, aPrefix + "Address");
        var address2 = AbManager.getCardValue(aCard, aPrefix + "Address2");
        var city     = AbManager.getCardValue(aCard, aPrefix + "City");
        var state    = AbManager.getCardValue(aCard, aPrefix + "State");
        var zip      = AbManager.getCardValue(aCard, aPrefix + "ZipCode");
        var country  = AbManager.getCardValue(aCard, aPrefix + "Country");
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
   * ContactConverter.validAddrLine
   * Check if the given string is a valid address line.
   * A 'valid' address line current consists of at least one letter or number
   */
  validAddrLine: function ContactConverter_validAddrLine(aLine) {
    if (!aLine || !aLine.length) return false;
    // if something changes between the string and it's lowercase representation
    if (aLine != aLine.toLowerCase()) {
      return true;
    }
    // if not, check it for at least one number
    return (new RegExp("[0-9]")).test(aLine);
  },
  /**
   * ContactConverter.checkValue
   * Check if the given string is null, of length 0, or consists only of spaces
   * and return null if any of the listed conditions is true.
   * This function was added to fix Bug 20389: Values with only spaces should be
   * treated as empty
   * @param aValue The string to check.
   * @return null   - The string is null, of length 0, or consists only of
                      spaces
   *         aValue - The string has at least one character that is not a space
   */
  checkValue: function ContactConverter_checkValue(aValue) {
    if (!aValue || !aValue.length) return null;
    for (var i = 0; i < aValue.length; i++)
      if (aValue[i] != " ") return aValue;
    return null;
  }
};
