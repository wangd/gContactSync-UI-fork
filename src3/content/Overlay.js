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
 * Overlay.js
 * Contains the Overlay class and a load listener for the Address Book.
 * When the Address Book loads, initializes the string bundle(s), gets the
 * preferences, initializes the FileIO class and member files, and
 * checks for an authentication token.  If there is no auth token it prompts the
 * user to login.
 */
// initialize everything after the Address Book window loads
window.addEventListener("load", function eventListener(e) {
        Overlay.initialize();
}, false);
var originalOnLoadCardView;
var originalDisplayCardViewPane;
var originalSetAbView;
/**
 * Overlay
 * Checks if the authentication token is present and valid.  If so, it starts
 * everything up and synchronizes the contacts.  Otherwise it shows the
 * login window.
 * @class
 */
var Overlay = {
  mLastVersion: "0",
  /**
   * Special links for various IM protocols
   * Format: Type (from Google): protocol
   */
  links: {
    AIM:         "aim:goim?screenname=",
    MSN:         "msnim:chat?contact=",
    YAHOO:       "ymsgr:sendim?",
    SKYPE:       "skype:",
    SKYPES:      "?chat",
    JABBER:      "xmpp:",
    XMPP:        "xmpp:",
    GOOGLE_TALK: "gtalk:chat?jid="
  },
  /**
   * Called when the overlay is loaded and initializes everything and begins
   * the authentication check and sync or login prompt.
   */
  initialize: function Overlay_initialize() {
    // determine if this is before or after Bug 413260 landed
    var card = Cc["@mozilla.org/addressbook/cardproperty;1"]
               .createInstance(nsIAbCard);
    this.mBug413260 = card.getProperty ? true : false;
    StringBundle.init();        // initialize the string bundle
    FileIO.init();              // initialize the FileIO class
    Preferences.getSyncPrefs(); // get the preferences

    // Find the last version of gContactSync and set the pref to the current
    // version.
    this.mLastVersion = Preferences.mSyncPrefs.lastVersion.value;
    //alert(LoginManager.getAllEmailAccts(/@/).join('\n'));

    Preferences.setPref(Preferences.mSyncBranch,
                        Preferences.mSyncPrefs.lastVersion.label,
                        Preferences.mSyncPrefs.lastVersion.type,
                        version);

    if (FileIO.mLogFile && FileIO.mLogFile.exists())
      FileIO.mLogFile.remove(false); // delete the old log file

    // log some basic system and application info
    LOGGER.LOG("Loading gContactSync at " + new Date());
    LOGGER.LOG(" * Version is:       " + version);
    LOGGER.LOG(" * Last version was: " + this.mLastVersion);
    LOGGER.LOG(" * User Agent:       " + navigator.userAgent + "\n");

    originalOnLoadCardView = OnLoadCardView;
    OnLoadCardView = this.myOnLoadCardView;
    //if (Preferences.mSyncPrefs.enableSyncBtn.value)
      //Overlay.setupButton();    // insert the Sync button
    if (Preferences.mSyncPrefs.enableMenu.value)
      Overlay.setupMenu();      // add a shortcut menu
    gdata.contacts.init();
    ContactConverter.init();
    // add the extra attributes as tree columns to show and
    this.addTreeCols(); // sort by in the results pane if this is after 413260 
    // override the onDrop method of abDirTreeObserver
    // so when a card is copied the extra attributes are copied with it
    if (Preferences.mSyncPrefs.overrideCopy.value)
      abDirTreeObserver.onDrop = myOnDrop;
    // override the display card view pane
    originalDisplayCardViewPane = DisplayCardViewPane;
    DisplayCardViewPane = this.myDisplayCardViewPane;
    // Add a reset menuitem to the directory tree context menu
    if (Preferences.mSyncPrefs.addReset.value)
      this.addResetContext();
    // override the ab results tree function
    //originalSetAbView = SetAbView;
    //SetAbView = this.mySetAbView;
    AbListener.add(); // add the address book listener
    // call the unload function when the address book window is shut
    window.addEventListener("unload", function unloadListener(e) { Overlay.unload(); }, false);
    // load the card view (required by seamonkey)
    if (gAddressBookBundle) {
      this.myOnLoadCardView();
    }
    this.checkAuthentication(); // check if the Auth token is valid
  },
  /**
   * Called when the overlay is unloaded and removes the address book listener.
   */
  unload: function Overlay_unload() {
    AbListener.remove();
  },
  /**
   * ContactConverter.addTreeCols
   * Adds treecol elements to the address book results tree that shows cards in
   * the currently selected directory.  These treecols allow the user to show
   * and sort by extra attributes that are added by this extension.  This will
   * only work after Bug 413260 landed, so in Thunderbird 3.0b1pre and after.
   */
  addTreeCols: function Overlay_addTreeCols() {
    // get the treecols XUL element
    var treeCols = document.getElementById("abResultsTreeCols");
    if (!treeCols || !treeCols.appendChild)
      return;
    if (Preferences.mSyncPrefs.phoneColLabels.value) {
        // fix the existing phone numbers
        var arr = ["WorkPhone", "HomePhone", "FaxNumber","CellularNumber",
                   "PagerNumber"];
        // the strings from the string bundle
        //var arr2 = ["first", "second", "third", "fourth", "fifth"];
        var elem;
        for (var i = 0; i < arr.length; i++) {
          elem = document.getElementById(arr[i]);
          if (!elem)
            continue;
          // remove it
          treeCols.removeChild(elem);
          elem.setAttribute("label", StringBundle.getStr(arr[i]));
//          elem.setAttribute("label", StringBundle.getStr(arr2[i]));
          // and then add it to the end of the treecols element
          treeCols.appendChild(elem);
        }
    }
    // if Bug 413260 isn't applied in this version of TB, or if the pref was
    // changed to false, then stop here
    if (!this.mBug413260 || !Preferences.mSyncPrefs.newColLabels.value)
      return;
    // get the added attributes
    var ids = ContactConverter.getExtraSyncAttributes(false);
    var id, splitter, treeCol;
    // iterate through every added attribute and add a treecol for it unless
    // it is a postal address
    for (var i = 0, length = ids.length; i < length; i++) {
      id = ids[i];
      if (id.indexOf("Type") != -1)
        continue; // skip addresses and Types
      // make and add the splitter first
      splitter = document.createElement("splitter");
      splitter.setAttribute("class", "tree-splitter");
      treeCols.appendChild(splitter);
      // make the new treecol
      treeCol = document.createElement("treecol");
      // then set it up with the ID and other attributes
      treeCol.setAttribute("id", id);
      treeCol.setAttribute("class", "sortDirectionIndicator");
      treeCol.setAttribute("hidden", "true");
      treeCol.setAttribute("persist", "hidden ordinal width sortDirection");
      treeCol.setAttribute("flex", "1");
      treeCol.setAttribute("label", StringBundle.getStr(id));
      // append it to the treecols element
      treeCols.appendChild(treeCol);
    }
  },
  /**
   * Overlay.setupMenu
   * Sets up the gContactSync menu in the address book menubar
   */
  setupMenu: function Overlay_setupMenu() {
    try {
      var menubar      = document.getElementById("mail-menubar");
      var isSeamonkey  = menubar ? true : false;
      if (!menubar) // seamonkey
          menubar      = document.getElementById("ab-menubar");

      var toolsMenu    = document.getElementById("tasksMenu");
      var menu         = document.createElement("menu");
      menu.setAttribute("id", "gContactSyncMenu");
      menu.setAttribute("label", "gContactSync");
      menu.setAttribute("accesskey", "G");
      var menupopup    = document.createElement("menupopup");
      menupopup.setAttribute("id", "gContactSyncMenuPopup");

      var syncMenuItem = document.createElement("menuitem");
      syncMenuItem.setAttribute("id", "syncMenuItem");
      syncMenuItem.setAttribute("label", StringBundle.getStr("syncMenu"));
      syncMenuItem.setAttribute("accesskey", StringBundle.getStr("syncMenuKey"));
      syncMenuItem.setAttribute("oncommand", "Sync.begin();");
      syncMenuItem.setAttribute("class", "menuitem-iconic icon-mail16 menu-iconic");

      var acctMenuItem = document.createElement("menuitem");
      acctMenuItem.setAttribute("id", "acctMenuItem");
      acctMenuItem.setAttribute("label", StringBundle.getStr("acctMenu"));
      acctMenuItem.setAttribute("accesskey", StringBundle.getStr("acctMenuKey"));
      acctMenuItem.setAttribute("oncommand", "Overlay.openAccounts();");
      acctMenuItem.setAttribute("class", "menuitem-iconic icon-mail16 menu-iconic");

      var prefMenuItem = document.createElement("menuitem");
      prefMenuItem.setAttribute("id", "prefMenuItem");
      prefMenuItem.setAttribute("label", StringBundle.getStr("prefMenu"));
      prefMenuItem.setAttribute("accesskey", StringBundle.getStr("prefMenuKey"));
      prefMenuItem.setAttribute("oncommand", "Overlay.openPreferences();");
      prefMenuItem.setAttribute("class", "menuitem-iconic icon-mail16 menu-iconic");

      var forumMenuItem = document.createElement("menuitem");
      forumMenuItem.setAttribute("id", "forumMenuItem");
      forumMenuItem.setAttribute("label", StringBundle.getStr("forumMenu"));
      forumMenuItem.setAttribute("accesskey", StringBundle.getStr("forumMenuKey"));
      forumMenuItem.setAttribute("oncommand", "Overlay.openURL('extensions.gContactSync.forumURL');");
      forumMenuItem.setAttribute("class", "menuitem-iconic icon-mail16 menu-iconic");

      var wikiMenuItem = document.createElement("menuitem");
      wikiMenuItem.setAttribute("id", "wikiMenuItem");
      wikiMenuItem.setAttribute("label", StringBundle.getStr("wikiMenu"));
      wikiMenuItem.setAttribute("accesskey", StringBundle.getStr("wikiMenuKey"));
      wikiMenuItem.setAttribute("oncommand", "Overlay.openURL('extensions.gContactSync.wikiURL');");
      wikiMenuItem.setAttribute("class", "menuitem-iconic icon-mail16 menu-iconic");

      var faqMenuItem = document.createElement("menuitem");
      faqMenuItem.setAttribute("id", "faqMenuItem");
      faqMenuItem.setAttribute("label", StringBundle.getStr("faqMenu"));
      faqMenuItem.setAttribute("accesskey", StringBundle.getStr("faqMenuKey"));
      faqMenuItem.setAttribute("oncommand", "Overlay.openURL('extensions.gContactSync.faqURL');");
      faqMenuItem.setAttribute("class", "menuitem-iconic icon-mail16 menu-iconic");

      var errorMenuItem = document.createElement("menuitem");
      errorMenuItem.setAttribute("id", "errorMenuItem");
      errorMenuItem.setAttribute("label", StringBundle.getStr("errorMenu"));
      errorMenuItem.setAttribute("accesskey", StringBundle.getStr("errorMenuKey"));
      errorMenuItem.setAttribute("oncommand", "Overlay.openURL('extensions.gContactSync.errorURL');");
      errorMenuItem.setAttribute("class", "menuitem-iconic icon-mail16 menu-iconic");

      var logMenuItem = document.createElement("menuitem");
      logMenuItem.setAttribute("id", "logMenuItem");
      logMenuItem.setAttribute("label", StringBundle.getStr("logMenu"));
      logMenuItem.setAttribute("accesskey", StringBundle.getStr("logMenuKey"));
      logMenuItem.setAttribute("oncommand", "Overlay.showLog();");
      logMenuItem.setAttribute("class", "menuitem-iconic icon-mail16 menu-iconic");

      menupopup.appendChild(syncMenuItem);
      menupopup.appendChild(acctMenuItem);
      menupopup.appendChild(prefMenuItem);
      menupopup.appendChild(forumMenuItem);
      menupopup.appendChild(wikiMenuItem);
      menupopup.appendChild(faqMenuItem);
      menupopup.appendChild(errorMenuItem);
      menupopup.appendChild(logMenuItem);
      menu.appendChild(menupopup);
      menubar.insertBefore(menu, toolsMenu);
    }
    catch(e) {
      LOGGER.LOG_WARNING("Unable to setup the menu", e);
    }
  },
  /**
   * Overlay.setupButton
   * Sets up the Sync button to go between the Write and Delete buttons and adds
   * a separator between Sync and Delete.
   */
  setupButton: function Overlay_setupButton() {
    try {
      LOGGER.VERBOSE_LOG("Trying to add button");
      // get the toolbar with the buttons
      var toolbar     = document.getElementById("ab-bar2");   // thunderbird
      var isSeamonkey = toolbar ? true : false;
      if (!toolbar) {
        LOGGER.VERBOSE_LOG("Didn't find ab-bar2...looking for abToolbar")
        toolbar       = document.getElementById("abToolbar"); // seamonkey
        if (!toolbar) {
          LOGGER.LOG_ERROR("Could not find the toolbar");
          return false;
        }
      }
      // setup the separators
      var separator   = document.createElement("toolbarseparator");
      var separator2  = document.createElement("toolbarseparator");
      // setup the button
      var button      = document.createElement("toolbarbutton");
      button.setAttribute("class", "gContactSync-Button toolbarbutton-1" + 
                          " chromeclass-toolbar-additional");
      button.setAttribute("id", "button-sync");
      button.setAttribute("label", StringBundle.getStr("syncButton"));
      button.setAttribute("oncommand", "Sync.begin();");
      button.setAttribute("tooltiptext", StringBundle.getStr("syncTooltip"));
      button.setAttribute("insertbefore", "new-separator");

      var deleteButton = document.getElementById(isSeamonkey ? "button-abdelete" : "button-delete");
      var writeButton  = document.getElementById("button-newmessage");
      var addedButton  = false;
      // first, try to insert it after the delete button
      if (deleteButton) {
        try {
          // insert the separator before the Delete button
          toolbar.insertBefore(separator, deleteButton);
          // insert the button before the separator
          toolbar.insertBefore(button, separator);
          //alert(button.style.)
          LOGGER.VERBOSE_LOG("Added the button before the delete button");
          addedButton = true;
          // insert the second separator before the button if necessary
          if (button.previousSibling && button.previousSibling.nodeName != "toolbarseparator") {
              toolbar.insertBefore(separator2, button);
              LOGGER.VERBOSE_LOG("Also added a separator before the button");
          }
        }
        catch (e) {
          LOGGER.LOG_WARNING("Couldn't setup the sync button before the delete button", e);
        }
      }
      // if that doesn't work, try after the write button
      if (writeButton && !addedButton) {
        try {
          // insert the separator before the Write button
          toolbar.insertBefore(separator, writeButton);
          // insert the button before the separator
          toolbar.insertBefore(button, separator);
          LOGGER.VERBOSE_LOG("Added the button before the compose button");
          LOGGER.VERBOSE_LOG("Added a separator after the button");
          addedButton = true;
          // insert the second separator before the button if necessary
          if (button.previousSibling && button.previousSibling.nodeName != "toolbarseparator") {
              toolbar.insertBefore(separator2, button);
              LOGGER.VERBOSE_LOG("Added a separator before the button");
          }
        }
        catch (e) {
          LOGGER.LOG_WARNING("Couldn't setup the sync button before the write button", e);
        }
      }
      // if all else fails try to append the button at the end of the toolbar
      if (!addedButton) {
        LOGGER.VERBOSE_LOG("Attempting to append the toolbar button");
        toolbar.appendChild(separator);
        toolbar.appendChild(button);
      }
      if (Preferences.mSyncPrefs.forceBtnImage.value) {
        LOGGER.VERBOSE_LOG("Forcing the listStyleImage for the button");
        document.getElementById("button-sync").style.listStyleImage =
          "url('chrome://gcontactsync/skin/abcard-large.png')";
      }
      LOGGER.VERBOSE_LOG("Finished adding button\n");
      return true;
    }
    catch(e) {
       LOGGER.LOG_WARNING("Couldn't setup the sync button", e);
    }
    return false;
  },
  /**
   * Overlay.checkAuthentication
   * Checks to see whether or not there is an authentication token in the login
   * manager.  If so, it begins a sync.  If not, it shows the login prompt.
   * @param firstLogin 
   */
  checkAuthentication: function Overlay_checkAuthentication() {
    if (gdata.isAuthValid()) {
      if (this.mUsername) {
        Preferences.getSyncPrefs();
        var name = Preferences.mSyncPrefs.addressBookName.value;
        var ab   = new GAddressBook(AbManager.getAbByName(name));
        ab.setUsername(this.mUsername);
        ab.setLastSyncDate(0);
        Sync.begin();
      }
      else
        Sync.schedule(Preferences.mSyncPrefs.initialDelay.value);  
      return;
    }
    this.setStatusBarText(StringBundle.getStr("notAuth"));
    this.promptLogin();
  },
  /**
   * Overlay.promptLogin
   * Prompts the user to enter his or her Google username and password and then
   * gets an authentication token to store and use.
   */
  promptLogin: function Overlay_promptLogin() {
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

    // This is a primitive way of validating an e-mail address, but Google takes
    // care of the rest.  It seems to allow getting an auth token w/ only the
    // username, but returns an error when trying to do anything w/ that token
    // so this makes sure it is a full e-mail address.
    if (username.value.indexOf("@") < 1) {
      alert(StringBundle.getStr("invalidEmail"));
      return this.promptLogin();
    }
    
    var body     = gdata.makeAuthBody(username.value, password.value);
    var httpReq  = new GHttpRequest("authenticate", null, null, body);
    // if it succeeds and Google returns the auth token, store it and then start
    // a new sync
    httpReq.mOnSuccess = ["Overlay.login('" + username.value +
                          "', httpReq.responseText.split(\"\\n\")[2]);"];
    // if it fails, alert the user and prompt them to try again
    httpReq.mOnError = ["alert(StringBundle.getStr('authErr'));",
                        "LOGGER.LOG_ERROR('Authentication Error - ' + " + 
                        "httpReq.status, httpReq.responseText);",
                        "Overlay.promptLogin();"];
    // if the user is offline, alert them and quit
    httpReq.mOnOffline = ["alert(StringBundle.getStr('offlineErr'));",
                          "LOGGER.LOG_ERROR(StringBundle.getStr('offlineErr'));"];
    httpReq.send();
    return true;
  },
  /**
   * Overlay.login
   * Stores the given auth token in the login manager and starts the setup
   * window that will begin the first synchronization when closed.
   * @param aAuthToken The authentication token to store.
   */
  login: function Overlay_login(aUsername, aAuthToken) {
    LoginManager.addAuthToken(aUsername, 'GoogleLogin ' + aAuthToken);
    this.setStatusBarText(StringBundle.getStr("initialSetup"));
    var setup = window.open("chrome://gcontactsync/content/FirstLogin.xul",
                            "SetupWindow",
                            "chrome,resizable=yes,scrollbars=no,status=no");
    this.mUsername = aUsername;
    // when the setup window loads, set its onunload property to begin a sync
    setup.onload = function onloadListener() {
      setup.onunload = function onunloadListener() {
        Overlay.checkAuthentication();
      };
    };
  },
  /**
   * Overlay.setStatusBarText
   * Sets the text of the status bar to the given value.
   * @param aText  The text to put on the status bar.
   */
  setStatusBarText: function Overlay_setStatusBarText(aText) {
    document.getElementById("statusText2").label = aText;
  },
  /**
   * Overlay.getStatusBarText
   * Gets the text of the status bar.
   * @return The text of the status bar
   */
  getStatusBarText: function Overlay_getStatusBarText(aText) {
    return document.getElementById("statusText2").label;
  },
  /**
   * Overlay.writeTimeToStatusBar
   * Writes the current time to the status bar along with the sync finished
   * string.
   * When the status text is clicked the log file is opened.
   */
  writeTimeToStatusBar: function Overlay_writeTimeToStatusBar() {
    var hours   = new String(new Date().getHours());
    hours       = hours.length == 0 ? "00" + hours : hours;
    hours       = hours.length == 1 ?  "0" + hours : hours;
    var minutes = new String(new Date().getMinutes());
    minutes     = minutes.length == 1 ? "0" + minutes : minutes;
    var seconds = new String(new Date().getSeconds());
    seconds     = seconds.length == 1 ? "0" + seconds : seconds;
    var text    = StringBundle.getStr("syncFinishedString");
    this.setStatusBarText(text + " " + hours + ":" + minutes + ":" + seconds);
  },
  /**
   * Overlay.showLog
   * Opens the "view source" window with the log file.
   */
  showLog: function Overlay_showLog() {
    try {
      var windowFeatures = "chrome=yes,resizable=yes,height=480,width=600";
      window.open("view-source:file://" + FileIO.mLogFile.path,
                  "Log",
                  windowFeatures);
    }
    catch(e) {
      LOGGER.LOG_WARNING("Unable to open the log", e);
    }
  },
  // NOTE - this function can break search and more if not overridden properly
  mySetAbView: function Overlay_mySetAbView(aURI, aSearchView, aSortCol, aSortDir) {
    // call the original
    originalSetAbView(aURI, aSearchView, aSortCol, aSortDir);
    // TODO fix this
    /*
    var children =  gAbResultsTree.getElementsByAttribute("ondraggesture", "nsDragAndDrop.startDrag(event, abResultsPaneObserver);");
    var treeChildren = children[0];
    var str = "";
    for (var i = 0; i < children[0].children.length; i++) {
      str += children[0].children[i] + "\n";
    }
    alert(str + "\n" + children[0].children);
    */
    /*for (var i in gAbResultsTree.children[0])
      str += i + "\n";
    str += "1:\n";
    for (var i in gAbResultsTree.children[1])
      str += i + "\n";
    alert(str);*/
    // now find and hide any dummy e-mail addresses
  },
  /**
   * Overlay.myDisplayCardViewPane
   * Updates the Card View pane boxes and headers for whether or not they should
   * be visible based on additional attributes added by gContactSync.
   * Links the third and fourth e-mail address as well as the "other" address.
   * Should be set to override the DisplayCardViewPane function in
   * abCardViewOverlay.js.  Requires that the original function should be set as
   * the originalDisplayCardViewPane variable.
   * @param aCard The card being viewed.
   */
  myDisplayCardViewPane: function Overlay_myDisplayCardViewPane(aCard) {
    originalDisplayCardViewPane(aCard); // call the original first
    if (aCard.isMailList) {
      // collapse all the attributes added
      Overlay.hideNodes(ContactConverter.getExtraSyncAttributes());
      try {
        // then collapse the e-mail boxes
        cvData.cvThirdEmailBox.collapsed = true;
        cvData.cvFourthEmailBox.collapsed = true;
      } catch(e) {}
      return; // and quit, nothing was added for mail lists
    }
    try {
      Overlay.showNodes(ContactConverter.getExtraSyncAttributes());
      var primaryEmail = AbManager.getCardValue(aCard, dummyEmailName);
      // if the primary e-mail address is the dummy address, hide it
      if (isDummyEmail(primaryEmail)) {
        // TODO recalculate if the contact info box must be collapsed too
        switch (dummyEmailName) {
          case "PrimaryEmail" :
            cvData.cvEmail1Box.collapsed = true;
            break;
          case "SecondEmail" :
            cvData.cvEmail2Box.collapsed = true;
            break;
          default:
            alert("Error - invalid dummy email name");
        }
      }
      cvData.cvThirdEmailBox.collapsed = false;
      cvData.cvFourthEmailBox.collapsed = false;
      // Contact section (ThirdEmail, FourthEmail, TalkScreenName, MSNScreenName,
      // JabberScreenName, YahooScreenName, ICQScreenName)
      var visible     = !cvData.cvbContact.getAttribute("collapsed");
      var thirdEmail  = AbManager.getCardValue(aCard, "ThirdEmail");
      var fourthEmail = AbManager.getCardValue(aCard, "FourthEmail");
      visible = HandleLink(cvData.cvThirdEmail, StringBundle.getStr("ThirdEmail"),
                           thirdEmail, cvData.cvThirdEmailBox, "mailto:" +
                           thirdEmail) || visible;
      visible = HandleLink(cvData.cvFourthEmail, StringBundle.getStr("FourthEmail"),
                           fourthEmail, cvData.cvFourthEmailBox, "mailto:" +
                           fourthEmail) || visible;
    
      visible = Overlay.getVisible(aCard, ["TalkScreenName", "JabberScreenName",
                                           "YahooScreenName", "MSNScreenName",
                                           "ICQScreenName"], visible, true);
      cvSetVisible(cvData.cvhContact, visible);
      cvSetVisible(cvData.cvbContact, visible);
      // Other section (relations)
      var visible = !cvData.cvhOther.getAttribute("collapsed");
      // Relation fields
      visible = Overlay.getVisible(aCard, ["Relation0", "Relation1", "Relation2",
                                           "Relation3"], visible, true);
      cvSetVisible(cvData.cvhOther, visible);
      cvSetVisible(cvData.cvbOther, visible);
      // Phone section (add OtherNumber and HomeFaxNumber)
      // first, add the existing nodes to cvData under a name that actually
      // matches the attribute
      cvData.cvWorkPhone = cvData.cvPhWork;
      cvData.cvHomePhone = cvData.cvPhHome;
      cvData.cvFaxNumber = cvData.cvPhFax;
      cvData.cvCellularNumber = cvData.cvPhCellular;
      cvData.cvPagerNumber = cvData.cvPhPager;
      // then set the value and labels for the new and old phone nodes
      var visible = !cvData.cvhPhone.getAttribute("collapsed");
      visible = Overlay.getVisible(aCard, ["WorkPhone", "HomePhone", "FaxNumber",
                                           "CellularNumber", "PagerNumber",
                                           "OtherNumber", "HomeFaxNumber"],
                                   visible, true);
      cvSetVisible(cvData.cvhPhone, visible);
      cvSetVisible(cvData.cvbPhone, visible);
    } catch(e) { 
        alert("Error while modifying view pane: " + e);
        LOGGER.LOG_WARNING("Error while modifying the view pane.", e);
    }
  },
  /**
   * Overlay.hideNodes
   * Hides all of the nodes based on the array.  The node must be a propery of
   * cvData with the same name as the element in aArray prefixed with a 'cv'.
   * For example, to hide cvData.cvHomeAddress the element would be
   * 'HomeAddress'.
   * @param aArray An array of names as described above.
   */
  hideNodes: function Overlay_hideNodes(aArray) {
    for (var i = 0, length = aArray.length; i < length; i++) {
      if (aArray[i].indexOf("Type") != -1)
        continue;
      try {
        cvSetVisible(cvData["cv" + aArray[i]], false);
      }
      catch (e) {
        LOGGER.LOG_WARNING("Error while hiding node '" + aArray[i] + "'", e);
      }
    }
  },
  /**
   * Overlay.showNodes
   * Shows all of the nodes based on the array.  The node must be a propery of
   * cvData with the same name as the element in aArray prefixed with a 'cv'.
   * For example, to show cvData.cvHomeAddress the element would be
   * 'HomeAddress'.
   * @param aArray An array of names as described above.
   */
  showNodes: function Overlay_showNodes(aArray) {
    for (var i = 0, length = aArray.length; i < length; i++) {
      if (aArray[i].indexOf("Type") != -1)
        continue;
      try {
        cvSetVisible(cvData["cv" + aArray[i]], true);
      }
      catch (e) {
        LOGGER.LOG_WARNING("Error while showing node '" + aArray[i] + "'", e);
      }
    }
  },
  /**
   * A helper method for myDisplayCardViewPane that iterates through an array of
   * attributes and returns true if at least one of them is present in the given
   * card.
   * @param aCard         The card whose attributes are checked.
   * @param aArray        The array of attributes to check the for in the card.
   * @param aVisible      Optional. True if the element was previously visible.
   * @param aUseTypeLabel Optional.  True if the labels should be determined by
   *                      the type of the attribute instead of the attribute's
   *                      name.
   * @return True if at least one attribute in aArray is present in aCard.
   */
  getVisible: function Overlay_getVisible(aCard, aArray, aVisible, aUseTypeLabel) {
    var visible = aVisible;
    // return true if the card has the current attribute
    for (var i = 0; i < aArray.length; i++) {
      var attr = aArray[i];
      var value = AbManager.getCardValue(aCard, attr);
      // get the name of the string to find in the bundle
      var label = aUseTypeLabel ? AbManager.getCardValue(aCard, attr + "Type")
                                : attr;
      // get the actual string
      // if the label is null (ie aUseTypeLabel was true, but there wasn't a type)
      // then use the attribute's string as a default value
      var str = label && label != "" ? StringBundle.getStr(label)
                                     : StringBundle.getStr(attr);
      var prefix = this.links[label];
      // Make this a link if there is a prefix (aim:goim?...), the pref is set,
      // and there is a box for this data
      if (prefix && Preferences.mSyncPrefs.enableImUrls.value && cvData["cv" + attr + "Box"]) {
        var suffix = this.links[label + "S"] ? this.links[label + "S"] : "";
        visible    = HandleLink(cvData["cv" + attr], str, value,
                                cvData["cv" + attr + "Box"], prefix +
                                value + suffix) || visible;
      }
      else
        visible = cvSetNodeWithLabel(cvData["cv" + attr], str, value) || visible;
    }
    return visible;
  },
  /**
   * Overlay.myOnLoadCardView
   * Sets up a few nodes and labels in addition to what the OnLoadCardView
   * function does in abCardViewOverlay.js.  Should be run when the Overlay is
   * loaded.
   */
  myOnLoadCardView: function Overlay_myOnLoadCardView() {
    if (!originalOnLoadCardView){
      return;
    }
    originalOnLoadCardView();

    // add the <description> elements
    var vbox = document.getElementById("cvbContact");
    // setup the third and fourth e-mail addresses
    var xhmtl = "http://www.w3.org/1999/xhtml";
    cvData.cvThirdEmailBox = Overlay.makeDescElement("ThirdEmailBox", "CardViewLink");
    cvData.cvThirdEmail = document.createElementNS(xhmtl, "html:a");
    cvData.cvThirdEmail.setAttribute("id", "ThirdEmail");
    cvData.cvThirdEmailBox.appendChild(cvData.cvThirdEmail);
    cvData.cvFourthEmailBox = Overlay.makeDescElement("FourthEmailBox", "CardViewLink");
    cvData.cvFourthEmail = document.createElementNS(xhmtl, "html:a");
    cvData.cvFourthEmail.setAttribute("id", "FourthEmail");
    cvData.cvFourthEmailBox.appendChild(cvData.cvFourthEmail);
    vbox.insertBefore(cvData.cvFourthEmailBox, document.getElementById("cvScreennameBox"));
    vbox.insertBefore(cvData.cvThirdEmailBox, cvData.cvFourthEmailBox);
    
    // the screennames
    if (Preferences.mSyncPrefs.enableImUrls.value) {
      cvData.cvTalkScreenNameBox  = Overlay.makeDescElement("TalkScreenNameBox", "CardViewLink");
      cvData.cvTalkScreenName     = document.createElementNS(xhmtl, "html:a");
      cvData.cvTalkScreenName.setAttribute("id", "TalkScreenName");
      cvData.cvTalkScreenNameBox.appendChild(cvData.cvTalkScreenName);
      cvData.cvICQScreenNameBox   = Overlay.makeDescElement("ICQScreenNameBox", "CardViewLink");
      cvData.cvICQScreenName      = document.createElementNS(xhmtl, "html:a");
      cvData.cvICQScreenName.setAttribute("id", "ICQScreenName");    
      cvData.cvICQScreenNameBox.appendChild(cvData.cvICQScreenName);
      cvData.cvYahooScreenNameBox  = Overlay.makeDescElement("YahooScreenNameBox", "CardViewLink");
      cvData.cvYahooScreenName     = document.createElementNS(xhmtl, "html:a");
      cvData.cvYahooScreenName.setAttribute("id", "YahooScreenName");    
      cvData.cvYahooScreenNameBox.appendChild(cvData.cvYahooScreenName);
      cvData.cvMSNScreenNameBox    = Overlay.makeDescElement("MSNScreenNameBox", "CardViewLink");
      cvData.cvMSNScreenName       = document.createElementNS(xhmtl, "html:a");
      cvData.cvMSNScreenName.setAttribute("id", "MSNScreenName");    
      cvData.cvMSNScreenNameBox.appendChild(cvData.cvMSNScreenName);
      cvData.cvJabberScreenNameBox = Overlay.makeDescElement("JabberScreenNameBox", "CardViewLink");
      cvData.cvJabberScreenName    = document.createElementNS(xhmtl, "html:a");
      cvData.cvJabberScreenName.setAttribute("id", "JabberScreenName");
      cvData.cvJabberScreenNameBox.appendChild(cvData.cvJabberScreenName);
      
      vbox.appendChild(cvData.cvTalkScreenNameBox);
      vbox.appendChild(cvData.cvICQScreenNameBox);
      vbox.appendChild(cvData.cvMSNScreenNameBox);
      vbox.appendChild(cvData.cvYahooScreenNameBox);
      vbox.appendChild(cvData.cvJabberScreenNameBox);
    }
    else {
      cvData.cvTalkScreenName   = Overlay.makeDescElement("TalkScreenName",   "CardViewText");
      cvData.cvICQScreenName    = Overlay.makeDescElement("ICQScreenName",    "CardViewText");
      cvData.cvYahooScreenName  = Overlay.makeDescElement("YahooScreenName",  "CardViewText");
      cvData.cvMSNScreenName    = Overlay.makeDescElement("MSNScreenName",    "CardViewText");
      cvData.cvJabberScreenName = Overlay.makeDescElement("JabberScreenName", "CardViewText");
      vbox.appendChild(cvData.cvTalkScreenName);
      vbox.appendChild(cvData.cvICQScreenName);
      vbox.appendChild(cvData.cvMSNScreenName);
      vbox.appendChild(cvData.cvYahooScreenName);
      vbox.appendChild(cvData.cvJabberScreenName);
    }

    // Work section
    cvData.cvJobDescription = Overlay.makeDescElement("JobDescription", "CardViewText");
    cvData.cvCompanySymbol  = Overlay.makeDescElement("CompanySymbol",  "CardViewText");
    vbox = document.getElementById("cvbWork");
    // Add the job description after the job title
    vbox.insertBefore(cvData.cvJobDescription, cvData.cvJobTitle.nextSibling);
    // Add the company symbol after the company name
    vbox.insertBefore(cvData.cvCompanySymbol, cvData.cvCompany.nextSibling);

    // Other section    
    vbox = document.getElementById("cvbOther");
    var otherHbox = document.createElement("hbox");
    var otherVbox = document.createElement("vbox");
    otherVbox.setAttribute("flex", "1");
    // Relation fields)
    for (var i = 0; i < 4; i++) {
      cvData["cvRelation" + i] = Overlay.makeDescElement("Relation" + i, "CardViewText");
      otherVbox.appendChild(cvData["cvRelation" + i]);
    }

    // Other Number and HomeFaxNumber
    cvData.cvOtherNumber = Overlay.makeDescElement("OtherNumber", "CardViewText");
    cvData.cvHomeFaxNumber = Overlay.makeDescElement("HomeFaxNumber", "CardViewText");
    vbox = document.getElementById("cvbPhone");
    vbox.appendChild(cvData.cvHomeFaxNumber);
    vbox.appendChild(cvData.cvOtherNumber);
  },
  /**
   * Overlay.makeDescElement
   * Makes and returns a <description> element of the given class and with an ID
   * of aName with a prefix of "cv"
   * @param aName  The ID of the element that will be prefixed with a "cv"
   * @param aClass The class of the element.
   * @return A new <description> element.
   */
  makeDescElement: function Overlay_makeDescElement(aName, aClass) {
    var elem = document.createElement("description");
    elem.setAttribute("class", aClass);
    elem.setAttribute("id", "cv" + aName);
    return elem;
  },
  /**
   * Overlay.openPreferences
   * Opens the Preferences dialog for gContactSync
   */
  openPreferences: function Overlay_openPreferences() {
    var win = window.open("chrome://gcontactsync/content/options.xul", "prefs",
                          "chrome=yes,resizable=yes,toolbar=yes,centerscreen=yes");
    // when the pref window loads, set its onunload property to get the prefs again
   win.onload = function onloadListener() {
      win.onunload = function onunloadListener() {
        try { Preferences.getSyncPrefs(); } catch (e) {}
      };
    };
  },
  /**
   * Overlay.openAccounts
   * Opens the Accounts dialog for gContactSync
   */
  openAccounts: function Overlay_openAccounts() {
    window.open("chrome://gcontactsync/content/Accounts.xul", "accts",
                "chrome=yes,resizable=yes,toolbar=yes,centerscreen=yes");
  },
  /**
   * openURL
   * Opens the given URL using the openFormattedURL and
   * openFormattedRegionURL functions.
   *
   * @param aURL {string} THe URL to open.
   */
  openURL: function Overlay_openURL(aURL) {
    LOGGER.VERBOSE_LOG("Opening the following URL: " + aURL);
    if (!aURL) {
      LOGGER.LOG_WARNING("Caught an attempt to load a blank URL");
      return;
    }
    try {
      if (openFormattedURL) {
        openFormattedURL(aURL);
        return;
      }
    }
    catch (e) {}
    try {
      if (openFormattedRegionURL) {
        openFormattedRegionURL(aURL);
        return;
      }
    }
    catch (e) {}
    LOGGER.LOG_WARNING("Could not open the URL: " + aURL);
    return;
  },
  /**
   * Overlay.addResetContext
   * Adds a 'Reset' menuitem to the Address Book contaxt menu for the list on
   * the left side of the Address Book window.
   */
  addResetContext: function Overlay_addResetContext() {
    var item = document.createElement("menuitem");
    item.id  = "dirTreeContext-reset";
    item.setAttribute("label",     StringBundle.getStr("reset"));
    item.setAttribute("accesskey", StringBundle.getStr("resetKey"));
    item.setAttribute("oncommand", "Overlay.resetSelectedAB()");
    document.getElementById("dirTreeContext").appendChild(item);
  },
  /**
   * Overlay.resetSelectedAB
   * Resets the currently selected address book after showing a confirmation
   * dialog.
   */
  resetSelectedAB: function Overlay_resetSelectedAB() {
    var dirTree  = document.getElementById("dirTree");
    var selected = dirTree.builderView.getResourceAtIndex(dirTree.currentIndex);
    var ab = new GAddressBook(AbManager.getAbByURI(selected.Value), true);
    var restartStr = StringBundle.getStr("pleaseRestart");
    if (confirm(StringBundle.getStr("resetConfirm2"))) {
      ab.reset();
      this.setStatusBarText(restartStr);
      alert(restartStr);
    }
  }
};