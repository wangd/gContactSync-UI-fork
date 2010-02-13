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

/**
 * Stores information on Preferences related to gContactSync.
 * @class
 */
com.gContactSync.Preferences = {
  /** The preferences service */
  mService: Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefService),
  /** The Preferences branch used by gContactSync */
  mSyncBranch: Components.classes["@mozilla.org/preferences-service;1"]
                         .getService(Components.interfaces.nsIPrefService)
                         .getBranch("extensions.gContactSync.")
                        .QueryInterface(Components.interfaces.nsIPrefBranch2),
  mExtendedProperties: [],
  /** different types of preferences (bool, int, and char) */
  mTypes: {
    /** Boolean preference */
    BOOL: "bool",
    /** Integer preference */
    INT:  "int",
    /** String preference */
    CHAR: "char"
  },
  /**
   * Preferences related to gContactSync
   * verboseLog is first since it is used when logging preferences
   */
  mSyncPrefs: {
    verboseLog:               new com.gContactSync.Pref("verboseLog",         "bool", true),
    initialDelay:             new com.gContactSync.Pref("initialDelay",       "int",  500),
    refreshInterval:          new com.gContactSync.Pref("refreshInterval",    "int",  30),
    accountDelay:             new com.gContactSync.Pref("accountDelay",       "int",  5000),
    maxContacts:              new com.gContactSync.Pref("maxContacts",        "int",  5000),
    syncExtended:             new com.gContactSync.Pref("syncExtended",       "bool", true),
    overrideCopy:             new com.gContactSync.Pref("overrideCopy",       "bool", true),
    autoSync:                 new com.gContactSync.Pref("autoSync",           "bool", true),
    syncGroups:               new com.gContactSync.Pref("syncGroups",         "bool", true),
    removeOldAddresses:       new com.gContactSync.Pref("removeOldAddresses", "bool", true),
    enableSyncBtn:            new com.gContactSync.Pref("enableSyncBtn",      "bool", true),
    enableMenu:               new com.gContactSync.Pref("enableMenu",         "bool", true),
    enableLogging:            new com.gContactSync.Pref("enableLogging",      "bool", true),
    readOnly:                 new com.gContactSync.Pref("readOnly",           "bool", false),
    writeOnly:                new com.gContactSync.Pref("writeOnly",          "bool", false),
    forceBtnImage:            new com.gContactSync.Pref("forceBtnImage",      "bool", false),
    myContacts:               new com.gContactSync.Pref("myContacts",         "bool", false),
    parseNames:               new com.gContactSync.Pref("parseNames",         "bool", true),
    phoneColLabels:           new com.gContactSync.Pref("phoneColLabels",     "bool", true),
    phoneTypes:               new com.gContactSync.Pref("phoneTypes",         "bool", true),
    newColLabels:             new com.gContactSync.Pref("newColLabels",       "bool", true),
    dummyEmail:               new com.gContactSync.Pref("dummyEmail",         "bool", true),
    enableImUrls:             new com.gContactSync.Pref("enableImUrls",       "bool", true),
    fixDupContactManagerCSS:  new com.gContactSync.Pref("fixDupContactManagerCSS", "bool", false),
    getPhotos:                new com.gContactSync.Pref("getPhotos",          "bool", true),
    sendPhotos:               new com.gContactSync.Pref("sendPhotos",         "bool", true),
    addReset:                 new com.gContactSync.Pref("addReset",           "bool", true),
    myContactsName:           new com.gContactSync.Pref("myContactsName",     "char", "My Contacts"),
    addressBookName:          new com.gContactSync.Pref("addressBookName",    "char", "Google Contacts"),
    lastVersion:              new com.gContactSync.Pref("lastVersion",        "char", "0"),
    Plugin:                   new com.gContactSync.Pref("Plugin",             "char", "Google"),
    Disabled:                 new com.gContactSync.Pref("Disabled",           "char", "false"),
    updateGoogleInConflicts:  new com.gContactSync.Pref("updateGoogleInConflicts",  "bool", true)
  },
  /**
   * Gets a preference given its branch, name, and type
   * @param aBranch   {nsIPrefBranch} The branch where the preference is stored.
   * @param aName     {string} The name of the preference
   * @param aType     {string} The type of preference.
   *                           Must be in Preferences.mTypes.
   */
  getPref: function Preferences_getPref(aBranch, aName, aType) {
    if (!aBranch)
      throw "Invalid aBranch parameter supplied to the getPref method" +
            com.gContactSync.StringBundle.getStr("pleaseReport");
    switch (aType) {
      case this.mTypes.INT:
        return aBranch.getIntPref(aName);
      case this.mTypes.BOOL:
        return aBranch.getBoolPref(aName);
      case this.mTypes.CHAR:
        return aBranch.getCharPref(aName);
      default:
        throw "Invalid aType parameter supplied to the getPref method" +
              com.gContactSync.StringBundle.getStr("pleaseReport");
    }
  },
  /**
   * Sets a preference given its branch, name, type and value.
   * @param aBranch   {nsIBranch} The branch where the preference is stored.
   * @param aName     {string}    The name of the preference.
   * @param aType     {string}    The type of preference.
   *                              Must be in Preferences.mTypes.
   * @param aValue    {string}    The value to set the preference.
   */
  setPref: function Preferences_setPref(aBranch, aName, aType, aValue) {
    if (!aBranch)
      throw "Invalid aBranch parameter supplied to the setPref method" +
            com.gContactSync.StringBundle.getStr("pleaseReport");
    switch (aType) {
      case this.mTypes.INT:
        return aBranch.setIntPref(aName, aValue);
      case this.mTypes.BOOL:
        return aBranch.setBoolPref(aName, aValue);
      case this.mTypes.CHAR:
        return aBranch.setCharPref(aName, aValue);
      default:
        throw "Invalid aType parameter supplied to the setPref method" +
              com.gContactSync.StringBundle.getStr("pleaseReport");
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
      if (i == "verboseLog") {
        com.gContactSync.LOGGER.VERBOSE_LOG("\n***Loading Preferences***");
      }
      com.gContactSync.LOGGER.VERBOSE_LOG(" * " + i + ": " + this.mSyncPrefs[i].value);
    }
    com.gContactSync.LOGGER.VERBOSE_LOG("***Finished Loading Preferences***\n");
    // only add these extended properties if the pref to sync them is true
    this.mExtendedProperties = [];
    if (this.mSyncPrefs.syncExtended.value)
      for (var i = 1; i <= 10; i++)
        this.mExtendedProperties.push(this.getPref(this.mSyncBranch,
                                                   "extended" + i,
                                                   this.mTypes.CHAR));
  }
};
