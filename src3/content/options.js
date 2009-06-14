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

window.addEventListener("load", function optionsLoadListener(e) {
  initialize();
  window.sizeToContent();
 }, false);

var usernames = {};

/**
 * initialize
 * Initializes the string bundle, FileIO and Preferences scripts and fills the
 * login tree.
 */
function initialize() {
  StringBundle.init();
  FileIO.init();
  Preferences.getSyncPrefs();
  enableSyncGroups();
  //document.getElementById("cMyContacts").addEventListener("change", myContactsChange, false);
  // if this is the full preferences dialog add a few event listeners
  if (document.getElementById("syncExtended")) {
    document.getElementById("syncExtended")
            .addEventListener("change", enableExtended, false);
    enableExtended();
    document.getElementById("autoSync")
            .addEventListener("change", enableDelays, false);
    enableDelays();
  }
  if (document.getElementById("loginTree"))
    fillLoginTree();
}

/**
 * fillLoginTree
 * Populates the login tree for the preferences window with the synchronized
 * accounts and directories.
 */
function fillLoginTree() {
  var tree          = document.getElementById("loginTree");
  var treechildren  = document.getElementById("loginTreeChildren");
  if (treechildren)
    try { tree.removeChild(treechildren); } catch(e) {}
  var newTreeChildren = document.createElement("treechildren");
  newTreeChildren.setAttribute("id", "loginTreeChildren");
  tree.appendChild(newTreeChildren);
  var logins = LoginManager.getAuthTokens();
  var abs    = AbManager.getSyncedAddressBooks();
  for (var i in logins) {
    var abName = "";
    if (abs[i] && abs[i].primary && abs[i].primary.mDirectory)
      abName = abs[i].primary.getName();
    usernames[i] = true;
    addLoginToTree(newTreeChildren, i, abName);
  }
}
/**
 * removeSelectedLogin
 * Removes the selected account's username and auth token from the login manager.
 */
function removeSelectedLogin() {
  var tree = document.getElementById("loginTree");
  if (!tree || tree.currentIndex == -1)
    return false;
  var cellText = tree.view.getCellText(tree.currentIndex, tree.columns.getColumnAt(0));
  if (cellText && confirm(StringBundle.getStr("removeLogin"))) {
    LoginManager.removeAuthToken(cellText);
    usernames[cellText] = null;
    // remove the saved prefs from the address books
    var abs   = AbManager.getSyncedAddressBooks();
    var abObj = abs[cellText];
    if (abObj && abObj.primary && abObj.secondary) {
      var primary = abObj.primary;
      primary.setUsername("");
      primary.setPrimary("");
      primary.setLastSyncDate(0);
      var secondary = abObj.secondary;
      for (var j in secondary) {
        secondary[j].setUsername("");
        secondary[j].setPrimary("");
        secondary[j].setLastSyncDate(0);
      }
    }
    var treeitem     = document.getElementById(cellText);
    var treechildren = document.getElementById("loginTreeChildren");
    
    if (treeitem && treechildren)
      try { treechildren.removeChild(treeitem); } catch(e) {}
  }
}

/**
 * addLogin
 * Adds an auth token to the login manager.
 */
function addLogin() {
  var prompt   = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                  .getService(Ci.nsIPromptService)
                  .promptUsernameAndPassword;
  var username = {};
  var password = {};
  // opens a username/password prompt
  var ok = prompt(window, StringBundle.getStr("loginTitle"),
                  StringBundle.getStr("loginText"), username, password, null,
                  {value: false});
  if (!ok)
    return false;
  if (usernames[username.value]) { // the username already exists
    alert(StringBundle.getStr("usernameExists"));
    return false;
  }
  // This is a primitive way of validating an e-mail address, but Google takes
  // care of the rest.  It seems to allow getting an auth token w/ only the
  // username, but returns an error when trying to do anything w/ that token
  // so this makes sure it is a full e-mail address.
  if (username.value.indexOf("@") < 1) {
    alert(StringBundle.getStr("invalidEmail"));
    return addLogin();
  }
  var body    = gdata.makeAuthBody(username.value, password.value);
  var httpReq = new GHttpRequest("authenticate", null, null, body);
  // if it succeeds and Google returns the auth token, store it and then start
  // a new sync
  httpReq.mOnSuccess = ["addToken('" + username.value +
                        "', httpReq.responseText.split(\"\\n\")[2]);"];
  // if it fails, alert the user and prompt them to try again
  httpReq.mOnError   = ["alert(StringBundle.getStr('authErr'));",
                        "LOGGER.LOG_ERROR('Authentication Error - ' + " + 
                        "httpReq.status, httpReq.responseText);",
                        "addLogin();"];
  // if the user is offline, alert them and quit
  httpReq.mOnOffline = ["alert(StringBundle.getStr('offlineErr'));",
                        "LOGGER.LOG_ERROR(StringBundle.getStr('offlineErr'));"];
  httpReq.send();
  return true;
}

/**
 * addToken
 * Adds a username and auth token to the login manager.
 * @param aUsername  {string} The username (e-mail address) whose contacts will
 *                   be synchronized.
 * @param aAuthToken {string} The auth token obtained from Google for the
 *                   account.
 */
function addToken(aUsername, aAuthToken) {
  LOGGER.VERBOSE_LOG("adding token");
  var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                 .getService(Ci.nsIPromptService);
  var input   = {value: aUsername};
  var check   = {};
  var result  = prompts.prompt(null, StringBundle.getStr("abNameTitle") + " " +
                               aUsername, StringBundle.getStr("abName"), input,
                               null, check);
  if (result && input.value && input.value != "") {
    if (AbManager.getAbByName(input.value, true)) {
      // if an address book already exists with the name, warn the user and let
      // him or her choose a new name
      if(!confirm(StringBundle.getStr("abExists"))) {
        addToken(aUsername, aAuthToken);
        return false;
      }
    }
    LoginManager.addAuthToken(aUsername, 'GoogleLogin ' + aAuthToken);
    usernames[aUsername] = true;
    var ab = new GAddressBook(AbManager.getAbByName(input.value));
    ab.setUsername(aUsername);
    ab.setPrimary(true);
    ab.setLastSyncDate(0);
    var treechildren = document.getElementById("loginTreeChildren");
    addLoginToTree(treechildren, aUsername, input.value);
    return true;
  }
  else if (!result)
    LOGGER.VERBOSE_LOG("prompt canceled");
  else
    LOGGER.VERBOSE_LOG("Invalid input: " + input ? input.value : null);
  return false;
}

/**
 * addLoginToTree
 * Adds login information (username and directory name) to the tree.
 * @param aTreeChildren {object} The <treechildren> XUL element.
 * @param aUsername     {string} The username (e-mail address).
 * @param aDirName      {string} The name of the directory with which this account's
 *                      contacts will be synchronized.
 */
function addLoginToTree(aTreeChildren, aUsername, aDirName) {
  var treeitem    = document.createElement("treeitem");
  var treerow     = document.createElement("treerow");
  var username    = document.createElement("treecell");
  var addressbook = document.createElement("treecell");
  
  treeitem.setAttribute("id", aUsername);
  username.setAttribute("label", aUsername);
  addressbook.setAttribute("label", aDirName);
  
  treerow.appendChild(username);
  treerow.appendChild(addressbook);
  treeitem.appendChild(treerow);
  aTreeChildren.appendChild(treeitem);
  return true;
}
/**
 * changeAbName
 * Changes the name of the selected address book, if an address book with the
 * new name does exist, otherwise it updates the preferences to synchronize the
 * other address book instead.
 */
function changeAbName() {
  var tree = document.getElementById("loginTree");
  if (!tree || tree.currentIndex == -1)
    return false;
  var username = tree.view.getCellText(tree.currentIndex, tree.columns.getColumnAt(0));
  var oldAb    = AbManager.getSyncedAddressBooks()[username];
  if (oldAb)
    oldAb = oldAb.primary;
  var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                 .getService(Ci.nsIPromptService);
  // set the default to the existing name or, if not present, the username
  var input  = {value: oldAb && oldAb.mDirectory ? oldAb.mDirectory.dirName : username};
  var check  = {};
  var result = prompts.prompt(null, StringBundle.getStr("abNameTitle") + " " +
                              username, StringBundle.getStr("abName"), input,
                              null, check);
  // change the synced address book if:
  //  * the user clicked OK
  //  * there was a valid, non-blank response
  //  * the new name isn't the same as the old name
  if (result && input.value && input.value != "" &&
      !(oldAb && input.value == oldAb.mDirectory.dirName)) {
    var existingAb = AbManager.getAbByName(input.value, true);
    var newAb;
    if (existingAb) {
      // if an ab with the name already exists, warn the user and let him or her
      // choose a new name
      if(!confirm(StringBundle.getStr("abExists"))) {
        changeAbName();
        return false;
      }
      // if they still want it, setup the new one and remove the prefs from the old
      existingAb.dirName = input.value;
      newAb = new GAddressBook(existingAb);
      // remove the prefs from the old address book
      if (oldAb) {
        oldAb.setUsername("");
        oldAb.setPrimary(false);
        oldAb.setLastSyncDate(0);
      }
      // setup the prefs for the new address book
      newAb.setUsername(username);
      newAb.setPrimary(true);
      newAb.setLastSyncDate(0);
    }
    // rename the old address book, if present, and don't change any prefs
    else if (oldAb) {
      // if the old address book is either the PAB or CAB, don't rename and
      // make a new address book instead
      if (oldAb.mURI == "moz-abmdbdirectory://abook.mab" ||
          oldAb.mURI == "moz-abmdbdirectory://history.mab") {
        newAb = new GAddressBook(AbManager.getAbByName(input.value));
        // setup the prefs for the new address book
        newAb.setUsername(username);
        newAb.setPrimary(true);
        newAb.setLastSyncDate(0);
        // remove the prefs from the old one
        oldAb.setUsername("");
        oldAb.setPrimary(false);
        oldAb.setLastSyncDate(0);
      }
      else {
        try {
          // this will only fail if input.value is the PAB or CAB's name, which
          // should not ever happen since the PAB and CAB should already exist
          oldAb.setName(input.value);
        }
        catch(e) {
          LOGGER.LOG_WARNING("Attempt to rename a directory to the PAB or CAB aborted");
          alert(StringBundle.getStr("invalidDirName"));
          changeAbName();
        }
      }
    }
    // otherwise, make the new address book
    else {
      newAb = new GAddressBook(AbManager.getAbByName(input.value));
      // setup the prefs for the new address book
      newAb.setUsername(username);
      newAb.setPrimary(true);
      newAb.setLastSyncDate(0);
    }
    tree.view.setCellText(tree.currentIndex, tree.columns.getColumnAt(1), input.value);
  }
  return true;
}

/**
 * enableExtended
 * Enables or disables the extended property textboxes based on the state of
 * the syncExtended checkbox.
 */
function enableExtended() {
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
}

/**
 * enableDelays
 * Enables or disables the delay textboxes based on the auto sync checkbox.
 */
function enableDelays() {
  var disableElem  = document.getElementById("autoSync");
  var intervalElem = document.getElementById("refreshIntervalBox");
  var initialElem  = document.getElementById("initialDelayBox");
  if (!disableElem) return false;
  if (intervalElem)
    intervalElem.disabled = !disableElem.value;
  if (initialElem)
    initialElem.disabled  = !disableElem.value;
  return true;
}

/**
 * myContactsChange
 * Switches the synchronization type between one group and all groups.
 *
 * @param checkbox {object} The XUL checkbox element.
 */
function myContactsChange(checkbox) {
  if (confirm(StringBundle.getStr("confirmMyContacts"))) {
    var retVal = resetAllSyncedABs();
    setTimeout("enableSyncGroups()", 500);
    return retVal;
  }
  else if (checkbox) {
    checkbox.checked = !checkbox.checked;
    setTimeout("enableSyncGroups()", 500);
    return false;
  }
  return false;
}


/**
 * groupsChange
 * Switches the synchronization type between all groups + contacts to all
 * contacts and no groups.
 *
 * @param checkbox {object} The XUL checkbox element.
 */
function groupsChange(checkbox) {
  // make sure the checkbox isn't disabled
  if (checkbox && checkbox.disabled)
    return false;
  if (confirm(StringBundle.getStr("confirmMyContacts"))) {
    return resetAllSyncedABs();
  }
  else if (checkbox) {
    checkbox.checked = !checkbox.checked;
    return false;
  }
  return false;
}

function enableSyncGroups() {
  var groupsElem     = document.getElementById("cSyncGroups");
  var myContactsElem = document.getElementById("cMyContacts");
  if (!groupsElem || !myContactsElem) return false;
  groupsElem.disabled = myContactsElem.checked;
  return true;
}

/**
 * resetAllSyncedABs
 * Resets all synchronized address books in the following ways:
 *  - Deletes all mailing lists
 *  - Deletes all contacts
 *  - Sets the last sync date to 0.
 * See AddressBook.reset for more details.
 *
 * It asks the user to restart Thunderbird when finished.
 *
 * @param showConfirm {boolean} Show a confirmation dialog first and quit if
 * the user presses Cancel.
 */
function resetAllSyncedABs(showConfirm) {
  if (showConfirm) {
    if (!confirm(StringBundle.getStr("confirmReset"))) {
      return false;
    }
  }
  
  // disable the address book listener
  var original = Preferences.getPref(Preferences.mSyncBranch,
                                     Preferences.mSyncPrefs.listenerDeleteFromGoogle.label,
                                     Preferences.mSyncPrefs.listenerDeleteFromGoogle.type);
  if (original) {
    LOGGER.LOG("Disabled the listener");
    changeDeleteListener(false);
  }
  LOGGER.LOG("Resetting all synchronized directories.");
  var abs = AbManager.getSyncedAddressBooks();
  for (var i in abs) {
    abs[i].primary.reset();
  }
  
  // re-enable the address book listener, if necessary
  if (original) {
    LOGGER.LOG("Re-enabled the listener");
    changeDeleteListener(true);
  }
  LOGGER.LOG("Finished resetting all synchronized directories.");
  alert(StringBundle.getStr("pleaseRestart"));
  return true;
}