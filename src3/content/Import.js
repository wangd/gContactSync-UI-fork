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

/**
 * This class is used to import contacts using OAuth.
 * This requires some interaction with a remote website (pirules.org) for
 * authentication.
 * TODO List:
 *  - Finish documenting this class
 *  - Add more comments to functions
 *  - Support OAuth 2.0 (Facebook)
 * @class
 */
com.gContactSync.Import = {
  mSource: "",
  mStarted: false,
  mWindow: {},
  mOAuth: {
    oauth_token:        "",
    oauth_token_secret: "",
    oauth_verifier:     ""
  },
  // Step 1: Get a token
  showWindow: function gCS_showWindow(aSource) {
    var imp = com.gContactSync.Import;
    imp.mStarted = true;
    imp.mSource = aSource;
    imp.openHiddenWindow("http://www.pirules.org/oauth/index2.php?quiet&step=1&source=" + imp.mSource,
                         imp.step2a);
  },
  // Step 2a: Get the redirect URL
  step2a: function() {
    var imp = com.gContactSync.Import;
    var win = imp.mWindow;
    var response = win.document ? win.document.getElementById("response") : null;
    if (!response) {
      com.gContactSync.LOGGER.LOG("***Import failed");
      return;
    }
    response   = response.innerHTML;
    com.gContactSync.LOGGER.LOG("***IMPORT: Step 1 finished: " + win.location + "\nContents:\n" + response);
    imp.storeResponse(response);
    imp.openHiddenWindow("http://www.pirules.org/oauth/index2.php?quiet&step=2&source=" +
                         imp.mSource +
                         "&oauth_token=" + imp.mOAuth.oauth_token +
                         "&oauth_token_secret=" + imp.mOAuth.oauth_token_secret,
                         imp.step2b);
  },
  // Step 2b: Redirect to get authorized
  step2b: function() {
    var imp = com.gContactSync.Import;
    var win = imp.mWindow;
    var response = win.document ? win.document.getElementById("response") : null;
    if (!response) {
      com.gContactSync.LOGGER.LOG("***Import failed");
      return;
    }
    response   = String(response.innerHTML).replace(/\&amp\;/g, "&");
    com.gContactSync.LOGGER.LOG("***IMPORT: Step 2a finished: " + win.location + "\nContents:\n" + response);
    imp.openHiddenWindow(response,
                         imp.logStep2b);
  },
  // log that step 2b is complete, but the user has to copy/paste a code to
  // continue
  logStep2b: function() {
    var win = com.gContactSync.Import.mWindow;
    com.gContactSync.LOGGER.LOG("***IMPORT: Step 2b finished: " + win.location +
                                "Please copy/paste the token to continue");
  },
  // Step 3: Activate the Token
  continueImport: function() {
    var imp = com.gContactSync.Import;
    if (!imp.mStarted) {
      alert("An import was not started");
      return;
    }
    imp.mOAuth.oauth_token = encodeURIComponent(com.gContactSync.prompt("Token:", "gContactSync Import"));
    if (!imp.mOAuth.oauth_token) {
      alert("Import Canceled");
      imp.mStarted = false;
      return;
    }
    imp.openHiddenWindow("http://www.pirules.org/oauth/index2.php?quiet&step=3&source=" +
                         imp.mSource +
                         "&oauth_token=" + imp.mOAuth.oauth_token +
                         "&oauth_token_secret=" + imp.mOAuth.oauth_token_secret,
                         imp.step4);
  },
  // Step 4: Use the token
  step4: function() {
    var imp = com.gContactSync.Import;
    var win = imp.mWindow;
    var response = win.document ? win.document.getElementById("response") : null;
    if (!response) {
      com.gContactSync.LOGGER.LOG("***Import failed on step 3");
      return;
    }
    response   = response.innerHTML;
    com.gContactSync.LOGGER.LOG("***IMPORT: Step 3 finished: " + win.location + "\nContents:\n" + response);
    imp.storeResponse(response);
    imp.openHiddenWindow("http://www.pirules.org/oauth/index2.php?quiet&step=4&source=" +
                         imp.mSource +
                         "&oauth_token=" + imp.mOAuth.oauth_token +
                         "&oauth_token_secret=" + imp.mOAuth.oauth_token_secret,
                         imp.finish);
  },
  // Get the contact feed and import it into an AB
  finish: function() {
    var imp = com.gContactSync.Import;
    var win = imp.mWindow;
    var response = win.document ? win.document.getElementById("response") : null;
    if (!response) {
      com.gContactSync.LOGGER.LOG("***Import failed on step 4");
      return;
    }
    response = response.innerHTML;
    com.gContactSync.LOGGER.LOG("Final response:\n" + response);
    imp.mStarted = false;
    imp.beginImport(response);
  },
  // Parses and stores a response in the following format:
  // param1=value1&param2=value2...
  // this is stored in com.gContactSync.Import.mOAuth[param] = value;
  storeResponse: function(aResponse) {
    var imp = com.gContactSync.Import;
    var params = (aResponse).split("&amp;");
    for (var i = 0; i < params.length; i++) {
      var index = params[i].indexOf("=");
      if (index > 0) {
        var param = params[i].substr(0, index);
        var value = params[i].substr(index + 1);
        com.gContactSync.LOGGER.LOG("***" + param + "=>" + value);
        imp.mOAuth[param] = value;
      }
    }
  },
  // opens a window
  openHiddenWindow: function(aUrl, aBeforeUnload) {
    var imp = com.gContactSync.Import;
    com.gContactSync.LOGGER.LOG("***IMPORT: opening '" + aUrl + "'");
    imp.mWindow = window.open(aUrl,
                              "gContactSyncImport" + aUrl,
                              "chrome=yes,location=yes,resizable=yes,height=500,width=500,modal=no");
    imp.mWindow.onbeforeunload = aBeforeUnload;
  },
  /**
   * Begins the actual import given a JSON feed of contacts.
   * This method resets the importFeed preference as well as
   * signed.applets.codebase_principal_support to it's original value.
   * It promps the user for a name for the destination AB (can be new or old).
   */
  beginImport: function gCS_Import_beginImport(aFeed) {
    if (!aFeed) {
      return;
    }
    try {
      // reset the importFeed pref
      com.gContactSync.Preferences.setPref(com.gContactSync.Preferences.mSyncBranch,
                                           "importFeed",
                                           com.gContactSync.Preferences.mTypes.CHAR,
                                           "");
      // reset the codebase_principal_support pref
      var branch = Components.classes['@mozilla.org/preferences-service;1']
                         .getService(Components.interfaces.nsIPrefService)
                         .getBranch('signed.applets.')
                         .QueryInterface(Components.interfaces.nsIPrefBranch2);
      branch.setBoolPref('codebase_principal_support', branch.getBoolPref('original_codebase_principal_support'));
      // TODO remove
      com.gContactSync.alert(aFeed, "Contact Feed (click OK)", window);
      // TODO localize
      var res = com.gContactSync.prompt("Please type a name for the AB to import to.  It can be new (highly recommended) or old.\nClick Cancel to cancel the import", "Import Destination", window);
      if (!res) {
        return;
      }
      var ab = new com.gContactSync.GAddressBook(com.gContactSync.GAbManager.getAbByName(res),
                                                 true);
      // decode the JSON and get the array of cards
      var nsIJSON = Components.classes["@mozilla.org/dom/json;1"]
                              .createInstance(Components.interfaces.nsIJSON);
      var obj = nsIJSON.decode(aFeed);
      var arr = obj["entry"] || obj["data"];
      for (var i in arr) {
        var contact = arr[i];
        var id = contact.id;
        if (id) {
          var newCard = ab.newContact();
          var name = contact.name;
          // FirstName
          if (name && name["givenName"])
            newCard.setValue("FirstName", name.givenName);
          // LastName
          if (name && name.familyName)
            newCard.setValue("LastName", name.familyName);
          // DisplayName
          if (name && (name["formatted"] || name["displayName"]))
            name = name["displayName"] || name["formatted"];
          else if (!name)
            name = contact.nickname;
          newCard.setValue("DisplayName", name || "");
          if (name !== null && name !== undefined && name.nickName)
            newCard.setValue("NickName", name.nickName);
          else if (contact.nickname)
            newCard.setValue("NickName", contact.nickname);
          if (contact.emails) {
            newCard.setValue("PrimaryEmail",     contact.emails[0].value);
            newCard.setValue("PrimaryEmailType", contact.emails[0].type);
            if (contact.emails.length > 1) {
              newCard.setValue("SecondEmail",     contact.emails[1].value);
              newCard.setValue("SecondEmailType", contact.emails[1].type);
              if (contact.emails.length > 2) {
                newCard.setValue("ThirdEmail",     contact.emails[2].value);
                newCard.setValue("ThirdEmailType", contact.emails[2].type);
                if (contact.emails.length > 3) {
                  newCard.setValue("FourthEmail",     contact.emails[3].value);
                  newCard.setValue("FourthEmailType", contact.emails[3].type);
                }
              }
            }
          }
          newCard.update();
        }
      }
    }
    catch (e) {
      com.gContactSync.alertError(e);
    }
    // TODO localize
    com.gContactSync.alert("The import operation has completed", "Import Complete", window);
  }
};