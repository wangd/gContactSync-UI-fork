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

window.addEventListener("load", function optionsLoadListener(e) {
  initialize();
  window.sizeToContent();
 }, false);

/**
 * initialize
 * Initializes the string bundle, FileIO and Preferences scripts and fills the
 * login tree.
 */
function initialize() {
  StringBundle.init();
  FileIO.init();
  Preferences.getSyncPrefs();
  //document.getElementById("cMyContacts").addEventListener("change", myContactsChange, false);
  // if this is the full preferences dialog add a few event listeners
  if (document.getElementById("syncExtended")) {
    document.getElementById("syncExtended")
            .addEventListener("change", enableExtended, false);
    enableExtended();
    document.getElementById("autoSync")
            .addEventListener("change", enableDelays, false);
    enableDelays();
  }
  try {
    Accounts.initDialog();
  }
  catch (e) {}
}


/**
 * enableExtended
 * Enables or disables the extended property textboxes based on the state of
 * the syncExtended checkbox.
 */
function enableExtended() {
  var disableElem = document.getElementById("syncExtended");
  if (!disableElem) return false;
  var disable = !disableElem.value;
  document.getElementById("extended1").disabled  = disable;
  document.getElementById("extended2").disabled  = disable;
  document.getElementById("extended3").disabled  = disable;
  document.getElementById("extended4").disabled  = disable;
  document.getElementById("extended5").disabled  = disable;
  document.getElementById("extended6").disabled  = disable;
  document.getElementById("extended7").disabled  = disable;
  document.getElementById("extended8").disabled  = disable;
  document.getElementById("extended9").disabled  = disable;
  document.getElementById("extended10").disabled = disable;
  return true;
}

/**
 * enableDelays
 * Enables or disables the delay textboxes based on the auto sync checkbox.
 */
function enableDelays() {
  var disableElem  = document.getElementById("autoSync");
  var intervalElem = document.getElementById("refreshIntervalBox");
  var initialElem  = document.getElementById("initialDelayBox");
  if (!disableElem) return false;
  if (intervalElem)
    intervalElem.disabled = !disableElem.value;
  if (initialElem)
    initialElem.disabled  = !disableElem.value;
  return true;
}

// TODO move to AbManager (or GAbManager)
/**
 * resetAllSyncedABs
 * Resets all synchronized address books in the following ways:
 *  - Deletes all mailing lists
 *  - Deletes all contacts
 *  - Sets the last sync date to 0.
 * See AddressBook.reset for more details.
 *
 * It asks the user to restart Thunderbird when finished.
 *
 * @param showConfirm {boolean} Show a confirmation dialog first and quit if
 * the user presses Cancel.
 */
function resetAllSyncedABs(showConfirm) {
  if (showConfirm) {
    if (!confirm(StringBundle.getStr("confirmReset"))) {
      return false;
    }
  }

  LOGGER.LOG("Resetting all synchronized directories.");
  var abs = GAbManager.getSyncedAddressBooks(true);
  for (var i in abs) {
    abs[i].ab.reset();
  }
  
  LOGGER.LOG("Finished resetting all synchronized directories.");
  alert(StringBundle.getStr("pleaseRestart"));
  return true;
}
