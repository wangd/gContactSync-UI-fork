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
 * GAbManager
 * An object that can obtain address books by the name or URI, find the synced
 * address books, and edit contacts.
 * @class
 */
var GAbManager = AbManager;


/**
 * GAbManager.resetAllSyncedABs
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
GAbManager.resetAllSyncedABs = function GAbManager_resetSyncedABs(showConfirm) {
  if (showConfirm) {
    if (!confirm(com.gContactSync.StringBundle.getStr("confirmReset"))) {
      return false;
    }
  }

  com.gContactSync.LOGGER.LOG("Resetting all synchronized directories.");
  var abs = GAbManager.getSyncedAddressBooks(true);
  for (var i in abs) {
    abs[i].ab.reset();
  }
  
  com.gContactSync.LOGGER.LOG("Finished resetting all synchronized directories.");
  alert(com.gContactSync.StringBundle.getStr("pleaseRestart"));
  return true;
}
