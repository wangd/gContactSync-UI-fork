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

window.addEventListener("load",
  /** Initializes the CardDialogOverlay when the window has finished loading. */
  function gCS_CardDialogOverlayLoadListener(e) {
    com.gContactSync.CardDialogOverlay.init();
  },
false);
/**
 * Attributes added to TB by gContactSync AND present in the card dialog overlay
 */
com.gContactSync.gAttributes = {
  "ThirdEmail":           {}, 
  "FourthEmail":          {},
  "TalkScreenName":       {},
  "JabberScreenName":     {},
  "YahooScreenName":      {},
  "MSNScreenName":        {},
  "ICQScreenName":        {},
  "HomeFaxNumber":        {},
  "OtherNumber":          {},
  "PrimaryEmailType":     {},
  "SecondEmailType":      {},
  "ThirdEmailType":       {},
  "FourthEmailType":      {},
  "_AimScreenNameType":   {},
  "TalkScreenNameType":   {},
  "JabberScreenNameType": {},
  "YahooScreenNameType":  {},
  "MSNScreenNameType":    {},
  "ICQScreenNameType":    {},
  "WorkPhoneType":        {},
  "HomePhoneType":        {},
  "FaxNumberType":        {},
  "CellularNumberType":   {},
  "PagerNumberType":      {},
  "HomeFaxNumberType":    {},
  "OtherNumberType":      {},
  "Relation0":            {},
  "Relation0Type":        {},
  "Relation1":            {},
  "Relation1Type":        {},
  "Relation2":            {},
  "Relation2Type":        {},
  "Relation3":            {},
  "Relation3Type":        {},
  "WebPage1Type":         {},
  "WebPage2Type":         {}
};
/**
 * Adds a tab to the tab box in the New and Edit Card Dialogs.  Using JavaScript
 * is necessary because the tab box doesn't have an ID.
 * @class
 */
com.gContactSync.CardDialogOverlay = {
  /** The XUL namespace */
  mNamespace:  "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
  /** The number of times an attempt was made to initialize the dialog */
  mLoadNumber: 0,
  /** This stores whether the contact is read-only (ie from LDAP or the Mac AB) */
  mDisabled:   false,
  /**
   * Adds a tab to the tab box, if possible.  Waits until the abCardOverlay is
   * loaded.
   */
  init: function CardDialogOverlay_init() {
    com.gContactSync.Preferences.getSyncPrefs();
    // if it isn't finished loading yet wait another 200 ms and try again
    if (!document.getElementById("abTabs")) {
      // if it has tried to load more than 50 times something is wrong, so quit
      if (com.gContactSync.CardDialogOverlay.mLoadNumber < 50)
        setTimeout(com.gContactSync.CardDialogOverlay.init, 200);
      com.gContactSync.CardDialogOverlay.mLoadNumber++;
      return;
    }

    try {
      // QI the card if it doesn't have the getProperty method
      // if the card cannot accept custom attributes, quit and do not add the
      // extra tabs
      if (!gEditCard.card.getProperty)
        gEditCard.card.QueryInterface(Components.interfaces.nsIAbMDBCard);
    }
    catch (e) {
      document.getElementById("gContactSyncTab").collapsed = true;
      return;
    }
    // some contacts are read-only so extra attributes should be disabled for
    // those cards (see Mozdev Bug 20169)
    try {
      com.gContactSync.CardDialogOverlay.mDisabled = document.getElementById("PreferMailFormatPopup").disabled;
    }
    catch (ex) {
      com.gContactSync.alertError("Error while determining if contact is read-only: " + ex);
      com.gContactSync.CardDialogOverlay.mDisabled = true;
    }
    // add the email type drop down menus
    try {
      var emailTypes      = com.gContactSync.gdata.contacts.EMAIL_TYPES,
          primaryEmailBox = document.getElementById("PrimaryEmail").parentNode,
          secondEmailBox  = document.getElementById("SecondEmail").parentNode,
          thirdEmailBox   = document.getElementById("ThirdEmail").parentNode,
          fourthEmailBox  = document.getElementById("FourthEmail").parentNode;
      this.addMenuItems(primaryEmailBox, emailTypes, "PrimaryEmailType", "other");
      this.addMenuItems(secondEmailBox, emailTypes, "SecondEmailType", "other");
      this.addMenuItems(thirdEmailBox, emailTypes, "ThirdEmailType", "other");
      this.addMenuItems(fourthEmailBox, emailTypes, "FourthEmailType", "other");
    }
    catch (ex0) {
      com.gContactSync.alertError("Unable to setup email types: " + ex0);
    }
    try {
      // add drop down menus for screen name protocols
      var imTypes   = com.gContactSync.gdata.contacts.IM_TYPES,
          aimBox    = document.getElementById("ScreenName").parentNode,
          talkBox   = document.getElementById("TalkScreenName").parentNode,
          yahooBox  = document.getElementById("YahooScreenName").parentNode,
          icqBox    = document.getElementById("ICQScreenName").parentNode,
          msnBox    = document.getElementById("MSNScreenName").parentNode,
          jabberBox = document.getElementById("JabberScreenName").parentNode;
      this.addMenuItems(aimBox,    imTypes, "_AimScreenNameType",   "AIM");
      this.addMenuItems(talkBox,   imTypes, "TalkScreenNameType",   "GOOGLE_TALK");
      this.addMenuItems(icqBox,    imTypes, "ICQScreenNameType",    "ICQ");
      this.addMenuItems(yahooBox,  imTypes, "YahooScreenNameType",  "YAHOO");
      this.addMenuItems(msnBox,    imTypes, "MSNScreenNameType",    "MSN");
      this.addMenuItems(jabberBox, imTypes, "JabberScreenNameType", "JABBER");
    }
    catch (ex1) {
      com.gContactSync.alertError("Unable to setup screen name protocol menus\n" + ex1);
    }
    var pager;
    try {
      // swap pager and mobile phone textboxes and values
      pager = document.getElementById("PagerNumber");
      pager.setAttribute("id", "tmp");
      var pagerValue = pager.value,
          mobile     = document.getElementById("CellularNumber");
      mobile.setAttribute("id", "PagerNumber");
      pager.setAttribute("id", "CellularNumber");
      pager.value = mobile.value;
      mobile.value = pagerValue;
    }
    catch (e1) {
      com.gContactSync.alertError("Unable to swap pager and mobile number values\n" + e1);
    }
    var newDialog      = false, // post-Mailnews Core Bug 63941
        showPhoneTypes = com.gContactSync.Preferences.mSyncPrefs.phoneTypes.value,
        work           = document.getElementById("WorkPhone"),
        home           = document.getElementById("HomePhone"),
        fax            = document.getElementById("FaxNumber");
    mobile             = document.getElementById("CellularNumber");
    pager              = document.getElementById("PagerNumber");
    // then replace all phone labels and remove the access keys
    var workLabel = work.parentNode.previousSibling;
    if (!workLabel) {
      newDialog = true;
      workLabel = work.previousSibling;
    }
    if (showPhoneTypes) {
      try {
        workLabel.value = com.gContactSync.StringBundle.getStr("first");
        workLabel.setAttribute("accesskey", "");
        var homeLabel = newDialog ? home.previousSibling
                                  : home.parentNode.previousSibling;
        homeLabel.value = com.gContactSync.StringBundle.getStr("second");
        homeLabel.setAttribute("accesskey", "");
        var faxLabel = newDialog ? fax.previousSibling
                                 : fax.parentNode.previousSibling;
        faxLabel.value = com.gContactSync.StringBundle.getStr("third");
        faxLabel.setAttribute("accesskey", "");
        var mobileLabel = newDialog ? mobile.previousSibling
                                    : mobile.parentNode.previousSibling;
        mobileLabel.value = com.gContactSync.StringBundle.getStr("fourth");
        mobileLabel.setAttribute("accesskey", "");
        var pagerLabel = newDialog ? pager.previousSibling
                                   : pager.parentNode.previousSibling;
        pagerLabel.value = com.gContactSync.StringBundle.getStr("fifth");
        pagerLabel.setAttribute("accesskey", "");
      }
      catch (ex2) {
        com.gContactSync.alertError("Unable to replace phone labels and remove access keys\n" + ex2);
      }
    }
    else {
      // TODO - replace the Sixth and Seventh labels
    }
    var phoneTypes = com.gContactSync.gdata.contacts.PHONE_TYPES;
    try {
      // setup the types for the phone numbers
      var workBox = work.parentNode;
      this.addMenuItems(workBox, phoneTypes, "WorkPhoneType", "work")
          .collapsed = !showPhoneTypes;
      var homeBox = home.parentNode;
      this.addMenuItems(homeBox, phoneTypes, "HomePhoneType", "home")
          .collapsed = !showPhoneTypes;
      var faxBox = fax.parentNode;
      this.addMenuItems(faxBox, phoneTypes, "FaxNumberType", "work_fax")
          .collapsed = !showPhoneTypes;
      var mobileBox = mobile.parentNode;
      this.addMenuItems(mobileBox, phoneTypes, "CellularNumberType", "mobile")
          .collapsed = !showPhoneTypes;
      var pagerBox = pager.parentNode;
      this.addMenuItems(pagerBox, phoneTypes, "PagerNumberType", "pager")
          .collapsed = !showPhoneTypes;
      var homeFaxBox = document.getElementById("HomeFaxNumber").parentNode;
      this.addMenuItems(homeFaxBox, phoneTypes, "HomeFaxNumberType", "home_fax")
          .collapsed = !showPhoneTypes;
      var otherNumberBox = document.getElementById("OtherNumber").parentNode;
      this.addMenuItems(otherNumberBox, phoneTypes, "OtherNumberType", "other")
          .collapsed = !showPhoneTypes;
    }
    catch (ex3) {
      com.gContactSync.alertError("Unable to setup phone number types\n" + ex3);
    }
    
    // Add the website types
    var websiteTypes = com.gContactSync.gdata.contacts.WEBSITE_TYPES;
    var site1Box = document.getElementById("WebPage1").parentNode;
    this.addMenuItems(site1Box, websiteTypes, "WebPage1Type", "work");
    var site2Box = document.getElementById("WebPage2").parentNode;
    this.addMenuItems(site2Box, websiteTypes, "WebPage2Type", "home");
    if (newDialog) {
      // rename the hidden phone number field IDs
      try {
        document.getElementById("HomeFaxNumber").id     = "OldHomeFaxNumber";
        document.getElementById("HomeFaxNumberType").id = "OldHomeFaxNumberType";
        document.getElementById("OtherNumber").id       = "OldOtherNumber";
        document.getElementById("OtherNumberType").id   = "OldOtherNumberType";
      }
      catch (e) {}
      try {
        // change the width of the phone numbers
        var phoneIDs = ["HomePhone", "WorkPhone", "CellularNumber", "FaxNumber",
                        "PagerNumber"];
        for (var i = 0; i < phoneIDs.length; i++) {
          var elem = document.getElementById(phoneIDs[i]);
          if (!elem) continue;
          elem.setAttribute("width", "150px");
        }
        // add the sixth and seventh numbers below 1 - 5
        var sixthNum   = this.setupNumBox("HomeFaxNumber",
                                          com.gContactSync.StringBundle.getStr("sixth")),
            seventhNum = this.setupNumBox("OtherNumber",
                                     com.gContactSync.StringBundle.getStr("seventh"));
        pager.parentNode.parentNode.appendChild(sixthNum);
        this.addMenuItems(sixthNum, phoneTypes, "HomeFaxNumberType", "home_fax")
          .collapsed = !showPhoneTypes;
        pager.parentNode.parentNode.appendChild(seventhNum);
        this.addMenuItems(seventhNum, phoneTypes, "OtherNumberType", "other")
          .collapsed = !showPhoneTypes;
        
        // Add the relation fields
        try {
          document.getElementById("relationFields").removeAttribute("hidden");
          var relationTypes = [""];
          // copy the relation types over
          for (i in com.gContactSync.gdata.contacts.RELATION_TYPES) {
            relationTypes.push(i);
          }
          for (i = 0; i < 4; i++) {
            var relationBox = document.getElementById("Relation" + i + "Box");
            this.addMenuItems(relationBox, relationTypes, "Relation" + i + "Type", "", com.gContactSync.StringBundle.getStr("relationWidth"));
          }
        }
        catch (ex5) {
          com.gContactSync.LOGGER.LOG_WARNING("Could not add the relation fields.", ex5);
        }
        /*
        var nameWidth = "width: 30ch;";
        document.getElementById("FirstName").setAttribute("style", nameWidth);
        document.getElementById("LastName").setAttribute("style", nameWidth);
        document.getElementById("DisplayName").setAttribute("style", nameWidth);
        document.getElementById("NickName").setAttribute("style", nameWidth);
        document.getElementById("FirstName").removeAttribute("flex");
        document.getElementById("LastName").removeAttribute("flex");
        document.getElementById("DisplayName").removeAttribute("flex");
        document.getElementById("NickName").removeAttribute("flex");
        var emailWidth = "width: 20ch;";
        document.getElementById("PrimaryEmail").setAttribute("style", emailWidth);
        document.getElementById("SecondEmail").setAttribute("style", emailWidth);
        document.getElementById("ScreenName").setAttribute("width", "150px");
        document.getElementById("PrimaryEmail").removeAttribute("flex");
        document.getElementById("SecondEmail").removeAttribute("flex");
        document.getElementById("ScreenName").removeAttribute("flex");
        document.getElementById("abNameTab").firstChild.firstChild.style.minWidth = "50ch";
        document.getElementById("abNameTab").firstChild.firstChild.style.maxWidth = "50ch";
        var elem = document.getElementById("abTabPanels");
        elem.style.width = "850px";
        elem.style.maxWidth = "850px";
        elem.style.minWidth = "850px";
        */
        // fix the width of the dialog
        window.sizeToContent();
      }
      catch (ex6) {
        com.gContactSync.alertError("Unable to setup the extra tabs\n" + ex6);
      }
    }
    // if this is the old dialog, show the extra phone numbers
    else {
      document.getElementById("numbersGroupBox").removeAttribute("hidden");
    }
    
    // if this is a read-only card, make added elements disabled
    // the menulists are already taken care of
    // TODO update CardDialogOverlay...
    if (com.gContactSync.CardDialogOverlay.mDisabled) {
      document.getElementById("ThirdEmail").readOnly       = true;
      document.getElementById("FourthEmail").readOnly      = true;
      document.getElementById("TalkScreenName").readOnly   = true;
      document.getElementById("ICQScreenName").readOnly    = true;
      document.getElementById("YahooScreenName").readOnly  = true;
      document.getElementById("MSNScreenName").readOnly    = true;
      document.getElementById("JabberScreenName").readOnly = true;
      document.getElementById("HomeFaxNumber").readOnly    = true;
      document.getElementById("OtherNumber").readOnly      = true;
      document.getElementById("Relation").readOnly         = true;
    }

    // override the check and set card values function
    com.gContactSync.originalCheckAndSetCardValues = CheckAndSetCardValues;
    CheckAndSetCardValues = com.gContactSync.CardDialogOverlay.CheckAndSetCardValues;
    // get the extra card values
    this.GetCardValues(gEditCard.card, document);
  },
  /**
   * Sets the attributes added by this extension as the value in the textbox or
   * drop down menu in aDoc whose ID is identical to the attribute's name.
   * Calls the original CheckAndSetCardValues function when finished.
   * @param aCard  {nsIAbCard} The card to set the values for.
   * @param aDoc   {Document Object} The document.
   * @param aCheck Unused, but passed to the original method.
   */
  CheckAndSetCardValues: function CardDialogOverlay_CheckAndSetCardValues(aCard, aDoc, aCheck) {
    // make sure the required data is present (abCardOverlay.js)
    if (!CheckCardRequiredDataPresence(aDoc)) {
      return false;
    }
    var contact = new com.gContactSync.TBContact(aCard);
    var existingTypes = {
      "WorkPhoneType":      {},
      "HomePhoneType":      {},
      "FaxNumberType":      {},
      "CellularNumberType": {},
      "PagerNumberType":    {}
    };
    // iterate through all the added attributes and types and set the card's value
    // for each one of them
    for (var attr in com.gContactSync.gAttributes) {
      try {
        // if the element exists, set the card's value as its value
        var elem = aDoc.getElementById(attr);
        if (elem) {
          // I do not know why this is necessary, but it seems to be the only
          // way to get the value correct in TB 2...
          if (attr === "HomeFaxNumberType" || attr === "OtherNumberType") {
            elem.value = elem.getAttribute("value");
          }
          com.gContactSync.LOGGER.VERBOSE_LOG("Attribute: '" + attr + "' - Value: '" + elem.value + "'");
          contact.setValue(attr, elem.value);
        }
      }
      catch (e) {
        com.gContactSync.alertError("Error in com.gContactSync.CheckAndSetCardValues: " + attr + "\n" + e);
      }
    }
    if (!contact.mContact.getProperty) {
      contact.mContact.editCardToDatabase(gEditCard.abURI);
    }
    // ensure that every contact edited through this dialog has at least a dummy
    // e-mail address if necessary
    var primEmailElem = aDoc.getElementById("PrimaryEmail");
    if (!primEmailElem.value) {
      // if it is a new contact it isn't already in any lists
      if (gEditCard.abURI) {
      // Check if it is in any mailing lists.  If so, force a dummy address
      // When fetching lists, do not get the contacts (if it is found there is
      // no need to get the contacts in every list)
        var ab    = com.gContactSync.GAbManager.getAbByURI(gEditCard.abURI),
            ab    = (ab ? new com.gContactSync.GAddressBook(ab) : null),
            lists = ab.getAllLists(true);
        for (var i in lists) {
          // if the list does have the contact then make sure it gets a dummy
          // e-mail address regardless of the preference
          // do not check the PrimaryEmail address in hasContact since it is now
          // empty
          if (lists[i].hasContact(contact)) {
            primEmailElem.value = com.gContactSync.makeDummyEmail(contact.mContact, true);
            com.gContactSync.alertError(com.gContactSync.StringBundle.getStr("dummyEmailAdded") + "\n" + primEmailElem.value);
            break;
          }
        }
      }
    }
    // call the original and return its return value
    return com.gContactSync.originalCheckAndSetCardValues.apply(this, arguments);
  },
  /**
   * A method that gets all of the attributes added by this extension and sets
   * the value of the textbox or drop down menu in aDoc whose ID is identical to
   * the attribute's name.
   * @param aCard {nsIAbCard} The card to get the values from.
   * @param aDoc  {Document Object} The document.
   */
  GetCardValues: function CardDialogOverlay_GetCardValues(aCard, aDoc) {
    // iterate through all the added type elements and get the card's value for
    // each one of them to set as the value for the element
    for (var attr in com.gContactSync.gAttributes) {
      try {
        var elem = aDoc.getElementById(attr);
        // if the element exists, set its value as the card's value
        if (elem) {
          var value;
          if (aCard.getProperty) // post Bug 413260
            value = aCard.getProperty(attr, null);
          else // pre Bug 413260
            value = aCard.getStringAttribute(attr);
          // set the element's value if attr isn't a type OR it is a type and
          // the card's value for the attribute isn't null or blank
          if (attr.indexOf("Type") == -1 || (value && value != "")) {
            elem.value = value;
          }
        }
      } catch (e) { com.gContactSync.alertError("Error in com.gContactSync.GetCardValues: " + attr + "\n" + e); }
    }
  
    if (com.gContactSync.isDummyEmail(aDoc.getElementById("PrimaryEmail").value))
      aDoc.getElementById("PrimaryEmail").value = null;
  },
  /**
   * Sets up a type menu list element with a menuitem for each string in the
   * array.
   * @param aBox   {XUL Box} The box element to which this menu list is added.
   * @param aArray {array}  The array of values to set for the menuitems.  There
   *                        must be a string in the string bundle with the same
   *                        name as the value.
   * @param aID    {string} The ID for this menu list, which should be the name
   *                        of the attribute with Type added to the end, such as
   *                        WorkNumberType
   * @param aValue {string} The default value to set for this list.
   * @param aWidth {int}    The maximum width, if any.
   *
   * @returns {XULElement}  The menulist element.
   */
  addMenuItems: function CardDialogOverlay_addMenuItems(aBox, aArray, aID, aValue, aWidth) {
    var menuList = document.createElement("menulist");
    menuList.setAttribute("id", aID);
    var menuPopup = document.createElement("menupopup");
    // put the default value first in the menupopup, if possible
    var index = aArray.indexOf(aValue);
    var elem;
    if (index != -1) {
      elem = document.createElement("menuitem");
      elem.setAttribute("value", aValue);
      elem.setAttribute("label", com.gContactSync.StringBundle.getStr(aValue ? aValue : "blank"));
      aArray[index] = null;
      menuPopup.appendChild(elem);
    }
    // then add the other values
    for (var i = 0; i < aArray.length; i++) {
      if (!aArray[i]) { // if this element is null it was the default value
        aArray[i] = aValue; // so restore its value and skip adding it again
        continue;
      }
      elem = document.createElement("menuitem");
      elem.setAttribute("value", aArray[i]);
      elem.setAttribute("label", com.gContactSync.StringBundle.getStr(aArray[i]));
      menuPopup.appendChild(elem);
    }
    menuList.setAttribute("sizetopopup", "always");
    if (aWidth) {
      menuList.setAttribute("width", aWidth);
      menuList.style.width = aWidth;
      menuList.style.maxWidth = aWidth;
    }
    // add the popup to the menu list
    menuList.appendChild(menuPopup);
    // disable the menu list if this card is read-only
    menuList.setAttribute("disabled", com.gContactSync.CardDialogOverlay.mDisabled);
    // add the menu list to the box
    aBox.appendChild(menuList);
    return menuList;
  },
  /**
   * Adds an hbox containing a label and textbox for a phone number.
   * @param aID    {string} The ID for the textbox.
   * @param aLabel {string} The text for the textbox's label.
   */
  setupNumBox: function CardDialogOverlay_setupNumBox(aID, aLabel) {
    var box = document.createElement("hbox");
    box.setAttribute("align", "center");
    var spacer = document.createElement("spacer");
    spacer.setAttribute("flex", 1);
    box.appendChild(spacer);
    var label = document.createElement("label");
    label.setAttribute("control", aID);
    label.setAttribute("value", aLabel);
    box.appendChild(label);
    var textbox = document.createElement("textbox");
    textbox.setAttribute("id", aID);
    textbox.setAttribute("class", "PhoneEditWidth");
    if (com.gContactSync.CardDialogOverlay.mDisabled)
      textbox.setAttribute("readonly", true);
    else if (textbox.hasAttribute("readonly"))
      textbox.removeAttribute("readonly");
    textbox.setAttribute("width", "150px");
    box.appendChild(textbox);
    return box;
  }
};
