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
 * LoginManager
 * Stores and retrieves the authentication token from the login manager.
 * Does NOT store the password and username.
 * @class
 */
var LoginManager = {
  mHostname:      "chrome://gContactSync",
  mSubmitURL:     "User Auth Token",
  mHttpRealm:     null,
  mUsernameField: "",
  mPasswordField: "",
  mAuthTokens:    {},
  mNumAuthTokens: 0,
  /**
   * LoginManager.addAuthToken
   * Stores the token in the Login Manager.
   * @param aUsername        The username (e-mail address).
   * @param aToken           The authentication token from Google.
   */
  addAuthToken: function LoginManager_addAuthToken(aUsername, aToken) {
    if (this.mNumAuthTokens == 0)
      this.getAuthTokens();
    if ("@mozilla.org/passwordmanager;1" in Cc) {
     var passwordManager =  Cc["@mozilla.org/passwordmanager;1"]
                            .getService(Ci.nsIPasswordManager);
     passwordManager.addUser(this.mHostname, aUsername, aToken);
     this.mAuthTokens[aUsername] = aToken;
     this.mNumAuthTokens++;
    }
    else if ("@mozilla.org/login-manager;1" in Cc) {
      var loginManager =  Cc["@mozilla.org/login-manager;1"]
                           .getService(Ci.nsILoginManager);
      var nsLoginInfo  = new CC("@mozilla.org/login-manager/loginInfo;1",
                                Ci.nsILoginInfo, "init");
      var extLoginInfo = new nsLoginInfo(this.mHostname, this.mSubmitURL,
                                         this.mHttpRealm, aUsername, aToken,
                                         this.mUsernameField, this.mPasswordField);
      loginManager.addLogin(extLoginInfo);
      this.mAuthTokens[aUsername] = aToken;
      this.mNumAuthTokens++;
    }
  },
  /**
   * LoginManager.getAuthTokens
   * Gets the token in the Login Manager.
   * @return The auth token, if present, null otherwise.
   */
  getAuthTokens: function LoginManager_getAuthTokens() {
    this.mAuthTokens = {};
    this.mNumAuthTokens = 0;
    if ("@mozilla.org/passwordmanager;1" in Cc) {
      var passwordManager = Cc["@mozilla.org/passwordmanager;1"]
                             .getService(Ci.nsIPasswordManager);
      var iter = passwordManager.enumerator;
      while (iter.hasMoreElements()) {
        try {
          var pass = iter.getNext().QueryInterface(Ci.nsIPassword);
          if (pass.host == this.mHostname) {
            this.mAuthTokens[pass.user] = pass.password;
            this.mNumAuthTokens++;
          }
        } catch (e) {}
      }
    }
    else if ("@mozilla.org/login-manager;1" in Cc) {
      var loginManager =  Cc["@mozilla.org/login-manager;1"]
                           .getService(Ci.nsILoginManager);
      // Find users for the given parameters
      var logins = loginManager.findLogins({}, this.mHostname, this.mSubmitURL,
                                           this.mHttpRealm);
      // Find user from returned array of nsILoginInfo objects
      for (var i = 0; i < logins.length; i++) {
        this.mAuthTokens[logins[i].username] = logins[i].password;
        this.mNumAuthTokens++;
      }
    }
    return this.mAuthTokens;
  },
  /**
   * LoginManager.getAuthToken
   * Gets the token in the Login Manager.
   * @return The auth token, if present, null otherwise.
   */
  getAuthToken: function LoginManager_getAuthToken(aUsername) {
    if  (this.mNumAuthTokens == 0)
      this.getAuthTokens();
    return this.mAuthTokens ? this.mAuthTokens[aUsername] : null;
  },
  /**
   * LoginManager.removeAuthToken
   * Removes the auth token from the Login Manager.
   * @return True if the auth token was successfully removed.
   */
  removeAuthToken: function LoginManager_removeAuthToken(aUsername) {
    if ("@mozilla.org/passwordmanager;1" in Cc) {
      var passwordManager = Cc["@mozilla.org/passwordmanager;1"]
                             .getService(Ci.nsIPasswordManager);
      try {
        passwordManager.removeUser(this.mHostname, aUsername);
        this.mAuthTokens[aUsername] = null;
        this.mNumAuthTokens--;
      }
      catch (e) {
        alert(StringBundle.getStr("removeLoginFailure") + "\n\n" + e);
      }
    }
    else if ("@mozilla.org/login-manager;1" in Cc) {
      var loginManager = Cc["@mozilla.org/login-manager;1"]
                          .getService(Ci.nsILoginManager);
      // Find logins for the given parameters
      var logins = loginManager.findLogins({}, this.mHostname, this.mSubmitURL,
                                            this.mHttpRealm);
      // Find user from returned array of nsILoginInfo objects
      for (var i = 0; i < logins.length; i++) {
        if (logins[i].username == aUsername) {
          try {
            loginManager.removeLogin(logins[i]);
            this.mAuthTokens[aUsername] = null;
            this.mNumAuthTokens--;
            return;
          }
          catch (e) {
            alert(StringBundle.getStr("removeLoginFailure") + "\n\n" + e);
          }
        }
      }
      // it didn't find the login...
      alert(StringBundle.getStr("removeLoginFailure"));
    }
  }
}