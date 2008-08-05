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
    // try to QI the card.  If it cannot be done, don't add the tab 
    try {
      // QI the card if it doesn't have the getProperty method
      if (!gEditCard.card.getProperty)
        gEditCard.card.QueryInterface(Ci.nsIAbMDBCard);

      myGetCardValues(gEditCard.card, document);
      // override the check and set card values function
      originalCheckAndSetCardValues = CheckAndSetCardValues;
      CheckAndSetCardValues = myCheckAndSetCardValues;
      // setup the new tab
      var myTab = document.createElementNS(this.mNamespace, "tab");
      myTab.setAttribute("label", "gContactSync");
      myTab.setAttribute("id", "gContactSyncTab");
      document.getElementById("abTabs").appendChild(myTab);
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
    try {
      if (aCard.getProperty) // post Bug 413260
        aDoc.getElementById(gAttributes[i]).value = aCard.getProperty(gAttributes[i], null);
      else // pre Bug 413260
        aDoc.getElementById(gAttributes[i]).value = aCard.getStringAttribute(gAttributes[i]);
    }
    catch(e) { LOGGER.LOG_WARNING("Error in myGetCardValues: " + e); }
  }
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
    var value;
    if (aDoc.getElementById(gAttributes[i])) {
      value = aDoc.getElementById(gAttributes[i]).value;
      if (aCard.getProperty) // post Bug 413260
        aCard.setProperty(gAttributes[i], value);
      else // pre Bug 413260
        aCard.setStringAttribute(gAttributes[i], value);
    }
  }
  return originalCheckAndSetCardValues(aCard, aDoc, aCheck);
}
