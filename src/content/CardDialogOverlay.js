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
var gAttributes = {
  "ThirdEmail" : true, 
  "FourthEmail" : true,
  "TalkScreenName" : true,
  "JabberScreenName" : true,
  "YahooScreenName" : true,
  "MSNScreenName" : true,
  "ICQScreenName" : true,
  "OtherAddress" : true,
  "HomeFaxNumber" : true,
  "OtherNumber" : true,
  "FullHomeAddress" : true,
  "FullWorkAddress" : true,
  "PrimaryEmailType" : true,
  "SecondEmailType" : true,
  "ThirdEmailType" : true,
  "FourthEmailType" : true,
  "_AimScreenNameType" : true,
  "TalkScreenNameType" : true,
  "JabberScreenNameType" : true,
  "YahooScreenNameType" : true,
  "MSNScreenNameType" : true,
  "ICQScreenNameType" : true
};
var Ci = Components.interfaces;
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
        setTimeout("CardDialogOverlay.init", 200);
      this.mLoadNumber++;
      return;
    }
    StringBundle.init(); // initialize the string bundle
    // try to QI the card.  If it cannot be done, don't add the tab 
    try {
      // QI the card if it doesn't have the getProperty method
      // if the card cannot accept custom attributes, quit and do not add the
      // extra tabs
      if (!gEditCard.card.getProperty)
        gEditCard.card.QueryInterface(Ci.nsIAbMDBCard);
      // add the PrimaryEmail type drop down menu
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
      } catch(e) { LOGGER.LOG_WARNING("Unable to setup PrimaryEmailType", e); }
      // setup the SecondEmail type drop-down menu
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
      } catch(e) { LOGGER.LOG_WARNING("Unable to setup SecondEmailType", e); }
      try {
        // add the Screen Name drop down
        var screenName = document.getElementById("ScreenName");
        if (screenName && screenName.parentNode) {
          var box = screenName.parentNode;
          var menuList = document.createElement("menulist");
          menuList.setAttribute("id", "_AimScreenNameType");
          var menuPopup = document.createElement("menupopup");
          var aim = document.createElement("menuitem");
          aim.setAttribute("value", "AIM");
          aim.setAttribute("label", "AIM");
          var gtalk = document.createElement("menuitem");
          gtalk.setAttribute("value", "GOOGLE_TALK");
          gtalk.setAttribute("label", "Google Talk");
          var icq = document.createElement("menuitem");
          icq.setAttribute("value", "ICQ");
          icq.setAttribute("label", "ICQ");
          var yahoo = document.createElement("menuitem");
          yahoo.setAttribute("value", "YAHOO");
          yahoo.setAttribute("label", "Yahoo");
          var msn = document.createElement("menuitem");
          msn.setAttribute("value", "MSN");
          msn.setAttribute("label", "MSN");
          var jabber = document.createElement("menuitem");
          jabber.setAttribute("value", "JABBER");
          jabber.setAttribute("label", "Jabber");
          menuPopup.appendChild(aim);
          menuPopup.appendChild(gtalk);
          menuPopup.appendChild(icq);
          menuPopup.appendChild(yahoo);
          menuPopup.appendChild(msn);
          menuPopup.appendChild(jabber);
          menuList.appendChild(menuPopup);
          box.appendChild(menuList);
        }
      } catch(e) { LOGGER.LOG_WARNING("Unable to setup _AimScreenNameType", e); }
      myGetCardValues(gEditCard.card, document);
      // override the check and set card values function
      originalCheckAndSetCardValues = CheckAndSetCardValues;
      CheckAndSetCardValues = myCheckAndSetCardValues;
      // setup the new screenname/e-mail address/phone numbers tab
      var myTab = document.createElementNS(this.mNamespace, "tab");
      myTab.setAttribute("label", "gContactSync");
      myTab.setAttribute("id", "gContactSyncTab");
      // setup the new address tab
      var myAddressTab = document.createElementNS(this.mNamespace, "tab");
      myAddressTab.setAttribute("label", "gContactSync 2");
      myAddressTab.setAttribute("id", "gContactSyncTab2");
      // add the new tabs to the dialog
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
        if (attr.indexOf("Type") == -1 || (value && value != ""))
          elem.value = value;
      }
    } catch(e) { LOGGER.LOG_WARNING("Error in myGetCardValues: " + attr, e); }
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
  // iterate through all the added attributes and types and set the card's value
  // for each one of them
  for (var attr in gAttributes) {
    try {
      // if the element exists, set the card's value as its value
      var elem = aDoc.getElementById(attr);
      if (elem) {
        var value = elem.value;
        if (aCard.getProperty) // post Bug 413260
          aCard.setProperty(attr, value);
        else // pre Bug 413260
          aCard.setStringAttribute(attr, value);
      }
    } catch(e) { LOGGER.LOG_WARNING("Error in myCheckAndSetCardValues: " + attr, e); }
  }
  // call the original and return its return value
  return originalCheckAndSetCardValues(aCard, aDoc, aCheck);
}
