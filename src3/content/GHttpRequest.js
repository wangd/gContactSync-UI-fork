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
 * GHttpRequest
 * Sets up an HTTP request to send to Google.
 * After calling this constructor and setting up any additional data, call the
 * send method.
 * 
 * @param aType      The type of request.  Must be one of the following:
 *                   authenticate, getAll, get, update, add, delete, getGroups
 * @param aAuth      The authorization token.
 * @param aUrl       The url for the request, if unique for the type of request.
 *                   Not required for authenticate, getAll, getGroups, and add.
 * @param aBody      The body of the request.
 * @param aUsername  Optional.  Replaces "default" in the URL.
 * @constructor
 * @class
 * @extends HttpRequest
 */
function GHttpRequest(aType, aAuth, aUrl, aBody, aUsername) {
  HttpRequest.call(this);  // call the superclass' constructor
  this.mBody = aBody;
  // all urls in gdata use SSL.  If a URL is supplied, make sure it uses SSL
  if (aUrl && aUrl.indexOf("https://") < 0)
    aUrl = aUrl.replace("http://", "https://");
  switch (aType) {
    case "AUTH_SUB_SESSION":
    case "authsubsession":
      this.mContentType = this.CONTENT_TYPES.URL_ENC;
      this.mUrl         = gdata.AUTH_SUB_SESSION_URL;
      this.mType        = gdata.AUTH_SUB_SESSION_TYPE;
      break;
    case "AUTHENTICATE":
    case "authenticate":
      this.mContentType = this.CONTENT_TYPES.URL_ENC;
      this.mUrl         = gdata.AUTH_URL;
      this.mType        = gdata.AUTH_REQUEST_TYPE;
      break;
    case "GETALL":
    case "getAll":
      this.mContentType = this.CONTENT_TYPES.ATOM;
      this.mUrl         = gdata.contacts.GET_ALL_URL + Preferences.mSyncPrefs
                                                                  .maxContacts.value;
      this.mType        = gdata.contacts.requestTypes.GET_ALL;
      this.addHeaderItem("Authorization", aAuth);
      break;
    case "GETGROUPS":
    case "getGroups":
      this.mContentType = this.CONTENT_TYPES.ATOM;
      this.mUrl         = gdata.contacts.GROUPS_URL;
      this.mType        = gdata.contacts.requestTypes.GET;
      this.addHeaderItem("Authorization", aAuth);
      break;
    case "GET":
    case "get":
      this.mContentType = this.CONTENT_TYPES.ATOM;
      this.mUrl         = aUrl; // the URL is unique and needs to be passed in
      this.mType        = gdata.contacts.requestTypes.GET;
      this.addHeaderItem("Authorization", aAuth);
      break;
    case "UPDATE":
    case "update":
    case "updategroup":
      this.mContentType = this.CONTENT_TYPES.ATOM;
      this.mUrl         = aUrl;
      this.mType        = "POST";  // for firewalls that block PUT requests
      this.addContentOverride(gdata.contacts.requestTypes.UPDATE);
      this.addHeaderItem("Authorization", aAuth);
      break;
    case "ADD":
    case "add":
      this.mContentType = this.CONTENT_TYPES.ATOM;
      this.mUrl         = gdata.contacts.ADD_URL;
      this.mType        = gdata.contacts.requestTypes.ADD;
      this.addHeaderItem("Authorization", aAuth);
      break;
    case "addGroup":
      this.mContentType = this.CONTENT_TYPES.ATOM;
      this.mUrl         = gdata.contacts.ADD_GROUP_URL;
      this.mType        = gdata.contacts.requestTypes.ADD;
      this.addHeaderItem("Authorization", aAuth);
      break;
    case "DELETE":
    case "delete":
      this.mContentType = this.CONTENT_TYPES.URL_ENC;
      this.mUrl         = aUrl;
      this.mType        = "POST"; // for firewalls that block DELETE
      this.addContentOverride(gdata.contacts.requestTypes.DELETE);
      this.addHeaderItem("Content-length", 0); // required or there will be an error
      this.addHeaderItem("Authorization", aAuth);
      break;
    default:
      // if the input doesn't match one of the above throw an error
      throw "Invalid aType parameter supplied to the GHttpRequest constructor" +
            StringBundle.getStr("pleaseReport");
  }
  // use version 3 of the contacts api
  this.addHeaderItem("GData-Version", "3");
  // handle Token Expired errors
  this.mOn401 = ["handle401(httpReq);"];
  if (!this.mUrl)
    throw "Error - no URL was found for the HTTP Request";
  if (aUsername && this.mUrl)
    this.mUrl = this.mUrl.replace("default", encodeURIComponent(aUsername));
}

GHttpRequest.prototype = new HttpRequest(); // get the superclass' prototype

/**
 * handle401
 * Handles 'Token Expired' errors.
 * If a sync is in progress:
 *  - Get the username
 *  - Remove the auth token
 *  - Alert the user
 *  - Prompt for the password
 *  - Get a new auth token to replace the old one
 *  - Restart the sync
 */
function handle401(httpRequest) {
  LOGGER.LOG("***Found an expired token***");
  // If there is a synchronization in process
  if (!Sync.mSynced) {
    // Get the current username
    var username = Sync.mCurrentUsername;
    // Remove the auth token if it wasn't already
    if (LoginManager.mAuthTokens[username]) {
      LOGGER.VERBOSE_LOG(" * Removing old auth token");
      LoginManager.removeAuthToken(username);
    }
    alert(StringBundle.getStr("tokenExpiredMsg"));
    // Prompt for the username and password
    var prompt   = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Ci.nsIPromptService)
                    .promptUsernameAndPassword;
    // set the username
    var username = { value: username };
    var password = {};
    
    LOGGER.VERBOSE_LOG( " * Showing a username/password prompt");
    // opens a username/password prompt
    var ok = prompt(window, StringBundle.getStr("loginTitle"),
                    StringBundle.getStr("loginText"), username, password, null,
                    {value: false});
    if (!ok) {
      LOGGER.VERBOSE_LOG(" * User canceled the prompt");
      Sync.finish(StringBundle.getStr("tokenExpired"), false);
      return false;
    }
    // This is a primitive way of validating an e-mail address, but Google takes
    // care of the rest.  It seems to allow getting an auth token w/ only the
    // username, but returns an error when trying to do anything w/ that token
    // so this makes sure it is a full e-mail address.
    if (username.value.indexOf("@") < 1) {
      alert(StringBundle.getStr("invalidEmail"));
      return handle401();
    }
    var body    = gdata.makeAuthBody(username.value, password.value);
    var httpReq = new GHttpRequest("authenticate", null, null, body);
    // if it succeeds and Google returns the auth token, store it and then start
    // a new sync
    httpReq.mOnSuccess = ["finish401('" + username.value +
                          "', httpReq.responseText.split(\"\\n\")[2]);"];
    // if it fails, alert the user and prompt them to try again
    httpReq.mOnError   = ["alert(StringBundle.getStr('authErr'));",
                          "LOGGER.LOG_ERROR('Authentication Error - ' + " + 
                          "httpReq.status, httpReq.responseText);",
                          "handle401();"];
    // if the user is offline, alert them and quit
    httpReq.mOnOffline = ["alert(StringBundle.getStr('offlineErr'));",
                          "LOGGER.LOG_ERROR(StringBundle.getStr('offlineErr'));"];
    httpReq.send();
  }
}

function finish401(aUsername, aAuthToken) {
  LOGGER.VERBOSE_LOG(" * finish401 called: " + aUsername + " - " + aAuthToken);
  if (aUsername && aAuthToken) {
    LoginManager.addAuthToken(aUsername, 'GoogleLogin ' + aAuthToken);
    Sync.mCurrentAuthToken = aAuthToken;
    if (Preferences.mSyncPrefs.syncGroups.value || Preferences.mSyncPrefs.myContacts)
      Sync.getGroups();
    else
      Sync.getContacts();
  }
}
