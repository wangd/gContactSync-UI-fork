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
 * Portions created by the Initial Developer are Copyright (C) 2008-2010
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
  /** Initializes the Options class when the window has finished loading */
  function gCS_OptionsLoadListener(e) {
    com.gContactSync.Options.init();
    window.sizeToContent();
  },
false);

/**
 * Provides helper functions for the Preferences dialog.
 */
com.gContactSync.Options = {
  /**
   * Initializes the string bundle, FileIO and Preferences scripts and fills the
   * login tree.
   */
  init: function Options_init() {
    if (navigator.userAgent.indexOf("SeaMonkey") !== -1) {
      document.getElementById("chkEnableSyncBtn").collapsed = false;
      document.getElementById("chkForceBtnImage").collapsed = false;
    }
    // if this is the full preferences dialog add a few event listeners
    if (document.getElementById("syncExtended")) {
      document.getElementById("syncExtended")
              .addEventListener("change", com.gContactSync.Options.enableExtended, false);
      com.gContactSync.Options.enableExtended();
      document.getElementById("autoSync")
              .addEventListener("change", com.gContactSync.Options.enableDelays, false);
      com.gContactSync.Options.enableDelays();
    }
  },
  /**
   * Enables or disables the extended property textboxes based on the state of
   * the syncExtended checkbox.
   */
  enableExtended: function Options_enableExtended() {
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
  },
  /**
   * Enables or disables the delay textboxes based on the auto sync checkbox.
   */
  enableDelays: function Options_enableDelays() {
    var disableElem  = document.getElementById("autoSync");
    var intervalElem = document.getElementById("refreshIntervalBox");
    var initialElem  = document.getElementById("initialDelayBox");
    if (!disableElem) return false;
    if (intervalElem)
      intervalElem.disabled = !disableElem.value;
    if (initialElem)
      initialElem.disabled  = !disableElem.value;
    return true;
  },
  /**
   * Deletes old preferences that are no longer required.
   */
  cleanOldPrefs: function Options_cleanOldPrefs() {
    var abBranch    = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService)
                                .getBranch("ldap_2.servers."),
        gAbBranch   = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService)
                                .getBranch("extensions.gContactSync.ldap_2.servers."),
        abs         = com.gContactSync.GAbManager.getAllAddressBooks(),
        children    = [],
        count       = {},
        abPrefIDs   = {},
        i           = 0,
        numObsolete = 0,
        numDeleted  = 0,
        prefNames   = /(lastSync|gContactSync(Username|lastSync|readOnly|writeOnly|myContacts|myContactsName|Plugin|Disabled|syncGroups|updateGoogleInConflicts|lastBackup|reset|Primary))/,
        // Step 1: Backup prefs.js
        prefsFile   = com.gContactSync.FileIO.getProfileDirectory(),
        backupFile  = com.gContactSync.FileIO.getProfileDirectory();
    prefsFile.append(com.gContactSync.FileIO.fileNames.PREFS_JS);
    backupFile.append(com.gContactSync.FileIO.fileNames.FOLDER_NAME);
    backupFile.append(com.gContactSync.FileIO.fileNames.PREFS_BACKUP_DIR);
    backupFile.append(new Date().getTime() + "_" +
                      com.gContactSync.FileIO.fileNames.PREFS_JS + ".bak");
    com.gContactSync.LOGGER.LOG("***Backing up prefs.js***");
    com.gContactSync.LOGGER.LOG(" - Destination: " + backupFile.path);
    com.gContactSync.FileIO.copyFile(prefsFile, backupFile);
    // Step 2: Clean all gContactSync prefs on ldap_2.servers
    //         if and only if the extensions.gContactSync.ldap_2.servers. branch
    //         exists (means that old prefs were already updated)
    com.gContactSync.LOGGER.LOG("***Finding existing AB preference IDs***");
    for (i in abs) {
      var id = abs[i].mDirectory.dirPrefId;
      com.gContactSync.LOGGER.VERBOSE_LOG(" - " + id);
      abPrefIDs[id] = abs[i];
    }
    com.gContactSync.LOGGER.LOG("***Searching for obsolete prefs on ldap_2.servers.***");
    children = abBranch.getChildList("", count);
    for (i = 0; i < count.value; i++) {
      // extract the preference ID from the whole preference
      // (ie MyAB_1.filename -> MyAB_1)
      var index  = children[i].indexOf("."),
          prefID = index > 0 ? children[i].substring(0, index) : children[i];
      com.gContactSync.LOGGER.VERBOSE_LOG(" - " + children[i] + " - " + prefID);
      if (!abPrefIDs["ldap_2.servers." + prefID]) {
        if (prefNames.test(children[i])) {
          abBranch.clearUserPref(children[i]);
          com.gContactSync.LOGGER.LOG("  * Deleted old gContactSync pref");
          numObsolete++;
        }
      }
    }
    com.gContactSync.LOGGER.LOG("***Found " + numObsolete + " obsolete prefs on ldap_2.servers.***");
    // Step 3: clean prefs for deleted ABs on extensions.gContactSync.ldap_2.servers.
    com.gContactSync.LOGGER.LOG("***Searching for gContactSync prefs for deleted ABs***");
    children = gAbBranch.getChildList("", count);
    for (i = 0; i < count.value; i++) {
      // extract the preference ID from the whole preference
      // (ie MyAB_1.filename -> MyAB_1)
      var index  = children[i].indexOf("."),
          prefID = index > 0 ? children[i].substring(0, index) : children[i];
      com.gContactSync.LOGGER.VERBOSE_LOG(" - " + children[i] + " - " + prefID);
      if (!abPrefIDs["ldap_2.servers." + prefID]) {
        if (prefNames.test(children[i])) {
          gAbBranch.clearUserPref(children[i]);
          com.gContactSync.LOGGER.LOG("  * Deleted gContactSync pref for deleted AB");
          numDeleted++;
        }
      }
    }
    com.gContactSync.LOGGER.LOG("***Found " + numDeleted + " gContactSync prefs for deleted ABs***");
    com.gContactSync.alert(com.gContactSync.StringBundle.getStr("finishedPrefClean").replace("%d", numDeleted + numObsolete));
  }
};
