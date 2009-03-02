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
// when the window is loaded wait 200 ms and try to add the tab
window.addEventListener("load", function CardDialogOverlay_loadListener(e) {
  CardDialogOverlay.init();
}, false);
// the original method CheckAndSetCardValues
var originalCheckAndSetCardValues;
var gAttributes = {
  "ThirdEmail" : {}, 
  "FourthEmail" : {},
  "TalkScreenName" : {},
  "JabberScreenName" : {},
  "YahooScreenName" : {},
  "MSNScreenName" : {},
  "ICQScreenName" : {},
  "OtherAddress" : {},
  "HomeFaxNumber" : {},
  "OtherNumber" : {},
  "FullHomeAddress" : {},
  "FullWorkAddress" : {},
  "PrimaryEmailType" : {},
  "SecondEmailType" : {},
  "ThirdEmailType" : {},
  "FourthEmailType" : {},
  "_AimScreenNameType" : {},
  "TalkScreenNameType" : {},
  "JabberScreenNameType" : {},
  "YahooScreenNameType" : {},
  "MSNScreenNameType" : {},
  "ICQScreenNameType" : {},
  "WorkPhoneType" : {},
  "HomePhoneType" : {},
  "FaxNumberType" : {},
  "CellularNumberType" : {},
  "PagerNumberType" : {},
  "HomeFaxNumberType" : {},
  "OtherNumberType" : {}
};
/**
 * CardDialogOverlay
 * Adds a tab to the tab box in the New and Edit Card Dialogs.  Using JavaScript
 * is necessary because the tab box doesn't have an ID.
 * @class
 */
var CardDialogOverlay = {
  mNamespace: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
  mLoadNumber: 0,
  mDisabled: false,
  /**
   * editCardDialog.init
   * Adds a tab to the tab box, if possible.  Waits until the abCardOverlay is
   * loaded.
   */
  init: function CardDialogOverlay_init() {
    // if it isn't finished loading yet wait another 200 ms and try again
    if (!document.getElementById("abTabs")) {
      // if it has tried to load more than 50 times something is wrong, so quit
      if (this.mLoadNumber < 50)
        setTimeout("CardDialogOverlay.init", 200);
      this.mLoadNumber++;
      return;
    }
    StringBundle.init(); // initialize the string bundle

    try {
      // QI the card if it doesn't have the getProperty method
      // if the card cannot accept custom attributes, quit and do not add the
      // extra tabs
      if (!gEditCard.card.getProperty)
        gEditCard.card.QueryInterface(Ci.nsIAbMDBCard);
    } catch(e) { return; }
    // some contacts are read-only so extra attributes should be disabled for
    // those cards (see Mozdev Bug 20169)
    try {
      this.mDisabled = document.getElementById("PreferMailFormatPopup").disabled;
    } catch (e) {
      alert("Error while determining if contact is read-only: " + e)
    }
    // add the email type drop down menus
    try {
      var arr = ["other", "home", "work"];
      var primaryEmailBox = document.getElementById("PrimaryEmail").parentNode;
      addMenuItems(primaryEmailBox, arr, "PrimaryEmailType", "other");
      var secondEmailBox = document.getElementById("SecondEmail").parentNode;
      addMenuItems(secondEmailBox, arr, "SecondEmailType", "other");
      var thirdEmailBox = document.getElementById("ThirdEmail").parentNode;
      addMenuItems(thirdEmailBox, arr, "ThirdEmailType", "other");
      var fourthEmailBox = document.getElementById("FourthEmail").parentNode;
      addMenuItems(fourthEmailBox, arr, "FourthEmailType", "other");
    } catch(e) { alert("Unable to setup email types: " + e); }
    try {
      // add drop down menus for screen name protocols
      var arr = ["AIM", "GOOGLE_TALK", "ICQ", "YAHOO", "MSN", "JABBER"];
      var aimBox = document.getElementById("ScreenName").parentNode;
      addMenuItems(aimBox, arr, "_AimScreenNameType", "AIM");
      var talkBox = document.getElementById("TalkScreenName").parentNode;
      addMenuItems(talkBox, arr, "TalkScreenNameType", "GOOGLE_TALK");
      var icqBox = document.getElementById("ICQScreenName").parentNode;
      addMenuItems(icqBox, arr, "ICQScreenNameType", "ICQ");
      var yahooBox = document.getElementById("YahooScreenName").parentNode;
      addMenuItems(yahooBox, arr, "YahooScreenNameType", "YAHOO");
      var msnBox = document.getElementById("MSNScreenName").parentNode;
      addMenuItems(msnBox, arr, "MSNScreenNameType", "MSN");
      var jabberBox = document.getElementById("JabberScreenName").parentNode;
      addMenuItems(jabberBox, arr, "JabberScreenNameType", "JABBER");
    }
    catch(e) {
      alert("Unable to setup screen name protocol menus\n" + e);
    }
    try {
      //swap pager and mobile phone textboxes and values
      var pager = document.getElementById("PagerNumber");
      pager.setAttribute("id", "tmp");
      var pagerValue = pager.value;
      var mobile = document.getElementById("CellularNumber");
      mobile.setAttribute("id", "PagerNumber");
      pager.setAttribute("id", "CellularNumber");
      pager.value = mobile.value;
      mobile.value = pagerValue;
    }
    catch (e) {
      alert("Unable to swap pager and mobile number values\n" + e);
    }
    var newDialog = false; // post-Mailnews Core Bug 63941
    var pager;
    try {
      // then replace all phone labels and remove the access keys
      var work = document.getElementById("WorkPhone");
      var workLabel = work.parentNode.previousSibling;
      if (!workLabel) {
        newDialog = true;
        workLabel = work.previousSibling;
      }
      workLabel.value = StringBundle.getStr("first");
      workLabel.setAttribute("accesskey", "");
      var home = document.getElementById("HomePhone");
      var homeLabel = newDialog ? home.previousSibling
                                : home.parentNode.previousSibling;
      homeLabel.value = StringBundle.getStr("second");
      homeLabel.setAttribute("accesskey", "");
      var fax = document.getElementById("FaxNumber");
      var faxLabel = newDialog ? fax.previousSibling
                               : fax.parentNode.previousSibling;
      faxLabel.value = StringBundle.getStr("third");
      faxLabel.setAttribute("accesskey", "");
      var mobile = document.getElementById("CellularNumber");
      var mobileLabel = newDialog ? mobile.previousSibling
                                  : mobile.parentNode.previousSibling;
      mobileLabel.value = StringBundle.getStr("fourth");
      mobileLabel.setAttribute("accesskey", "");
      pager = document.getElementById("PagerNumber");
      var pagerLabel = newDialog ? pager.previousSibling
                                 : pager.parentNode.previousSibling;
      pagerLabel.value = StringBundle.getStr("fifth");
      pagerLabel.setAttribute("accesskey", "");
    }
    catch(e) {
      alert("Unable to replace phone labels and remove access keys\n" + e);
    }
    var phoneTypes = ["work", "home", "work_fax", "mobile", "pager", "home_fax",
                      "other"];
    try {
      // setup the types for the phone numbers
      var workBox = work.parentNode;
      addMenuItems(workBox, phoneTypes, "WorkPhoneType", "work");
      var homeBox = home.parentNode;
      addMenuItems(homeBox, phoneTypes, "HomePhoneType", "home");
      var faxBox = fax.parentNode;
      addMenuItems(faxBox, phoneTypes, "FaxNumberType", "work_fax");
      var mobileBox = mobile.parentNode;
      addMenuItems(mobileBox, phoneTypes, "CellularNumberType", "mobile");
      var pagerBox = pager.parentNode;
      addMenuItems(pagerBox, phoneTypes, "PagerNumberType", "pager");
      var homeFaxBox = document.getElementById("HomeFaxNumber").parentNode;
      addMenuItems(homeFaxBox, phoneTypes, "HomeFaxNumberType", "home_fax");
      var otherNumberBox = document.getElementById("OtherNumber").parentNode;
      addMenuItems(otherNumberBox, phoneTypes, "OtherNumberType", "other");
    }
    catch(e) {
      alert("Unable to setup phone number types\n" + e);
    }
    
    var tabs = document.getElementById("abTabs")
    try {
      // setup the new screenname/e-mail address/phone numbers tab
      var myTab = document.createElementNS(this.mNamespace, "tab");
      myTab.setAttribute("label", "gContactSync");
      myTab.setAttribute("id", "gContactSyncTab");
      // add the new tab to the dialog
      tabs.appendChild(myTab);
      
    }
    catch(e) {
      alert("Unable to setup the extra tabs\n" + e);
    }
    if (newDialog) {
      try {
        // show the addresses on the one and only tab in the second column
        document.getElementById("addresses").removeAttribute("hidden");
        // add the sixth and seventh numbers below 1 - 5
        var sixthNum = setupNumBox("SixthNumber", StringBundle.getStr("sixth"));
        pager.parentNode.parentNode.appendChild(sixthNum);
        addMenuItems(sixthNum, phoneTypes, "SixthNumberType", "other");
        var seventhNum = setupNumBox("SeventhNumber",
                                     StringBundle.getStr("seventh"));
        pager.parentNode.parentNode.appendChild(seventhNum);
        addMenuItems(seventhNum, phoneTypes, "SeventhNumberType", "other");

        // make a tab for extra e-mail addresses and screennames
        var extraTab = document.createElement("tab");
        extraTab.setAttribute("label", "gContactSync");
        extraTab.setAttribute("id", "extraTab");
        // make another address tab
        var addressTab = document.createElement("tab");
        addressTab.setAttribute("label", "gContactSync 2");
        addressTab.setAttribute("id", "gContactSyncTab");
        // fix the width of the dialog
        window.sizeToContent();
      }
      catch(e) {
        alert("Unable to setup the extra tabs\n" + e);
      }
    }
    // if this is the old dialog, show the extra phone numbers on the 1st tab
    // and display a second tab for addresses
    else {
      document.getElementById("numbersGroupBox").removeAttribute("hidden");
      // setup the new address tab
      var myAddressTab = document.createElementNS(this.mNamespace, "tab");
      myAddressTab.setAttribute("label", "gContactSync 2");
      myAddressTab.setAttribute("id", "gContactSyncTab2");
      tabs.appendChild(myAddressTab);
    }
    
    // if this is a read-only card, make added elements disabled
    // the menulists are already taken care of
    if (this.mDisabled) {
      document.getElementById("ThirdEmail").readOnly = true;
      document.getElementById("FourthEmail").readOnly = true;
      document.getElementById("TalkScreenName").readOnly = true;
      document.getElementById("ICQScreenName").readOnly = true;
      document.getElementById("YahooScreenName").readOnly = true;
      document.getElementById("MSNScreenName").readOnly = true;
      document.getElementById("JabberScreenName").readOnly = true;
      document.getElementById("HomeFaxNumber").readOnly = true;
      document.getElementById("OtherNumber").readOnly = true;
      document.getElementById("FullHomeAddress").readOnly = true;
      document.getElementById("FullWorkAddress").readOnly = true;
      document.getElementById("OtherAddress").readOnly = true;
    }

    // override the check and set card values function
    originalCheckAndSetCardValues = CheckAndSetCardValues;
    CheckAndSetCardValues = myCheckAndSetCardValues;
    // get the extra card values
    myGetCardValues(gEditCard.card, document);
  }
}

function setupNumBox(aID, aLabel) {
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
  textbox.setAttribute("readonly", CardDialogOverlay.mDisabled);
  box.appendChild(textbox);
  return box;
}

/**
 * addMenuItems
 * Sets up a type menu list element with a menuitem for each string in the
 * array.
 * @param aBox   The box element to which this menu list is added.
 * @param aArray The array of values to set for the menuitems.  There must be a
 *               a string in the string bundle with the same name as the value.
 * @param aID    The ID for this menu list, which should be the name of the
 *               attribute with Type added to the end, such as WorkNumberType
 * @param aValue The default value to set for this list.
 */
function addMenuItems(aBox, aArray, aID, aValue) {
  var menuList = document.createElement("menulist");
  menuList.setAttribute("id", aID);
  var menuPopup = document.createElement("menupopup");
  // put the default value first in the menupopup, if possible
  var index = aArray.indexOf(aValue);
  if (index != -1) {
    var elem = document.createElement("menuitem");
    elem.setAttribute("value", aValue);
    elem.setAttribute("label", StringBundle.getStr(aValue));
    aArray[index] = null;
    menuPopup.appendChild(elem);
  }
  // then add the other values
  for (var i = 0; i < aArray.length; i++) {
    if (!aArray[i]) { // if this element is null it was the default value
      aArray[i] = aValue; // so restore its value and skip adding it again
      continue;
    }
    var elem = document.createElement("menuitem");
    elem.setAttribute("value", aArray[i]);
    elem.setAttribute("label", StringBundle.getStr(aArray[i]));
    menuPopup.appendChild(elem);
  }
  // add the popup to the menu list
  menuList.appendChild(menuPopup);
  // disable the menu list if this card is read-only
  menuList.setAttribute("disabled", CardDialogOverlay.mDisabled);
  // add the menu list to the box
  aBox.appendChild(menuList);
}
/**
 * A method that gets all of the attributes added by this extension and sets
 * the value of the textbox or drop down menu in aDoc whose ID is identical to
 * the attribute's name.
 * @param aCard The card to get the values from.
 * @param aDoc  The document.
 */
function myGetCardValues(aCard, aDoc) {
  // iterate through all the added type elements and get the card's value for
  // each one of them to set as the value for the element
  for (var attr in gAttributes) {
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
    } catch(e) { alert("Error in myGetCardValues: " + attr + "\n" + e); }
  }

  if (isDummyEmail(aDoc.getElementById("PrimaryEmail").value)) {
    aDoc.getElementById("PrimaryEmail").value = null;
  }
}
/**
 * Sets the attributes added by this extension as the value in the textbox or
 * drop down menu in aDoc whose ID is identical to the attribute's name.
 * Calls the original CheckAndSetCardValues function when finished.
 * @param aCard  The card to set the values for.
 * @param aDoc   The document.
 * @param aCheck Unused, but passed to the original method.
 */
function myCheckAndSetCardValues(aCard, aDoc, aCheck) {
  
  var existingTypes = {
    "WorkPhoneType" : {},
    "HomePhoneType" : {},
    "FaxNumberType" : {},
    "CellularNumberType" : {},
    "PagerNumberType" : {},
  }
  // iterate through all the added attributes and types and set the card's value
  // for each one of them
  for (var attr in gAttributes) {
    try {
      // if the element exists, set the card's value as its value
      var elem = aDoc.getElementById(attr);
      if (elem) {
        var value = elem.value;
        if (aCard.setProperty) // post Bug 413260
          aCard.setProperty(attr, value);
        else { // pre Bug 413260
          // if it is a number type, use setCardValue
          if (existingTypes[attr])
            aCard.setCardValue(attr, value);
          else
            aCard.setStringAttribute(attr, value);
        }
      }
    } catch(e) { alert("Error in myCheckAndSetCardValues: " + attr + "\n" + e); }
  }
  if (!aCard.getProperty)
    aCard.editCardToDatabase(gEditCard.abURI);
  // ensure that every contact edited through this dialog has at least a dummy
  // e-mail address
  var primEmailElem = aDoc.getElementById("PrimaryEmail");
  try {
  if (!primEmailElem.value || primEmailElem.value == "")
    primEmailElem.value = makeDummyEmail(aCard);
    }catch (e) {alert(e);}
  // call the original and return its return value
  return originalCheckAndSetCardValues(aCard, aDoc, aCheck);
}
