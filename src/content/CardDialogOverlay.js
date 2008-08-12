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
var originalCheckAndSetCardValues;
var gAttributes = [
  "ThirdEmail", 
  "FourthEmail",
  "TalkScreenName",
  "JabberScreenName",
  "YahooScreenName",
  "MSNScreenName",
  "ICQScreenName",
  "ThirdEmail",
  "FourthEmail",
  "OtherAddress",
  "HomeFaxNumber",
  "OtherNumber",
  "FullHomeAddress",
  "FullWorkAddress"
];
const Ci = Components.interfaces;
var abVersion;
/**
 * CardDialogOverlay
 * Adds a tab to the tab box in the New and Edit Card Dialogs.  Using JavaScript
 * is necessary because the tab box doesn't have an ID.
 * @class
 */
var CardDialogOverlay = {
  mNamespace: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
  mLoadNumber: 0,
  /**
   * editCardDialog.init
   * Adds a tab to the tab box, if possible.  Waits until the abCardOverlay is
   * loaded.
   */
  init: function() {
    // if it isn't finished loading yet wait another 200 ms and try again
    if (!document.getElementById("abTabs")) {
      // if it has tried to load more than 50 times something is wrong, so quit
      if (this.mLoadNumber < 50)
        setTimeout("editCardDialog.init", 200);
      this.mLoadNumber++;
      return;
    }
    StringBundle.init(); // initialize the string bundle
    // try to QI the card.  If it cannot be done, don't add the tab 
    try {
      // QI the card if it doesn't have the getProperty method
      if (!gEditCard.card.getProperty)
        gEditCard.card.QueryInterface(Ci.nsIAbMDBCard);
      // add the type for the primary and second email addresses
      try {
      var primaryEmail = document.getElementById("PrimaryEmail");
      if (primaryEmail && primaryEmail.parentNode) {
        var box = primaryEmail.parentNode;
        var menuList = document.createElement("menulist");
        menuList.setAttribute("id", "PrimaryEmailType");
        var menuPopup = document.createElement("menupopup");
        var other = document.createElement("menuitem");
        other.setAttribute("value", "other");
        other.setAttribute("label", StringBundle.getStr("other"));
        var home = document.createElement("menuitem");
        home.setAttribute("value", "home");
        home.setAttribute("label", StringBundle.getStr("home"));
        var work = document.createElement("menuitem");
        work.setAttribute("value", "work");
        work.setAttribute("label", StringBundle.getStr("work"));
        menuPopup.appendChild(other);
        menuPopup.appendChild(home);
        menuPopup.appendChild(work);
        menuList.appendChild(menuPopup);
        box.appendChild(menuList);
      }
      } catch(e) {alert(e);}
      try {
      var secondEmail = document.getElementById("SecondEmail");
      if (secondEmail && secondEmail.parentNode) {
        var box = secondEmail.parentNode;
        var menuList = document.createElement("menulist");
        menuList.setAttribute("id", "SecondEmailType");
        var menuPopup = document.createElement("menupopup");
        var other = document.createElement("menuitem");
        other.setAttribute("value", "other");
        other.setAttribute("label", StringBundle.getStr("other"));
        var home = document.createElement("menuitem");
        home.setAttribute("value", "home");
        home.setAttribute("label", StringBundle.getStr("home"));
        var work = document.createElement("menuitem");
        work.setAttribute("value", "work");
        work.setAttribute("label", StringBundle.getStr("work"));
        menuPopup.appendChild(other);
        menuPopup.appendChild(home);
        menuPopup.appendChild(work);
        menuList.appendChild(menuPopup);
        box.appendChild(menuList);
      }
      } catch(e) {alert(e);}
      myGetCardValues(gEditCard.card, document);
      // override the check and set card values function
      originalCheckAndSetCardValues = CheckAndSetCardValues;
      CheckAndSetCardValues = myCheckAndSetCardValues;
      // setup the new tab
      var myTab = document.createElementNS(this.mNamespace, "tab");
      myTab.setAttribute("label", "gContactSync");
      myTab.setAttribute("id", "gContactSyncTab");
      var myAddressTab = document.createElementNS(this.mNamespace, "tab");
      myAddressTab.setAttribute("label", "gContactSync 2"); //StringBundle.getStr("AddressTab"));
      myAddressTab.setAttribute("id", "gContactSyncTab2");
      document.getElementById("abTabs").appendChild(myTab);
      document.getElementById("abTabs").appendChild(myAddressTab);
      // get the new card values
      myGetCardValues(gEditCard.card, document);
    } catch(e) {}
  }
}
// when the window is loaded wait 200 ms and try to add the tab
window.addEventListener("load", function(e) { CardDialogOverlay.init(); }, false);

/**
 * A method that sets the gets all of the attributes added by this extension and
 * sets the value of the textbox in aDoc whose ID is the same as the attribute's
 * name.
 * @param aCard The card to get the values from.
 * @param aDoc  The document.
 */
function myGetCardValues(aCard, aDoc) {
  for (var i in gAttributes) {
    if (gAttributes[i].indexOf("Type") != -1)
      continue;
    try {
      var typeElem = aDoc.getElementById(gAttributes[i] + "Type");
      if (aCard.getProperty) { // post Bug 413260
        aDoc.getElementById(gAttributes[i]).value = aCard.getProperty(gAttributes[i], null);
        if (typeElem) {
          var type = aCard.getProperty(gAttributes[i] + "Type", "");
          // default type is "other" if not present
          type = type && type != "" ? type : "other";
          typeElem.value = type;
        }
      }
      else { // pre Bug 413260
        aDoc.getElementById(gAttributes[i]).value = aCard.getStringAttribute(gAttributes[i]);
        if (typeElem) {
          var type = aCard.getStringAttribute(gAttributes[i] + "Type");
          // default type is "other" if not present
          type = type && type != "" ? type : "other";
          typeElem.value = type;
        }
      }
    }
    catch(e) { LOGGER.LOG_WARNING("Error in myGetCardValues: " + e); }
  }
  // get the primary and second email types
  try {
    var typeElem1 = aDoc.getElementById("PrimaryEmailType");
    var typeElem2 = aDoc.getElementById("SecondEmailType");
    if (typeElem1 && typeElem2) {
      if (aCard.getProperty) { // post Bug 413260
        var type1 = aCard.getProperty("PrimaryEmailType", "");
        // default type is "other" if not present
        type1 = type1 && type1 != "" ? type1 : "other";
        typeElem1.value = type1;
        var type2 = aCard.getProperty("SecondEmailType", "");
        // default type is "other" if not present
        type2 = type2 && type2 != "" ? type2 : "other";
        typeElem2.value = type2;
      }
      else { // pre Bug 413260
        var type1 = aCard.getStringAttribute("PrimaryEmailType");
        // default type is "other" if not present
        type1 = type && type1 != "" ? type1 : "other";
        typeElem1.value = type1;
        var type2 = aCard.getStringAttribute("PrimaryEmailType");
        // default type is "other" if not present
        type2 = type2 && type2 != "" ? type2 : "other";
        typeElem2.value = type2;
      }
    }
  } catch(e) { LOGGER.LOG_WARNING("Error in myGetCardValues: " + e); }
}
/**
 * Sets the attributes added by this extension as the value in the textboxes
 * in aDoc that have the same ID as the attribute's name.
 * Calls the original CheckAndSetCardValues function when finished.
 * @param aCard  The card to set the values for.
 * @param aDoc   The document.
 * @param aCheck Unused, but passed to the original method.
 */
function myCheckAndSetCardValues(aCard, aDoc, aCheck) {
  for (var i in gAttributes) {
    if (gAttributes[i].indexOf("Type") != -1)
      continue;
    try {
      var value;
      var type;
      if (aDoc.getElementById(gAttributes[i])) {
        value = aDoc.getElementById(gAttributes[i]).value;
        type = aDoc.getElementById(gAttributes[i] + "Type");
        if (type)
          type = type.value;
        type = type ? type : ""; // make sure type isn't null
        if (aCard.getProperty) { // post Bug 413260
          aCard.setProperty(gAttributes[i], value);
          aCard.setProperty(gAttributes[i] + "Type", type);
        }
        else { // pre Bug 413260
          aCard.setStringAttribute(gAttributes[i], value);
          aCard.setStringAttribute(gAttributes[i] + "Type", type);
        }
      }
    } catch(e) { LOGGER.LOG_WARNING("Error in myCheckAndSetCardValues: " + e); }
  }
  // set the primary and second email types
  try {
    var type;
    type1 = aDoc.getElementById("PrimaryEmailType");
    type2 = aDoc.getElementById("SecondEmailType");
    if (type1)
      type1 = type1.value;
    type1 = type1 ? type1 : ""; // make sure type isn't null
    if (type2)
      type2 = type2.value;
    type2 = type2 ? type2 : ""; // make sure type isn't null
    if (aCard.getProperty) { // post Bug 413260
      aCard.setProperty("PrimaryEmailType", type1);
      aCard.setProperty("SecondEmailType", type2);
    }
    else { // pre Bug 413260
      aCard.setStringAttribute("PrimaryEmailType", type1);
      aCard.setStringAttribute("SecondEmailType", type2);
    }
  } catch(e) { LOGGER.LOG_WARNING("Error in myCheckAndSetCardValues: " + e); }
  return originalCheckAndSetCardValues(aCard, aDoc, aCheck);
}
