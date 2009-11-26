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

if (!com) var com = {};
if (!com.gContactSync) com.gContactSync = {};

window.addEventListener("load", function ContactConverterLoadListener(e) {
  com.gContactSync.ContactConverter.init();
 }, false);


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
com.gContactSync.ContactConverter = {
  // two namespaces
  GD:            {},
  ATOM:          {},
  mCurrentCard:  {},
  mConverterArr: [],
  // extra attributes added by this extension.  Doesn't include GoogleID or any
  // of the URLs.  Should be obtained w/ ContactConverter.getExtraSyncAttributes
  mAddedAttributes: [
    "HomeFaxNumber", "OtherNumber", "ThirdEmail", "FourthEmail",
    "TalkScreenName", "ICQScreenName", "YahooScreenName", "MSNScreenName", 
    "JabberScreenName",  "PrimaryEmailType",
    "SecondEmailType", "_AimScreenNameType", "HomePhoneType", "WorkPhoneType",
    "FaxNumberType", "CellularNumberType", "PagerNumberType",
    "HomeFaxNumberType", "OtherNumberType", "Relation0", "Relation0Type",
    "Relation1", "Relation1Type", "Relation2", "Relation2Type", "Relation3",
    "Relation3Type", "CompanySymbol", "JobDescription",
    "WebPage1Type", "WebPage2Type"],
  mInitialized: false,
  /**
   * ContactConverter.init
   * Initializes this object by populating the array of ConverterElement
   * objects and the two namespaces most commonly used by this object.
   */
  init: function ContactConverter_init() {
    this.GD = com.gContactSync.gdata.namespaces.GD;
    this.ATOM = com.gContactSync.gdata.namespaces.ATOM;
    // ConverterElement(aElement, aTbName, aIndex, aType)
    // This array stores info on what tags in Google's feed sync with which
    // properties in Thunderbird.  gdata.contacts has info on these tags
    this.mConverterArr = [
      // Various components of a name
      new com.gContactSync.ConverterElement("fullName",       "DisplayName",    0),
      new com.gContactSync.ConverterElement("givenName",      "FirstName",      0),
      new com.gContactSync.ConverterElement("familyName",     "LastName",       0),
      new com.gContactSync.ConverterElement("additionalName", "AdditionalName", 0),
      new com.gContactSync.ConverterElement("namePrefix",     "namePrefix",     0),
      new com.gContactSync.ConverterElement("nameSuffix",     "nameSuffix",     0),
      new com.gContactSync.ConverterElement("nickname",       "NickName",       0),
      // general
      new com.gContactSync.ConverterElement("notes",          "Notes",          0),
      new com.gContactSync.ConverterElement("id",             "GoogleID",       0),
      // e-mail addresses
      new com.gContactSync.ConverterElement("email", "PrimaryEmail", 0, "other"),
      new com.gContactSync.ConverterElement("email", "SecondEmail",  1, "other"),
      new com.gContactSync.ConverterElement("email", "ThirdEmail",   2, "other"),
      new com.gContactSync.ConverterElement("email", "FourthEmail",  3, "other"),
      // IM screennames
      new com.gContactSync.ConverterElement("im", "_AimScreenName",   0, "AIM"),
      new com.gContactSync.ConverterElement("im", "TalkScreenName",   1, "GOOGLE_TALK"),
      new com.gContactSync.ConverterElement("im", "ICQScreenName",    2, "ICQ"),
      new com.gContactSync.ConverterElement("im", "YahooScreenName",  3, "YAHOO"),
      new com.gContactSync.ConverterElement("im", "MSNScreenName",    4, "MSN"),
      new com.gContactSync.ConverterElement("im", "JabberScreenName", 5, "JABBER"),
      // the phone numbers
      new com.gContactSync.ConverterElement("phoneNumber", "WorkPhone",      0, "work"),
      new com.gContactSync.ConverterElement("phoneNumber", "HomePhone",      1, "home"),
      new com.gContactSync.ConverterElement("phoneNumber", "FaxNumber",      2, "work_fax"),
      new com.gContactSync.ConverterElement("phoneNumber", "CellularNumber", 3, "mobile"),
      new com.gContactSync.ConverterElement("phoneNumber", "PagerNumber",    4, "pager"),
      new com.gContactSync.ConverterElement("phoneNumber", "HomeFaxNumber",  5, "home_fax"),
      new com.gContactSync.ConverterElement("phoneNumber", "OtherNumber",    6, "other"),
      // company info
      new com.gContactSync.ConverterElement("orgTitle",          "JobTitle",       0),
      new com.gContactSync.ConverterElement("orgName",           "Company",        0),
      new com.gContactSync.ConverterElement("orgDepartment",     "Department",     0),
      new com.gContactSync.ConverterElement("orgJobDescription", "JobDescription", 0),
      new com.gContactSync.ConverterElement("orgSymbol",         "CompanySymbol",  0),
      // the URLs from Google - Photo, Self, and Edit
      new com.gContactSync.ConverterElement("PhotoURL", "PhotoURL", 0),
      new com.gContactSync.ConverterElement("SelfURL",  "SelfURL",  0),
      new com.gContactSync.ConverterElement("EditURL",  "EditURL",  0),
      // Home address
      new com.gContactSync.ConverterElement("street",   "HomeAddress", 0, "home"),
      new com.gContactSync.ConverterElement("city",     "HomeCity",    0, "home"),
      new com.gContactSync.ConverterElement("region",   "HomeState",   0, "home"),
      new com.gContactSync.ConverterElement("postcode", "HomeZipCode", 0, "home"),
      new com.gContactSync.ConverterElement("country",  "HomeCountry", 0, "home"),
      // Work address
      new com.gContactSync.ConverterElement("street",   "WorkAddress", 0, "work"),
      new com.gContactSync.ConverterElement("city",     "WorkCity",    0, "work"),
      new com.gContactSync.ConverterElement("region",   "WorkState",   0, "work"),
      new com.gContactSync.ConverterElement("postcode", "WorkZipCode", 0, "work"),
      new com.gContactSync.ConverterElement("country",  "WorkCountry", 0, "work"),
      // relation fields
      new com.gContactSync.ConverterElement("relation", "Relation0", 0, ""),
      new com.gContactSync.ConverterElement("relation", "Relation1", 1, ""),
      new com.gContactSync.ConverterElement("relation", "Relation2", 2, ""),
      new com.gContactSync.ConverterElement("relation", "Relation3", 3, ""),
      // websites
      new com.gContactSync.ConverterElement("website",   "WebPage1", 0, "work"),
      new com.gContactSync.ConverterElement("website",   "WebPage2", 1, "home")
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
      aContact = new com.gContactSync.GContact();
    if (!this.mInitialized)
      this.init();
    var ab = com.gContactSync.Sync.mCurrentAb;
    com.gContactSync.GAbManager.checkCard(aCard, "cardToAtomXML");
    this.mCurrentCard = aCard;
    var arr = this.mConverterArr;
    // set the regular properties from the array mConverterArr
    for (var i = 0, length = arr.length; i < length; i++) {
      // skip the URLs
      if (arr[i].tbName.indexOf("URL") != -1 || arr[i].tbName == "GoogleID")
        continue;
      var obj = arr[i];
      com.gContactSync.LOGGER.VERBOSE_LOG(" * " + obj.tbName);
      var value = this.checkValue(com.gContactSync.GAbManager.getCardValue(aCard, obj.tbName));
      // for the type, get the type from the card, or use its default
      var type = com.gContactSync.GAbManager.getCardValue(aCard, obj.tbName + "Type");
      if (!type || type == "")
        type = obj.type;
      // see the dummy e-mail note below
      if (obj.tbName == com.gContactSync.dummyEmailName &&
          com.gContactSync.isDummyEmail(value)) {
        value = null;
        type = null;
      }
      com.gContactSync.LOGGER.VERBOSE_LOG("   - " + value + " type: " + type);
      aContact.setValue(obj.elementName, obj.index, type, value);
    }
    // Birthday can be either YYYY-M-D or --M-D for no year.
    // TB can have all three, just a day/month, or just a year through the UI
    var birthDay    = com.gContactSync.GAbManager.getCardValue(aCard, "BirthDay");
    var birthMonth  = isNaN(parseInt(birthDay, 10))
                        ? null
                        : com.gContactSync.GAbManager.getCardValue(aCard, "BirthMonth");
    var birthdayVal = null;
    // if the contact has a birth month (and birth day) add it to the contact
    // from Google
    if (birthMonth && !isNaN(parseInt(birthMonth, 10))) {
      var birthYear = com.gContactSync.GAbManager.getCardValue(aCard, "BirthYear");
      if (!birthYear || isNaN(parseInt(birthYear, 10)))
        birthYear = "-";
      birthYear = new String(birthYear);
      while (birthYear.length < 4)
        birthYear = "0" + birthYear;
      birthdayVal = birthYear + "-" + birthMonth + "-" + birthDay;
    }
    com.gContactSync.LOGGER.VERBOSE_LOG(" * Birthday: " + birthdayVal);
    aContact.setValue("birthday", 0, null, birthdayVal);
      
    // set the extended properties
    aContact.removeExtendedProperties();
    arr = com.gContactSync.Preferences.mExtendedProperties;
    for (var i = 0, length = arr.length; i < length; i++) {
      var value = this.checkValue(com.gContactSync.GAbManager.getCardValue(aCard, arr[i]));
      aContact.setExtendedProperty(arr[i], value);
    }
    // If the myContacts pref is set and this contact is new then add the
    // myContactsName group
    if (ab.mPrefs.myContacts == "true") {
      if (isNew && com.gContactSync.Sync.mContactsUrl) {
        aContact.setGroups([com.gContactSync.Sync.mContactsUrl]);
      }
    }
    else if (ab.mPrefs.syncGroups == "true") {
      // set the groups
      var groups = [];
      for (var i in com.gContactSync.Sync.mLists) {
        var list = com.gContactSync.Sync.mLists[i];
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
            com.gContactSync.StringBundle.getStr("pleaseReport");
    if (!this.mInitialized)
      this.init();
    var ab = com.gContactSync.Sync.mCurrentAb;
    var card;
    if (aCard)
      card = aCard;
    else
      card = ab.addCard(ab.makeCard());
    var arr = this.mConverterArr;
    // get the regular properties from the array mConverterArr
    for (var i = 0, length = arr.length; i < length; i++) {
      var obj = arr[i];
      com.gContactSync.LOGGER.VERBOSE_LOG(obj.tbName);
      var property = aContact.getValue(obj.elementName, obj.index, obj.type);
      property = property ? property : new com.gContactSync.Property("", "");
      com.gContactSync.LOGGER.VERBOSE_LOG(property.value + " - " + property.type);
      // Thunderbird has problems with contacts who do not have an e-mail addr
      // and are in Mailing Lists.  To avoid problems, use a dummy e-mail addr
      // that is hidden from the user
      if (obj.tbName == com.gContactSync.dummyEmailName && !property.value) {
        property.value = com.gContactSync.makeDummyEmail(aContact);
        property.type  = "home";
      }
      ab.setCardValue(card, obj.tbName, property.value);
      // set the type, if it is an attribute with a type
      if (property.type)
        ab.setCardValue(card, obj.tbName + "Type", property.type);
    }
    // get the extended properties
    arr = com.gContactSync.Preferences.mExtendedProperties;
    for (var i = 0, length = arr.length; i < length; i++) {
      var value = aContact.getExtendedProperty(arr[i]);
      value = value ? value.value : null;
      ab.setCardValue(card, arr[i], value);
    }
    
    // parse the DisplayName into FirstName and LastName
    if (ab.mPrefs.parseNames == "true") {
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
        com.gContactSync.LOGGER.VERBOSE_LOG("FirstName\n" + first + "\nLastName\n" + last);
        ab.setCardValue(card, "FirstName", first);
        ab.setCardValue(card, "LastName", last);
      }
    }
    
    // Get the birthday info
    var bday = aContact.getValue("birthday", 0, com.gContactSync.gdata.contacts.types.UNTYPED);
    var year  = null;
    var month = null;
    var day   = null;
    // If it has a birthday...
    if (bday && bday.value) {
      com.gContactSync.LOGGER.VERBOSE_LOG(" * Found a birthday value of " + bday.value);
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
      com.gContactSync.LOGGER.VERBOSE_LOG("  - Year:  " +  year);
      com.gContactSync.LOGGER.VERBOSE_LOG("  - Month: " +  month);
      com.gContactSync.LOGGER.VERBOSE_LOG("  - Day:   " +  day);
    }
    ab.setCardValue(card, "BirthYear",  year);
    ab.setCardValue(card, "BirthMonth", month);
    ab.setCardValue(card, "BirthDay",   day);    

    if (ab.mPrefs.getPhotos == "true") {
      var info = aContact.getPhotoInfo();
      if (info) {
        var file = aContact.writePhoto(com.gContactSync.Sync.mCurrentAuthToken);
        if (file) {
          com.gContactSync.LOGGER.VERBOSE_LOG("Wrote photo...name: " + file.leafName);
          ab.setCardValue(card, "PhotoName", file.leafName);
          ab.setCardValue(card, "PhotoType", "file");
          ab.setCardValue(card, "PhotoURI",
                          Components.classes["@mozilla.org/network/io-service;1"]
                                    .getService(Components.interfaces.nsIIOService)
                                    .newFileURI(file)
                                    .spec);
          ab.setCardValue(card, "PhotoEtag", info.etag);
        }
      }
    }

    ab.updateCard(card);
    if (ab.mPrefs.syncGroups == "true" && ab.mPrefs.myContacts != "true") {
      // get the groups after updating the card
      var groups = aContact.getValue("groupMembershipInfo");
      var lists = com.gContactSync.Sync.mLists;
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
