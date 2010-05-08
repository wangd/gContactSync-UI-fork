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
 * 
 * pirules.org stores the following infomration for each source
 *  - oauth_consumer_key
 *  - oauth_consumer_secret
 *  - base API URL
 *  - @me/@self URL
 *  - @me/@all or @me/@friends URL
 * etc.
 * It also reorganizes and signs the parameters.
 * 
 * TODO List:
 *  - Support OAuth 2.0 (Facebook)
 * 
 * @class
 */
com.gContactSync.Import = {
  /** The 'source' from which contacts are imported (Plaxo, Google, etc.) */
  mSource: "",
  /** This is used internally to track whether an import is in progress */
  mStarted: false,
  /** A reference to the window TODO remove */
  mWindow: {},
  /** Maps Portable Contacts attributes to TB nsIAbCard attributes */
  mMap: {
    /**
     * The 'nickname' (MySpace only).  This is mapped w/ DisplayName because it
     * is basically all that MySpace gives.
     */
    nickname:      "DisplayName",
    /** name is complex */
    name: {
      /** The given name for a contact */
      givenName:   "FirstName",
      /** The contact's last name */
      familyName:  "LastName",
      /** A contact's formatted name */
      formatted:   "DisplayName",
      /** A contact's display name */
      displayName: "DisplayName"
    },
    /** A contact's display name */
    displayName: "DisplayName",
    /** The contact's nickname (alias) */
    nickName:      "NickName",
    /** The URL to the contact's profile */
    profileUrl:    "ProfileURL",
    /** emails is an array of a contact's e-mail addresses */
    emails: {
      /** The prefix for the first e-mail address */
      0:           "Primary",
      /** The prefix for the second e-mail address */
      1:           "Secondary",
      /** The prefix for the third e-mail address */
      2:           "Third",
      /** The prefix for the fourth e-mail address */
      3:           "Fourth",
      /** The prefix for the fifth e-mail address */
      4:           "Fifth",
      /** The suffix for an e-mail address */
      value:       "Email",
      /** The suffix for an e-mail's type (work, home, etc.) */
      type:        "EmailType"
    },
    /**
     * phoneNumbers is an array of a contact's phone numbers in the form:
     * {"type":"Home","value":"(123) 456-7890"}
     */
    phoneNumbers: {
      0:           "Work",
      1:           "Home",
      2:           "Fax",
      3:           "Cell",
      4:           "Pager",
      value:       "Phone", // note that TB is inconsistent here
                            // {Home|Work}Phone and {Fax|Cellular|Pager}Number
      type:        "PhoneType"
    },
    /**
     * addresses is an array of a contact's postal addresses in the form:
     * {"type":"Home","formatted":"1234 Main St"}
     */
    addresses: {
      0:           "",
      1:           "",
      2:           "",
      type:        "",
      formatted:   "<type>Address"
    },
    urls: {
      0:           "WebPage1",
      1:           "WebPage2",
      type:        "Type",
      value:       ""
    }
  },
  /** Commands to execute when offline during an HTTP Request */
  mOfflineFunction: function Import_offlineFunc(httpReq) {
    com.gContactSync.alertError(com.gContactSync.StringBundle.getStr('importOffline'));
  },
  /**
   * Stores <em>encoded</em> OAuth variables, such as the oauth_token,
   * oauth_token_secret, and oauth_verifier
   */
  mOAuth: {
    /** The OAuth token to use in requests */
    oauth_token:        "",
    /** The OAuth token secret to use in signing request parameters */
    oauth_token_secret: "",
    /** The OAuth verifier for OAuth version 1.0a */
    oauth_verifier:     ""
  },
  /**
   * Step 1: Get an initial, unauthorized oauth_token and oauth_token_secret.
   * This is done mostly on pirules.org which contains the consumer token and
   * secret for various sources and signs the parameters.
   * pirules.org returns the response from the source, usually of the form:
   * oauth_token=1234&oauth_token_secret=5678
   *
   * @param aSource {string} The source from which the contacts are obtained,
   *                         in lowercase, as supported by pirules.org.
   */
  showWindow: function Import_showWindow(aSource) {
    var imp = com.gContactSync.Import;
    imp.mStarted = true;
    imp.mSource = aSource;
    // get an oauth_token and oauth_token_secret
    imp.openBrowserWindow("http://www.pirules.org/oauth/index2.php?quiet&step=1&source=" +
                         imp.mSource,
                         imp.step2a);
  },
  /**
   * Step 2a: The first of two substeps where the user is prompted for his or
   * her credentials on the third-party website.
   * In this substep, gContactSync gets the login URL from pirules.org with
   * all it's parameters and the oauth_signature.
   */
  step2a: function Import_step2a() {
    var imp = com.gContactSync.Import,
        win = imp.mWindow,
        response = win.document ? win.document.getElementById("response") : null;
    if (!response) {
      com.gContactSync.LOGGER.LOG("***Import failed");
      return;
    }
    response   = response.innerHTML;
    com.gContactSync.LOGGER.LOG("***IMPORT: Step 1 finished: " + win.location +
                                "\nContents:\n" + response);
    // parse and store the parameters from step 1 (oauth_token &
    // oauth_token_secret)
    imp.storeResponse(response);
    // TODO use HttpRequest
    imp.openBrowserWindow("http://www.pirules.org/oauth/index2.php?quiet&step=2&source=" +
                         imp.mSource +
                         "&oauth_token=" + imp.mOAuth.oauth_token +
                         "&oauth_token_secret=" + imp.mOAuth.oauth_token_secret,
                         imp.step2b);
  },
  /**
   * Step 2a: The second of two substeps where the user is prompted for his or
   * her credentials on the third-party website.
   * In this substep, gContactSync opens a browser to the login page for the
   * particular source.
   */
  step2b: function Import_step2b() {
    var imp = com.gContactSync.Import,
        win = imp.mWindow,
        response = win.document ? win.document.getElementById("response") : null;
    if (!response) {
      com.gContactSync.LOGGER.LOG("***Import failed");
      return;
    }
    response   = String(response.innerHTML).replace(/\&amp\;/g, "&");
    com.gContactSync.LOGGER.LOG("***IMPORT: Step 2a finished: " + win.location + "\nContents:\n" + response);
    imp.openBrowserWindow(response, imp.logStep2b);
  },
  /**
   * Step 2b: The second of two substeps where the user is prompted for his or
   * her credentials on the third-party website.
   * This just logs that step 2b has finished (the login page was opened)
   */
  logStep2b: function Import_logStep2b() {
    var win = com.gContactSync.Import.mWindow;
    com.gContactSync.LOGGER.LOG("***IMPORT: Step 2b finished: " + win.location +
                                "Please copy/paste the token to continue");
  },
  /**
   * Step 3: Gets the new oauth_token then activates the token.
   * This step must be initiated by the user (for now).
   * TODO - find a way to automatically start step3 when possible.
   */
  step3: function Import_step3() {
    var imp = com.gContactSync.Import;
    if (!imp.mStarted) {
      com.gContactSync.alertError(com.gContactSync.StringBundle.getStr("importNotStarted"));
      return;
    }
    // Get the new oauth_token from the window.
    imp.mOAuth.oauth_token = encodeURIComponent(imp.mWindow.document.getElementById('response').innerHTML);
    imp.mWindow.close();
    if (!imp.mOAuth.oauth_token) {
      // TODO localize
      alert("Import Canceled");
      imp.mStarted = false;
      return;
    }
    // activate the token
    // TODO use HttpRequest
    imp.openBrowserWindow("http://www.pirules.org/oauth/index2.php?quiet&step=3&source=" +
                         imp.mSource +
                         "&oauth_token=" + imp.mOAuth.oauth_token +
                         "&oauth_token_secret=" + imp.mOAuth.oauth_token_secret,
                         imp.step4);
  },
  /**
   * Step 4: Use the token to fetch the user's contacts.
   * This sends a request and the token/token secret to pirules.org which
   * signs and sends the request to the source's @me/@friend URL.
   */
  step4: function Import_step4() {
    var imp = com.gContactSync.Import,
        win = imp.mWindow,
        response = win.document ? win.document.getElementById("response") : null;
    if (!response) {
      com.gContactSync.LOGGER.LOG("***Import failed on step 3");
      return;
    }
    response = response.innerHTML;
    com.gContactSync.LOGGER.LOG("***IMPORT: Step 3 finished: " + win.location + "\nContents:\n" + response);
    imp.storeResponse(response);
    // Use the token to fetch the user's contacts
    // TODO use HttpRequest
    imp.openBrowserWindow("http://www.pirules.org/oauth/index2.php?quiet&step=4&source=" +
                         imp.mSource +
                         "&oauth_token=" + imp.mOAuth.oauth_token +
                         "&oauth_token_secret=" + imp.mOAuth.oauth_token_secret,
                         imp.finish);
  },
  /**
   * Gets the response from step 4 and calls beginImport to parse the JSON feed
   * of contacts.
   */
  // Get the contact feed and import it into an AB
  finish: function Import_finish() {
    var imp = com.gContactSync.Import,
        win = imp.mWindow;
    // get the contacts feed
    var response = win.document ? win.document.getElementById("response") : null;
    if (!response) {
      com.gContactSync.LOGGER.LOG("***Import failed on step 4");
      return;
    }
    response = response.innerHTML;
    com.gContactSync.LOGGER.LOG("Final response:\n" + response);
    imp.mStarted = false;
    // start the import
    imp.beginImport(response);
  },
  /**
   * Parses and stores a URL-encoded response in the following format:
   * param1=value1&amp;param2=value2&amp;param3=value3...
   * The parsed parameters and values are stored (still encoded) in
   * com.gContactSync.Import.mOAuth[param] = value;
   *
   * @param aResponse {string} The encoded response to parse.
   */
  storeResponse: function Import_storeResponse(aResponse) {
    var imp    = com.gContactSync.Import,
        params = (aResponse).split("&amp;");
    for (var i = 0; i < params.length; i++) {
      var index = params[i].indexOf("=");
      if (index > 0) {
        var param = params[i].substr(0, index),
            value = params[i].substr(index + 1);
        com.gContactSync.LOGGER.VERBOSE_LOG("***" + param + "=>" + value);
        imp.mOAuth[param] = value;
      }
    }
  },
  /**
   * Opens a window at the given URL and optionally sets an onbeforeunload
   * listener.
   *
   * @param aUrl {string} The URL to open.
   * @param aBeforeUnload {function} The function to run before the window is
   *                                 unloaded.
   */
  openBrowserWindow: function Import_openBrowserWindow(aUrl, aBeforeUnload) {
    var imp = com.gContactSync.Import;
    com.gContactSync.LOGGER.LOG("***IMPORT: opening '" + aUrl + "'");
    // TODO - find a way to show a location bar, allow context menus, etc.
    imp.mWindow = window.open(aUrl,
                              "gContactSyncImport" + aUrl,
                              "chrome=yes,location=yes,resizable=yes,height=500,width=500,modal=no");
    if (aBeforeUnload) {
      imp.mWindow.onbeforeunload = aBeforeUnload;
    }
  },
  /**
   * Begins the actual import given a JSON feed of contacts.
   * It promps the user for a name for the destination AB (can be new or old).
   *
   * @param aFeed {string} The JSON feed of contacts to parse.
   */
  beginImport: function Import_beginImport(aFeed) {
    if (!aFeed) {
      return;
    }
    try {
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
      var arr = obj.entry || obj.data;
      // TODO use a map or some better method of conversion
      for (var i in arr) {
        var contact = arr[i],
            id = contact.id;
        if (id) {
          var newCard = ab.newContact();
          // TODO this could be moved into a recursive function...
          for (var j in contact) {
            var attr = this.mMap[j];
            if (attr) {
              // when contact[j] is an Array things are a bit more
              // complicated
              if (contact[j] instanceof Array) {
                // emails: [
                //   {email: somebody@somwhere, type: work},
                //   {email: somebody2@somwhere, type: work}
                // ]
                // contact[j]    = emails[]
                // contact[j][k] = emails[k]
                for (var k = 0; k < contact[j].length; k++) {
                  if (!attr[k]) break;
                  // contact[j][k][l] = sombody@somewhere
                  for (var l in contact[j][k]) {
                    if (attr[l]) {
                      var type = contact[j][k].type;
                      // not all arrays can be mapped to TB fields by index
                      // TODO - support using original phone # fields
                      // this would require NOT storing the type...
                      var tbAttribute = String(attr[k] + attr[l]).replace("<type>", type);
                      // Workaround for inconsistent phone number attributes in TB
                      if (attr === "phoneNumbers" && (type === "Cellular" || type === "Pager" || type === "Fax")) {
                        tbAttribute = tbAttribute.replace("Phone", "Number");
                      }
                      // mMap[j][[k] is the prefix (Primary, Second, etc.)
                      // mMap[j][l] is the suffix (Email)
                      com.gContactSync.LOGGER.VERBOSE_LOG(" - (Array): " + tbAttribute + "=" + contact[j][k][l]);
                      newCard.setValue(decodeURIComponent(tbAttribute), decodeURIComponent(contact[j][k][l]));
                    }
                  }
                  
                }
              }
              else if (j === "photos") {
                // TODO download the photo...
                // possibly implementation-specific
              }
              else if (j === "thumbnailUrl") {
                
              }
              // if it is just a normal property (has a length property =>
              // string) check the map
              else if (attr.length) {
                com.gContactSync.LOGGER.VERBOSE_LOG(" - (String): " + attr + "=" + contact[j])
                newCard.setValue(attr, decodeURIComponent(contact[j]));
              }
              // else it is an object with subproperties
              else {
                for (var k in contact[j]) {
                  if (attr[k]) {
                    com.gContactSync.LOGGER.VERBOSE_LOG(" - (Object): " + attr[k] + "/" + j + "=" + contact[j][k]);
                    newCard.setValue(attr[k], decodeURIComponent(contact[j][k]));
                  }
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
      return;
    }
    com.gContactSync.alert(com.gContactSync.StringBundle.getStr("importComplete"),
                           com.gContactSync.StringBundle.getStr("importCompleteTitle"),
                           window);
  }
};