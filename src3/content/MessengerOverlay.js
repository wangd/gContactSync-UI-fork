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
 * Portions created by the Initial Developer are Copyright (C) 2010
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
  /** Initializes the MessengerOverlay class when the window has finished loading */
  function gCS_mainOverlayLoadListener(e) {
    com.gContactSync.MessengerOverlay.initialize();
  },
false);

/**
 * The main overlay removes old log files and logs basic information about
 * the version of gContactSync and Thunderbird.
 * Also resets the needRestart pref to false.
 * @class
 */
com.gContactSync.MessengerOverlay = {
  /**
   * Initializes the MessengerOverlay class.
   * This consists of setting the needRestart pref to false, removing the old
   * log file, and logging basic TB and gContactSync information.
   */
  initialize: function MessengerOverlay_initialize() {
    // reset the needRestart pref
    com.gContactSync.Preferences.setSyncPref("needRestart", false);
    // remove the old log file
    if (com.gContactSync.FileIO.mLogFile && com.gContactSync.FileIO.mLogFile.exists()) {
      com.gContactSync.FileIO.mLogFile.remove(false); // delete the old log file
    }

    // log some basic system and application info
    com.gContactSync.LOGGER.LOG("Loading gContactSync at " + new Date());
    com.gContactSync.LOGGER.LOG(" * Version is:       " +
                                com.gContactSync.version);
    com.gContactSync.LOGGER.LOG(" * Last version was: " +
                                com.gContactSync.Preferences.mSyncPrefs.lastVersion.value);
    com.gContactSync.LOGGER.LOG(" * User Agent:       " +
                                navigator.userAgent + "\n");
  }
};
