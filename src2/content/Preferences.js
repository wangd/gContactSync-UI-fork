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
/**
 * Preferences
 * Stores information on Preferences related to gContactSync.
 * @class
 */
var Preferences = {
  // the preferences service
  mService: Cc["@mozilla.org/preferences-service;1"]
             .getService(Ci.nsIPrefService),
  // the branch used by gContactSync
  mSyncBranch: Cc["@mozilla.org/preferences-service;1"]
               .getService(Ci.nsIPrefService)
               .getBranch("extensions.gContactSync.")
               .QueryInterface(Ci.nsIPrefBranch2),
  mExtendedProperties: [],
  // different types of preferences (bool, int, and char)
  mTypes: {
    BOOL: "bool",
    INT: "int",
    CHAR: "char"
  },
  // preferences related to gContactSync
  mSyncPrefs: {
    refreshInterval: new Pref("refreshInterval", "int", 30),
    maxContacts: new Pref("maxContacts", "int", 5000),
    addressBookName: new Pref("addressBookName", "char", "Google Contacts"),
    updateGoogleInConflicts: new Pref("updateGoogleInConflicts", "bool", true),
    confirmDuplicates: new Pref("confirmDuplicates", "bool", true),
    initialDelay: new Pref("initialDelay", "int", 500),
    verboseLog: new Pref("verboseLog", "bool", true),
    syncExtended: new Pref("syncExtended", "bool", true),
    overrideCopy: new Pref("overrideCopy", "bool", true),
    autoSync: new Pref("autoSync", "bool", true),
    syncGroups: new Pref("syncGroups", "bool", true),
    syncAddresses: new Pref("syncAddresses", "bool", true),
    removeOldAddresses: new Pref("removeOldAddresses", "bool", true),
    enableSyncBtn: new Pref("enableSyncBtn", "bool", true),
    enableMenu: new Pref("enableMenu", "bool", true),
    enableLogging: new Pref("enableLogging", "bool", true),
    listenerDeleteFromGoogle: new Pref("listenerDeleteFromGoogle", "bool", true),
    readOnly: new Pref("readOnly", "bool", false),
    writeOnly: new Pref("writeOnly", "bool", false),
    homeAddress: new Pref("homeAddress", "char", "[HomeAddress]\n[HomeAddress2]\n[HomeCity], [HomeState]  [HomeZipCode]\n[HomeCountry]"),
    workAddress: new Pref("workAddress", "char", "[WorkAddress]\n[WorkAddress2]\n[WorkCity], [WorkState]  [WorkZipCode]\n[WorkCountry]"),
    otherAddress: new Pref("otherAddress", "char", "[OtherAddress]\n[OtherAddress2]\n[OtherCity], [OtherState]  [OtherZipCode]\n[OtherCountry]")
  },
  /**
   * Preferences.getPref
   * Gets a preference given its branch, name, and type
   * @param aBranch   The branch where the preference is stored
   * @param aName     The name of the preference
   * @param aType     The type of preference.  Must be in Preferences.mTypes.
   */
  getPref: function Preferences_getPref(aBranch, aName, aType) {
    if (!aBranch)
      throw "Invalid aBranch parameter supplied to the getPref method" +
            StringBundle.getStr("pleaseReport");
    switch (aType) {
      case this.mTypes.INT:
        return aBranch.getIntPref(aName);
      case this.mTypes.BOOL:
        return aBranch.getBoolPref(aName);
      case this.mTypes.CHAR:
        return aBranch.getCharPref(aName);
      default:
        throw "Invalid aType parameter supplied to the getPref method" +
              StringBundle.getStr("pleaseReport");
    }
  },
  /**
   * Preferences.setPref
   * Sets a preference given its branch, name, type and value.
   * @param aBranch   The branch where the preference is (to be) stored.
   * @param aName     The name of the preference.
   * @param aType     The type of preference.  Must be in Preferences.mTypes.
   * @param aValue    The value to set the preference at.
   */
  setPref: function Preferences_setPref(aBranch, aName, aType, aValue) {
    if (!aBranch)
      throw "Invalid aBranch parameter supplied to the setPref method" +
            StringBundle.getStr("pleaseReport");
    switch (aType) {
      case this.mTypes.INT:
        return aBranch.setIntPref(aName, aValue);
      case this.mTypes.BOOL:
        return aBranch.setBoolPref(aName, aValue);
      case this.mTypes.CHAR:
        return aBranch.setCharPref(aName, aValue);
      default:
        throw "Invalid aType parameter supplied to the setPref method" +
              StringBundle.getStr("pleaseReport");
    }
  },
  /**
   * Preferences.getSyncPrefs
   * Tries to get each preference in mSyncPrefs and creates the preference and
   * sets its default value if it is not present.
   */
  getSyncPrefs: function Preferences_getSyncPrefs() {
    for (var i in this.mSyncPrefs) {
      try {
        this.mSyncPrefs[i].value = this.getPref(this.mSyncBranch,
                                                this.mSyncPrefs[i].label,
                                                this.mSyncPrefs[i].type);
      }
      catch (e) { // if it doesn't exist make it and set the value to its default
        this.mSyncPrefs[i].value = this.mSyncPrefs[i].defaultValue;
        this.setPref(this.mSyncBranch, this.mSyncPrefs[i].label,
                     this.mSyncPrefs[i].type, this.mSyncPrefs[i].defaultValue);
      }
    }
    // only add these extended properties if the pref to sync them is true
    this.mExtendedProperties = [];
    if (this.mSyncPrefs.syncExtended.value)
      for (var i = 1; i <= 10; i++)
        this.mExtendedProperties.push(this.getPref(this.mSyncBranch,
                                                   "extended" + i,
                                                   this.mTypes.CHAR));
  }
};
