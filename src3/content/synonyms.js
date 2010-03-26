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

if (!com) {
  /** A generic wrapper variable */
  var com = {};
}

if (!com.gContactSync) {
  /** A wrapper for all GCS functions and variables */
  com.gContactSync = {};
}

/** The attribute where the dummy e-mail address is stored */
com.gContactSync.dummyEmailName = "PrimaryEmail";
/** The version of gContactSync */
com.gContactSync.version        = "0.3.0a5";

/**
 * Creates an XMLSerializer to serialize the given XML then create a more
 * human-friendly string representation of that XML.
 * This is an expensive method of serializing XML but results in the most
 * human-friendly string from XML.
 * 
 * Also see serializeFromText.
 *
 * @param aXML {XML} The XML to serialize into a human-friendly string.
 * @returns {string}  A formatted string of the given XML.
 */
com.gContactSync.serialize = function gCS_serialize(aXML) {
  if (!aXML)
    return "";
  try {
    var serializer = new XMLSerializer(),
        str        = serializer.serializeToString(aXML);
    // source: http://developer.mozilla.org/en/E4X#Known_bugs_and_limitations
    str = str.replace(/^<\?xml\s+version\s*=\s*(["'])[^\1]+\1[^?]*\?>/, ""); // bug 336551
    return XML(str).toXMLString();
  }
  catch (e) {
    com.gContactSync.LOGGER.LOG_WARNING("Error while serializing the following XML: " +
                                        aXML, e);
  }
  return "";
};

/**
 * A less expensive (but still costly) function that serializes a string of XML
 * adding newlines between adjacent tags (...><...).
 * If the verboseLog preference is set as false then this function does nothing.
 *
 * @param aString {string} The XML string to serialize.
 * @param aForce {boolean} Set to true to force a serialization regardless of
 *                         verboseLog.
 * @returns {string} The serialized text if verboseLog is true; else the original
 *                  text.
 */
com.gContactSync.serializeFromText = function gCS_serializeFromText(aString, aForce) {
  // if verbose logging is disabled, don't replace >< with >\n< because it only
  // wastes time
  if (aForce || com.gContactSync.Preferences.mSyncPrefs.verboseLog.value) {
    var arr = aString.split("><");
    aString = arr.join(">\n<");
  }
  return aString;
};

/**
 * Creates a 'dummy' e-mail for the given contact if possible.
 * The dummy e-mail contains 'nobody' (localized) and '@nowhere.invalid' (not
 * localized) as well as a string of numbers.  The numbers are the ID from
 * Google, if any, or a random sequence.  The numbers are fairly unique because
 * mailing lists require contacts with distinct e-mail addresses otherwise they
 * fail silently.
 *
 * The purpose of the dummy e-mail addresses is to prevent mailing list bugs
 * relating to contacts without e-mail addresses.
 *
 * This function checks the 'dummyEmail' pref and if that pref is set as true
 * then this function will not set the e-mail unless the ignorePref parameter is
 * supplied and evaluates to true.
 *
 * @param aContact A contact from Thunderbird.  It can be one of the following:
 *                 TBContact, GContact, or an nsIAbCard (Thunderbird 2 or 3)
 * @param ignorePref {boolean} Set this as true to ignore the preference
 *                             disabling dummy e-mail addresses.  Use this in
 *                             situations where not adding an address would
 *                             definitely cause problems.
 * @returns {string} A dummy e-mail address.
 */
com.gContactSync.makeDummyEmail = function gCS_makeDummyEmail(aContact, ignorePref) {
  if (!aContact) throw "Invalid contact sent to makeDummyEmail";
  if (!ignorePref && !com.gContactSync.Preferences.mSyncPrefs.dummyEmail.value) {
    com.gContactSync.LOGGER.VERBOSE_LOG(" * Not setting dummy e-mail");
    return "";
  }
  var prefix = com.gContactSync.StringBundle.getStr("dummy1"),
      suffix = com.gContactSync.StringBundle.getStr("dummy2"),
      id     = null;
  // GContact and TBContact may not be defined
  try {
    if (aContact instanceof com.gContactSync.GContact)
      id = aContact.getID(true);
    // otherwise it is from Thunderbird, so try to get the Google ID, if any
    else if (aContact instanceof com.gContactSync.TBContact)
      id = aContact.getID();
    else
      id = com.gContactSync.GAbManager.getCardValue(aContact, "GoogleID");
  } catch (e) {
    try {
      // try getting the card's value
      if (aContact.getProperty) // post Bug 413260
        id = aContact.getProperty("GoogleID", null);
      else // pre Bug 413260
        id = aContact.getStringAttribute("GoogleID");
    }
    catch (ex) {}
  }
  if (id) {
    // take just the ID and not the whole URL
    return prefix + id.substr(1 + id.lastIndexOf("/")) + suffix;
  }
  // if there is no ID make a random number and remove the "0."
  else {
    return prefix + String(Math.random()).replace("0.", "") + suffix;
  }
};

/**
 * Returns true if the given e-mail address is a fake 'dummy' address.
 *
 * @param aEmail {string} The e-mail address to check.
 * @returns {boolean} true  if aEmail is a dummy e-mail address
 *                  false otherwise
 */
com.gContactSync.isDummyEmail = function gCS_isDummyEmail(aEmail) {
  return aEmail && aEmail.indexOf && 
         aEmail.indexOf(com.gContactSync.StringBundle.getStr("dummy2")) !== -1;
};

/**
 * Selects the menuitem with the given value (value or label attribute) in the
 * given menulist.
 * Optionally creates the menuitem if it cannot be found.
 *
 * @param aMenuList {menulist} The menu list element to search.
 * @param aValue    {string}   The value to find in a menuitem.  This can be
 *                             either the 'value' or 'label' attribute of the
 *                             matched item.  Case insensitive.
 * @param aCreate   {boolean}  Set as true to create and select a new menuitem
 *                             if a match cannot be found.
 */
com.gContactSync.selectMenuItem = function gCS_selectMenuItem(aMenuList, aValue, aCreate) {
  if (!aMenuList || !aMenuList.menupopup || !aValue)
    throw "Invalid parameter sent to selectMenuItem";

  var arr = aMenuList.menupopup.childNodes,
      i,
      item,
      aValueLC = aValue.toLowerCase();
  for (i = 0; i < arr.length; i++) {
    item = arr[i];
    if (item.getAttribute("value").toLowerCase() === aValueLC ||
        item.getAttribute("label").toLowerCase() === aValueLC) {
      aMenuList.selectedIndex = i;
      return true;
    }
  }
  if (!aCreate)
    return false;
  item = aMenuList.appendItem(aValue, aValue);
  // getIndexOfItem was added in TB/FF 3
  aMenuList.selectedIndex = aMenuList.menupopup.childNodes.length - 1;
  return true;
};

/**
 * Attempts a few basic fixes for 'broken' usernames.
 * In the past, gContactSync didn't check that a username included the domain
 * which would pass authentication and then fail to do anything else.
 * It also didn't make sure there were no spaces in a username which would
 * also pass authentication and break for everything else.
 * See Bug 21567
 *
 * @param aUsername {string} The username to fix.
 *
 * @returns {string} A username with a domain and no spaces.
 */
com.gContactSync.fixUsername = function gCS_fixUsername(aUsername) {
  if (!aUsername)
    return null;
  // Add @gmail.com if necessary
  if (aUsername.indexOf("@") === -1)
    aUsername += "@gmail.com";
  // replace any spaces or tabs
  aUsername = aUsername.replace(/[ \t\n\r]/g, "");
  return aUsername;
};

/**
 * Displays an alert dialog with the given text and an optional title.
 *
 * @param aText {string} The message to display.
 * @param aTitle {string} The title for the message (optional - default is
 *                        "gContactSync Notification").
 * @param aParent {nsIDOMWindow} The parent window (also optional).
 */
com.gContactSync.alert = function gCS_alert(aText, aTitle, aParent) {
  if (!aTitle) {
    aTitle = com.gContactSync.StringBundle.getStr("alertTitle");
  }
  var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                .getService(Components.interfaces.nsIPromptService);
  promptService.alert(aParent, aTitle, aText);
};

/**
 * Displays an alert dialog titled "gContactSync Error" (in English).
 *
 * @param aText {string} The message to display.
 */
com.gContactSync.alertError = function gCS_alertError(aText) {
  var title = com.gContactSync.StringBundle.getStr("alertError");
  com.gContactSync.alert(aText, title, null);
};

/**
 * Displays an alert dialog titled "gContactSync Warning" (in English).
 *
 * @param aText {string} The message to display.
 */
com.gContactSync.alertWarning = function gCS_alertWarning(aText) {
  var title = com.gContactSync.StringBundle.getStr("alertWarning");
  com.gContactSync.alert(aText, title, null);
};

/**
 * Displays a confirmation dialog with the given text and an optional title.
 *
 * @param aText {string} The message to display.
 * @param aTitle {string} The title for the message (optional - default is
 *                        "gContactSync Confirmation").
 * @param aParent {nsIDOMWindow} The parent window (also optional).
 */
com.gContactSync.confirm = function gCS_confirm(aText, aTitle, aParent) {
  if (!aTitle) {
    aTitle = com.gContactSync.StringBundle.getStr("confirmTitle");
  }
  var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                .getService(Components.interfaces.nsIPromptService);
  return promptService.confirm(aParent, aTitle, aText);
};

/**
 * Displays a prompt with the given text and an optional title.
 *
 * @param aText {string} The message to display.
 * @param aTitle {string} The title for the message (optional - default is
 *                        "gContactSync Prompt").
 * @param aParent {nsIDOMWindow} The parent window (also optional).
 * @param aDefault {string} The default value for the textbox.
 */
com.gContactSync.prompt = function gCS_prompt(aText, aTitle, aParent, aDefault) {
  if (!aTitle) {
    aTitle = com.gContactSync.StringBundle.getStr("promptTitle");
  }
  var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                .getService(Components.interfaces.nsIPromptService),
      input         = { value: aDefault },
      response      = promptService.prompt(aParent, aTitle, aText, input, null, {});
  return response ? input.value : false; 
};

/**
 * Opens the Accounts dialog for gContactSync
 */
com.gContactSync.openAccounts = function gCS_openAccounts() {
    window.open("chrome://gcontactsync/content/Accounts.xul",
                "gContactSync_Accts",
                "chrome=yes,resizable=yes,toolbar=yes,centerscreen=yes");
};

/**
 * Opens the Preferences dialog for gContactSync
 */
com.gContactSync.openPreferences = function gCS_openPreferences() {
  window.open("chrome://gcontactsync/content/options.xul",
              "gContactSync_Prefs",
              "chrome=yes,resizable=yes,toolbar=yes,centerscreen=yes");
};

/**
 * Opens the given URL using the openFormattedURL and
 * openFormattedRegionURL functions.
 *
 * @param aURL {string} THe URL to open.
 */
com.gContactSync.openURL = function gCS_openURL(aURL) {
  com.gContactSync.LOGGER.VERBOSE_LOG("Opening the following URL: " + aURL);
  if (!aURL) {
    com.gContactSync.LOGGER.LOG_WARNING("Caught an attempt to load a blank URL");
    return;
  }
  try {
    if (openFormattedURL) {
      openFormattedURL(aURL);
      return;
    }
  }
  catch (e) {
    com.gContactSync.LOGGER.LOG_WARNING(" - Error in openFormattedURL", e);
  }
  try {
    if (openFormattedRegionURL) {
      openFormattedRegionURL(aURL);
      return;
    }
  }
  catch (e) {
    com.gContactSync.LOGGER.LOG_WARNING(" - Error in openFormattedURL", e);
  }
  com.gContactSync.LOGGER.LOG_WARNING("Could not open the URL: " + aURL);
  return;
};

/**
 * Opens the "view source" window with the log file.
 */
com.gContactSync.showLog = function gCS_showLog() {
  try {
    window.open("view-source:file://" + com.gContactSync.FileIO.mLogFile.path,
                "gContactSyncLog",
                "chrome=yes,resizable=yes,height=480,width=600");
  }
  catch(e) {
    com.gContactSync.LOGGER.LOG_WARNING("Unable to open the log", e);
  }
};

/**
 * Replaces http://... with https://... in URLs as a permanent workaround for
 * the issue described here:
 * http://www.google.com/support/forum/p/apps-apis/thread?tid=6fde249ce2ffe7a9&hl=en
 *
 * @param aURL {string} The URL to fix.
 * @return {string} The URL using https instead of http
 */
com.gContactSync.fixURL = function gCS_fixURL(aURL) {
  if (!aURL) {
    return aURL;
  }
  return aURL.replace(/^http:/i, "https:");
};
