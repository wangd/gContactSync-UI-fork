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
 * Portions created by the Initial Developer are Copyright (C) 2009
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
 
if (!com) var com = {};
if (!com.gContactSync) com.gContactSync = {};

window.addEventListener("load", function optionsLoadListener(e) {
  com.gContactSync.Accounts.initDialog();
 }, false);

/**
 * com.gContactSync.Accounts
 * The JavaScript variables and functions that handle different gContactSync
 * accounts allowing each synchronized address book to have its own preferences.
 * @class
 */
com.gContactSync.Accounts = {
  // The column index of the address book name
  // change this if adding a column before the AB name
  mAbNameIndex:  0,
  // Element IDs used when enabling/disabling the preferences
  mPrefElemIDs: [
    "Username",
    "Groups",
    "showAdvanced",
    "Plugin",
    "SyncDirection",
    "disabled"
  ],
  /**
   * Accounts.initDialog
   * Initializes the Accounts dialog by filling the tree of address books,
   * filling in the usernames, hiding the advanced settings, etc.
   */
  initDialog:  function Accounts_initDialog() {
    try {
      Preferences.getSyncPrefs();
      this.fillAbTree();
      this.fillUsernames();
      this.showAdvancedSettings(document.getElementById("showAdvanced").checked);
      this.selectedAbChange();
    }
    catch (e) {
      LOGGER.LOG_WARNING("Error in Accounts.initDialog", e);
      // TODO remove the alert
      alert(e);
    }
  },
  /**
   * Accounts.newUsername
   * Create a new username/account for the selected plugin.
   */
  newUsername: function Accounts_newUsername() {
    var prompt   = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                             .getService(Components.interfaces.nsIPromptService)
                             .promptUsernameAndPassword;
    var username = {};
    var password = {};
    // opens a username/password prompt
    var ok = prompt(window, StringBundle.getStr("loginTitle"),
                    StringBundle.getStr("loginText"), username, password, null,
                    {value: false});
    if (!ok)
      return false;
    if (LoginManager.getAuthToken(username.value)) { // the username already exists
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
    httpReq.mOnSuccess = ["LoginManager.addAuthToken('" + username.value +
                          "', 'GoogleLogin' + httpReq.responseText.split(\"\\n\")[2]);",
                          "com.gContactSync.Accounts.selectedAbChange();"];
    // if it fails, alert the user and prompt them to try again
    httpReq.mOnError   = ["alert(StringBundle.getStr('authErr'));",
                          "LOGGER.LOG_ERROR('Authentication Error - ' + " + 
                          "httpReq.status, httpReq.responseText);",
                          "com.gContactSync.Accounts.newUsername();"];
    // if the user is offline, alert them and quit
    httpReq.mOnOffline = ["alert(StringBundle.getStr('offlineErr'));",
                          "LOGGER.LOG_ERROR(StringBundle.getStr('offlineErr'));"];
    httpReq.send();
    return true;
  },
  /**
   * Accounts.getSelectedAb
   * Returns a new GAddressBook corresponding to the currently-selected address
   * book in the accounts tree.
   * @return A GAddressBook if one is selected, else false.
   */
  getSelectedAb: function Accounts_getSelectedAb() {
    var tree = document.getElementById("loginTree");
    if (tree.currentIndex < 0) {
      this.enablePreferences(false);
      return false;
    }
    this.enablePreferences(true);
    var abName = tree.view.getCellText(tree.currentIndex,
                                       tree.columns.getColumnAt(this.mAbNameIndex));
    var ab = GAbManager.getAbByName(abName);
    if (!ab)
      return false;
    return new GAddressBook(ab);    
  },
  /**
   * Accounts.newAddressBook
   * Create a new address book.
   */
  newAddressBook: function Accounts_newAddressBook() {
    // TODO fill in
    alert("Sorry, this feature is not complete");
  },
  /**
   * Accounts.saveSelectedAccount
   * Saves the preferences for the selected address book
   */
  saveSelectedAccount: function Accounts_saveSelectedAccount() {
    var usernameElem  = document.getElementById("Username");
    var groupElem     = document.getElementById("Groups");
    var directionElem = document.getElementById("SyncDirection");
    var pluginElem    = document.getElementById("Plugin");
    var disableElem   = document.getElementById("disabled");
    var ab = this.getSelectedAb();
    if (!ab)
      return ab;

    if (!usernameElem || !groupElem || !directionElem || !pluginElem || !disableElem)
      return false;
    // the simple preferences
    ab.savePref("Username", usernameElem.value);
    ab.savePref("Plugin",   pluginElem.value);
    ab.savePref("Disabled", disableElem.checked);
    // this is for backward compatibility
    ab.savePref("Primary",  "true");
    // Group to sync
    ab.savePref("syncGroups", groupElem.value == "All");
    ab.savePref("myContacts", new String(groupElem.value != "All" && groupElem.value != "None"));
    ab.savePref("myContactsName", groupElem.value);
    // Sync Direction
    ab.savePref("writeOnly", directionElem.value == "WriteOnly");
    ab.savePref("readOnly",  directionElem.value == "ReadOnly");
    // TODO only reset if necessary
    if (usernameElem.value)
      ab.reset();
    this.fillUsernames();
    this.selectedAbChange();
    alert(StringBundle.getStr("finishedAcctSave"));
    return true;
  },
  /**
   * Accounts.enablePreferences
   * Enables or disables the preference elements.
   *
   * @param aEnable {boolean} Set to true to enable elements or false to disable
   *                          them.
   */
  enablePreferences: function Accounts_enablePreferences(aEnable) {
    for (var i = 0; i < this.mPrefElemIDs.length; i++) {
      var elem = document.getElementById(this.mPrefElemIDs[i]);
      if (!elem) {alert(this.mPrefElemIDs[i] + " not found"); continue;}
      elem.disabled = aEnable ? false : true;
    }
  },
  /**
   * Accounts.showAdvancedSettings
   * Show or hide the advanced settings and then call window.sizeToContent().
   *
   * @param aShow {boolean} Set to true to show the advanced settings or false
   *                        to hide them.
   */
  showAdvancedSettings: function Accounts_showAdvanceDsettings(aShow) {
    var elem = document.getElementById("advancedGroupBox");
    if (!elem) return false;
    elem.setAttribute("collapsed", aShow ? "false" : "true");
    window.sizeToContent();
    return true;
  },
  /**
   * Accounts.selectedAbChange
   * Called when the selected address book changes in the accounts tree.
   * @return true if there is currently an address book selected.
   */
  selectedAbChange: function Accounts_selectedAbChange() {
    var usernameElem  = document.getElementById("Username");
    var groupElem     = document.getElementById("Groups");
    var directionElem = document.getElementById("SyncDirection");
    var pluginElem    = document.getElementById("Plugin");
    var disableElem   = document.getElementById("disabled");
    this.restoreGroups();
    if (!usernameElem || !groupElem || !directionElem || !pluginElem || !disableElem)
      return false;
    var ab = this.getSelectedAb();
    if (!ab)
      return ab;
    // Username/Account
    this.fillUsernames(ab.mPrefs.Username);
    // Group
    // The myContacts pref (enable sync w/ one group) has priority
    // If that is checked an the myContactsName is pref sync just that group
    // Otherwise sync all or no groups based on the syncGroups pref
    var group        = ab.mPrefs.myContacts
                         ? (ab.mPrefs.myContactsName
                            ? ab.mPrefs.myContactsName
                            : "false")
                         : (ab.mPrefs.syncGroups != "false"
                            ? "All"
                            : "false");
    com.gContactSync.selectMenuItem(groupElem, group, true);
    // Sync Direction
    var direction = ab.mPrefs.readOnly == "true"
                      ? "ReadOnly"
                      : ab.mPrefs.writeOnly == "true"
                        ? "WriteOnly"
                        : "Complete";
    com.gContactSync.selectMenuItem(directionElem, direction, true);
    // Temporarily disable synchronization with the address book
    disableElem.checked = ab.mPrefs.Disabled == "true";
    // Select the correct plugin
    com.gContactSync.selectMenuItem(pluginElem, ab.mPrefs.Plugin, true);
    
    return true;
  },
  /**
   * Accounts.fillUsernames
   * Fills the 'Username' menulist with all the usernames of the current plugin.
   *
   * @param aDefault {string} The default account to select.  If not present or
   *                          evaluating to 'false' then 'None' will be
   *                          selected.
   */
  fillUsernames: function Accounts_fillUsernames(aDefault) {
    var usernameElem = document.getElementById("Username");
    if (!usernameElem)
      return false;
    // Remove all existing logins from the menulist
    usernameElem.removeAllItems();

    var tokens = LoginManager.getAuthTokens();
    var item;
    var index = -1;
    usernameElem.appendItem(StringBundle.getStr("noAccount"), "none");
    // Add a menuitem for each account with an auth token
    for (var username in tokens) {
      item = usernameElem.appendItem(username, username);
      if (aDefault == username && aDefault !== undefined)
        index = usernameElem.menupopup.childNodes.length - 1;
    }

    if (index > -1)
      usernameElem.selectedIndex = index;
    // if the default value isn't in the menu list, add & select it
    // this can happen when an account is added through one version of the
    // login manager and the Accounts dialog was opened in another
    // This isn't retained (for now?) to prevent anyone from setting up a new
    // synchronized account with it and expecting it to work.
    else if (aDefault)
      com.gContactSync.selectMenuItem(usernameElem, aDefault, true);
    // Otherwise select None
    else
      usernameElem.selectedIndex = 0;

    return true;
  },
  /**
   * Accounts.fillAbTree
   * Populates the address book tree with all Personal/Mork Address Books
   */
  fillAbTree: function Accounts_fillAbTree() {
    var tree          = document.getElementById("loginTree");
    var treechildren  = document.getElementById("loginTreeChildren");
  
    if (treechildren)
      try { tree.removeChild(treechildren); } catch(e) {}
    var newTreeChildren = document.createElement("treechildren");
    newTreeChildren.setAttribute("id", "loginTreeChildren");
    tree.appendChild(newTreeChildren);
  
    // Get all Personal/Mork DB Address Books (type == 2,
    // see mailnews/addrbook/src/nsDirPrefs.h)
    // TODO - there should be a way to change the allowed dir types...
    var abs    = GAbManager.getAllAddressBooks(2);
    for (var i in abs)
      this.addToTree(newTreeChildren, abs[i]);
    return true;
  },
  /**
   * Accounts.addToTree
   * Adds login information (username and directory name) to the tree.
   * @param aTreeChildren {object} The <treechildren> XUL element.
   * @param aAB           {GAddressBook} The GAddressBook to add.
   */
  addToTree: function Accounts_addToTree(aTreeChildren, aAB) {
    if (!aAB || !aAB instanceof GAddressBook)
      throw "Error - Invalid AB passed to addToTree";
    var treeitem    = document.createElement("treeitem");
    var treerow     = document.createElement("treerow");
    var addressbook = document.createElement("treecell");
    var synced      = document.createElement("treecell");

    aAB.getPrefs();

    addressbook.setAttribute("label", aAB.getName());
    synced.setAttribute("label", aAB.mPrefs.Username ? aAB.mPrefs.Username : StringBundle.getStr("noAccount"));
  
    treerow.appendChild(addressbook);
    treerow.appendChild(synced);
    treeitem.appendChild(treerow);
    aTreeChildren.appendChild(treeitem);

    return true;
  },
  /**
   * Accounts.deleteSelectedAB
   * Deletes the selected address book
   */
  deleteSelectedAB: function Accounts_deleteSelectedAB() {
    var ab = this.getSelectedAb();
    if (!ab) {
      // TODO this needs an error message (please select an AB first)
      return ab;
    }
    // TODO check if PAB or CAB
    if (!confirm(StringBundle.getStr("deleteAB")))
      return false;
    // This function also checks that the AB isn't the PAB or CAB
    ab.deleteAB();
    this.fillAbTree();
    return true;
  },
  /**
   * Accounts.removeSyncSettings
   * Removes the selected account's username and auth token from the login manager.
   */
  removeSyncSettings: function Accounts_removeSelectedLogin() {  
    if (confirm(StringBundle.getStr("removeSyncSettings"))) {
      // TODO FIXME
      alert("Sorry, function not complete");
      return;
      // remove the saved prefs from the address books
      var abs   = GAbManager.getSyncedAddressBooks();
      var abObj = abs[cellText];
      if (abObj) {
        for (var j in abObj) {
          // TODO add clearPrefs
          abObj[j].setUsername("");
          abObj[j].setLastSyncDate(0);
        }
      }
    }
  },
  /**
   * Accounts.directionPopup
   * Shows an alert dialog that briefly explains the synchronization direction
   * preference.
   */
  directionPopup: function Accounts_directionPopup() {
    alert(StringBundle.getStr("directionPopup")); 
  },
  /**
   * Accounts.restoreGroups
   * Restores the Groups menulist to contain only the default groups.
   */
  restoreGroups: function Accounts_restoreGroups() {
    var groupElem = document.getElementById("GroupsPopup");
    for (var i = groupElem.childNodes.length - 1; i > -1; i--) {
      if (groupElem.childNodes[i].getAttribute("class") != "default")
        groupElem.removeChild(groupElem.childNodes[i]);
    }
  },
  /**
   * Accounts.getAllGroups
   * Fetch all groups for the selected account and add custom groups to the
   * menulist.
   */
  getAllGroups: function Accounts_getAllGroups() {
    var usernameElem  = document.getElementById("Username");
    this.restoreGroups();
    if (usernameElem.value == "none" || !usernameElem.value)
      return false;
    var token = LoginManager.getAuthTokens()[usernameElem.value];
    if (!token) {
      LOGGER.LOG_WARNING("Unable to find the token for username " + usernameElem.value);
      return false;
    }
    LOGGER.VERBOSE_LOG("Fetching groups for username: " + usernameElem.value);
    var httpReq = new GHttpRequest("getGroups", token, null,
                                   null, usernameElem.value);
    httpReq.mOnSuccess = ["LOGGER.VERBOSE_LOG(com.gContactSync.serializeFromText(httpReq.responseText))",
                          "Accounts.addGroups(httpReq.responseXML, '"
                          + usernameElem.value + "');"],
    httpReq.mOnError   = ["LOGGER.LOG_ERROR(httpReq.responseText);"];
    httpReq.mOnOffline = [];
    httpReq.send();
    return true;
  },
  /**
   * Accounts.addGroups
   * Adds groups in the given atom feed to the Groups menulist provided the
   * username hasn't changed since the groups request was sent and the username
   * isn't blank.
   */
  addGroups: function Accounts_addGroups(aAtom, aUsername) {
    var usernameElem  = document.getElementById("Username");
    var menulistElem  = document.getElementById("Groups");
    if (!aAtom)
      return false;
    if (usernameElem.value == "none" || usernameElem.value != aUsername)
      return false;
    var arr = aAtom.getElementsByTagNameNS(gdata.namespaces.ATOM.url, "entry");
    var group, title;
    LOGGER.VERBOSE_LOG("Adding groups from username: " + aUsername);
    for (var i = 0; i < arr.length; i++) {
      group = new Group(arr[i]);
      title = group.getTitle();
      LOGGER.VERBOSE_LOG(" * " + title);
      // don't add system groups again
      if (!title || group.isSystemGroup()) {
        LOGGER.VERBOSE_LOG("    - Skipping system group");
        continue;
      }
      menulistElem.appendItem(title, title);
    }
    return true;
  }
}
