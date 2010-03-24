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
    com.gContactSync.Preferences.setSyncPref("synchronizing", false);
    this.checkAuthentication(); // check if the Auth token is valid
  },
  /**
   * Checks to see whether or not there is an authentication token in the login
   * manager.  If so, it begins a sync.  If not, it shows the login prompt.
   */
  checkAuthentication: function MessengerOverlay_checkAuthentication() {
    if (com.gContactSync.gdata.isAuthValid()) {
      if (this.mUsername) {
        var name = com.gContactSync.Preferences.mSyncPrefs.addressBookName.value;
        var ab   = com.gContactSync.GAbManager.getGAb(com.gContactSync.GAbManager.getAbByName(name));
        ab.savePref("Username", this.mUsername);
        ab.setLastSyncDate(0);
        com.gContactSync.Sync.begin();
      }
      else {
        com.gContactSync.Sync.schedule(com.gContactSync.Preferences.mSyncPrefs.initialDelayMinutes.value * 60000);
      }
      return;
    }
    this.setStatusBarText(com.gContactSync.StringBundle.getStr("notAuth"));
    this.promptLogin();
  },
  /**
   * Prompts the user to enter his or her Google username and password and then
   * gets an authentication token to store and use.
   */
  promptLogin: function MessengerOverlay_promptLogin() {
    var prompt   = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                             .getService(Components.interfaces.nsIPromptService)
                             .promptUsernameAndPassword;
    var username = {};
    var password = {};
    // opens a username/password prompt
    var ok = prompt(window, com.gContactSync.StringBundle.getStr("loginTitle"),
                    com.gContactSync.StringBundle.getStr("loginText"), username, password, null,
                    {value: false});
    if (!ok)
      return false;

    // This is a primitive way of validating an e-mail address, but Google takes
    // care of the rest.  It seems to allow getting an auth token w/ only the
    // username, but returns an error when trying to do anything w/ that token
    // so this makes sure it is a full e-mail address.
    if (username.value.indexOf("@") < 1) {
      com.gContactSync.alertError(com.gContactSync.StringBundle.getStr("invalidEmail"));
      return this.promptLogin();
    }
    
    // fix the username before authenticating
    username.value = com.gContactSync.fixUsername(username.value);
    var body     = com.gContactSync.gdata.makeAuthBody(username.value, password.value);
    var httpReq  = new com.gContactSync.GHttpRequest("authenticate", null, null, body);
    // if it succeeds and Google returns the auth token, store it and then start
    // a new sync
    httpReq.mOnSuccess = function authSuccess(httpReq) {
      com.gContactSync.MessengerOverlay.login(username.value,
                                     httpReq.responseText.split("\n")[2]);
    };
    // if it fails, alert the user and prompt them to try again
    httpReq.mOnError = function authError(httpReq) {
      com.gContactSync.alertError(com.gContactSync.StringBundle.getStr('authErr'));
      com.gContactSync.LOGGER.LOG_ERROR('Authentication Error - ' +
                                        httpReq.status,
                                        httpReq.responseText);
      com.gContactSync.MessengerOverlay.promptLogin();
    };
    // if the user is offline, alert them and quit
    httpReq.mOnOffline = com.gContactSync.Sync.mOfflineFunction;
    httpReq.send();
    return true;
  },
  /**
   * Stores the given auth token in the login manager and starts the setup
   * window that will begin the first synchronization when closed.
   * @param aAuthToken {string} The authentication token to store.
   */
  login: function MessengerOverlay_login(aUsername, aAuthToken) {
    com.gContactSync.LoginManager.addAuthToken(aUsername, 'GoogleLogin ' + aAuthToken);
    this.setStatusBarText(com.gContactSync.StringBundle.getStr("initialSetup"));
    var setup = window.open("chrome://gcontactsync/content/FirstLogin.xul",
                            "SetupWindow",
                            "chrome,resizable=yes,scrollbars=no,status=no");
    this.mUsername = aUsername;
    // when the setup window loads, set its onunload property to begin a sync
    setup.onload = function onloadListener() {
      setup.onunload = function onunloadListener() {
        com.gContactSync.MessengerOverlay.checkAuthentication();
      };
    };
  }
};
