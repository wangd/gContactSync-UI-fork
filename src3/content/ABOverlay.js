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
 * Portions created by the Initial Developer are Copyright (C) 2008-2010
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
  /** Initializes the ABOverlay class when the window has finished loading */
  function gCS_abOverlayLoadListener(e) {
    com.gContactSync.ABOverlay.initialize();
  },
false);

com.gContactSync.ABOverlay = {
  /**
   * Special links for various IM protocols
   * Format: Type (from Google): protocol
   */
  links: {
    /** AOL Instant Messenger link */
    AIM:         "aim:goim?screenname=",
    /** MSN Messenger link */
    MSN:         "msnim:chat?contact=",
    /** Yahoo Me3ssenger link */
    YAHOO:       "ymsgr:sendim?",
    /** Skype link */
    SKYPE:       "skype:",
    /** Skype chat link */
    SKYPES:      "?chat",
    /** Jabber link */
    JABBER:      "xmpp:",
    /** XMPP link */
    XMPP:        "xmpp:",
    /** Google Talk link */
    GOOGLE_TALK: "gtalk:chat?jid="
  },
  initialize: function ABOverlay_initialize() {
    // determine if this is before or after Bug 413260 landed
    var card = Components.classes["@mozilla.org/addressbook/cardproperty;1"]
                         .createInstance(Components.interfaces.nsIAbCard);
    this.mBug413260 = card.getProperty ? true : false;

    com.gContactSync.originalOnLoadCardView = OnLoadCardView;
    OnLoadCardView = this.myOnLoadCardView;
    if (com.gContactSync.Preferences.mSyncPrefs.enableSyncBtn.value)
      this.setupButton();    // insert the Sync button
    if (!com.gContactSync.Preferences.mSyncPrefs.enableMenu.value)
      document.getElementById("gContactSyncMenu").collapsed = true;
    // add the extra attributes as tree columns to show and
    this.addTreeCols(); // sort by in the results pane if this is after 413260 
    // override the onDrop method of abDirTreeObserver
    // so when a card is copied the extra attributes are copied with it
    if (com.gContactSync.Preferences.mSyncPrefs.overrideCopy.value)
      abDirTreeObserver.onDrop = com.gContactSync.myOnDrop;
    // override the display card view pane
    com.gContactSync.originalDisplayCardViewPane = DisplayCardViewPane;
    DisplayCardViewPane = this.myDisplayCardViewPane;
    // Add a reset menuitem to the directory tree context menu
    if (com.gContactSync.Preferences.mSyncPrefs.addReset.value)
      this.addResetContext();
    // override the ab results tree function
    //com.gContactSync.originalSetAbView = SetAbView;
    //SetAbView = com.gContactSync.SetAbView;
    // call the unload function when the address book window is shut
    window.addEventListener("unload", function unloadListener(e) {
          com.gContactSync.Overlay.unload();
        }, false);
    // Fix the style for description elements accidentally set in the
    // Duplicate Contacts Manager extension
    // https://www.mozdev.org/bugs/show_bug.cgi?id=21883
    if (com.gContactSync.Preferences.mSyncPrefs.fixDupContactManagerCSS.value)
      this.fixDescriptionStyle();
    // load the card view (required by seamonkey)
    if (document.getElementById("ab-menubar"))
      this.myOnLoadCardView();
    this.checkAuthentication(); // check if the Auth token is valid
  },
  /**
   * Checks to see whether or not there is an authentication token in the login
   * manager.  If so, it begins a sync.  If not, it shows the login prompt.
   */
  checkAuthentication: function Overlay_checkAuthentication() {
    if (com.gContactSync.gdata.isAuthValid()) {
      if (this.mUsername) {
        var name = com.gContactSync.Preferences.mSyncPrefs.addressBookName.value;
        var ab   = com.gContactSync.GAbManager.getGAb(com.gContactSync.GAbManager.getAbByName(name));
        ab.savePref("Username", this.mUsername);
        ab.setLastSyncDate(0);
        com.gContactSync.Sync.begin();
      }
      else {
        com.gContactSync.Sync.schedule(com.gContactSync.Preferences.mSyncPrefs.initialDelay.value);  
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
  promptLogin: function Overlay_promptLogin() {
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
      com.gContactSync.Overlay.login(username.value,
                                     httpReq.responseText.split("\n")[2]);
    };
    // if it fails, alert the user and prompt them to try again
    httpReq.mOnError = function authError(httpReq) {
      com.gContactSync.alertError(com.gContactSync.StringBundle.getStr('authErr'));
      com.gContactSync.LOGGER.LOG_ERROR('Authentication Error - ' +
                                        httpReq.status,
                                        httpReq.responseText);
      com.gContactSync.Overlay.promptLogin();
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
  login: function Overlay_login(aUsername, aAuthToken) {
    com.gContactSync.LoginManager.addAuthToken(aUsername, 'GoogleLogin ' + aAuthToken);
    this.setStatusBarText(com.gContactSync.StringBundle.getStr("initialSetup"));
    var setup = window.open("chrome://gcontactsync/content/FirstLogin.xul",
                            "SetupWindow",
                            "chrome,resizable=yes,scrollbars=no,status=no");
    this.mUsername = aUsername;
    // when the setup window loads, set its onunload property to begin a sync
    setup.onload = function onloadListener() {
      setup.onunload = function onunloadListener() {
        com.gContactSync.Overlay.checkAuthentication();
      };
    };
  },
  /**
   * Adds treecol elements to the address book results tree that shows cards in
   * the currently selected directory.  These treecols allow the user to show
   * and sort by extra attributes that are added by this extension.  This will
   * only work after Bug 413260 landed, so in Thunderbird 3.0b1pre and after.
   */
  addTreeCols: function ABOverlay_addTreeCols() {
    // get the treecols XUL element
    var treeCols = document.getElementById("abResultsTreeCols");
    if (!treeCols || !treeCols.appendChild)
      return;
    if (com.gContactSync.Preferences.mSyncPrefs.phoneColLabels.value) {
      // fix the existing phone numbers
      var arr = ["WorkPhone", "HomePhone", "FaxNumber"," CellularNumber",
                 "PagerNumber"
                ];
      // the strings from the string bundle
      //var arr2 = ["first", "second", "third", "fourth", "fifth"];
      var elem;
      for (var i = 0; i < arr.length; i++) {
        elem = document.getElementById(arr[i]);
        if (!elem) {
          continue;
        }
        // remove it
        treeCols.removeChild(elem);
        elem.setAttribute("label", com.gContactSync.StringBundle.getStr(arr[i]));
        // and then add it to the end of the treecols element
        treeCols.appendChild(elem);
      }
    }
    // if Bug 413260 isn't applied in this version of TB, or if the pref was
    // changed to false, then stop here
    if (!this.mBug413260 || !com.gContactSync.Preferences.mSyncPrefs.newColLabels.value)
      return;
    // get the added attributes
    var ids = com.gContactSync.ContactConverter.getExtraSyncAttributes(false),
        id, splitter, treeCol;
    // iterate through every added attribute and add a treecol for it unless
    // it is a postal address
    for (i = 0, length = ids.length; i < length; i++) {
      id = ids[i];
      if (id.indexOf("Type") !== -1)
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
      treeCol.setAttribute("label", com.gContactSync.StringBundle.getStr(id));
      // append it to the treecols element
      treeCols.appendChild(treeCol);
    }
  },
  /**
   * Sets up the Sync button to go between the Write and Delete buttons and adds
   * a separator between Sync and Delete.
   * @returns {boolean} True if the button was added manually.
   */
  setupButton: function ABOverlay_setupButton() {
    try {
      com.gContactSync.LOGGER.VERBOSE_LOG("Trying to add button");
      // get the toolbar with the buttons
      var toolbar     = document.getElementById("abToolbar"); // seamonkey
      if (!toolbar) {
        com.gContactSync.LOGGER.VERBOSE_LOG("Didn't find the toolbar");
        return false;
      }
      // setup the separators
      var separator   = document.createElement("toolbarseparator");
      var separator2  = document.createElement("toolbarseparator");
      // setup the button
      var button      = document.createElement("toolbarbutton");
      button.setAttribute("class", "gContactSync-Button toolbarbutton-1" + 
                          " chromeclass-toolbar-additional");
      button.setAttribute("id", "button-sync");
      button.setAttribute("label", com.gContactSync.StringBundle.getStr("syncButton"));
      button.setAttribute("oncommand", "com.gContactSync.Sync.begin();");
      button.setAttribute("tooltiptext", com.gContactSync.StringBundle.getStr("syncTooltip"));
      button.setAttribute("insertbefore", "new-separator");

      var deleteButton = document.getElementById("button-delete");
      var writeButton  = document.getElementById("button-newmessage");
      var addedButton  = false;
      // first, try to insert it after the delete button
      if (deleteButton) {
        try {
          // insert the separator before the Delete button
          toolbar.insertBefore(separator, deleteButton);
          // insert the button before the separator
          toolbar.insertBefore(button, separator);
          com.gContactSync.LOGGER.VERBOSE_LOG("Added the button before the delete button");
          addedButton = true;
          // insert the second separator before the button if necessary
          if (button.previousSibling && button.previousSibling.nodeName != "toolbarseparator") {
              toolbar.insertBefore(separator2, button);
              com.gContactSync.LOGGER.VERBOSE_LOG("Also added a separator before the button");
          }
        }
        catch (e) {
          com.gContactSync.LOGGER.LOG_WARNING("Couldn't setup the sync button before the delete button", e);
        }
      }
      // if that doesn't work, try after the write button
      if (writeButton && !addedButton) {
        try {
          // insert the separator before the Write button
          toolbar.insertBefore(separator, writeButton);
          // insert the button before the separator
          toolbar.insertBefore(button, separator);
          com.gContactSync.LOGGER.VERBOSE_LOG("Added the button before the compose button");
          com.gContactSync.LOGGER.VERBOSE_LOG("Added a separator after the button");
          addedButton = true;
          // insert the second separator before the button if necessary
          if (button.previousSibling && button.previousSibling.nodeName != "toolbarseparator") {
              toolbar.insertBefore(separator2, button);
              com.gContactSync.LOGGER.VERBOSE_LOG("Added a separator before the button");
          }
        }
        catch (e) {
          com.gContactSync.LOGGER.LOG_WARNING("Couldn't setup the sync button before the write button", e);
        }
      }
      // if all else fails try to append the button at the end of the toolbar
      if (!addedButton) {
        com.gContactSync.LOGGER.VERBOSE_LOG("Attempting to append the toolbar button");
        toolbar.appendChild(separator);
        toolbar.appendChild(button);
      }
      if (com.gContactSync.Preferences.mSyncPrefs.forceBtnImage.value) {
        com.gContactSync.LOGGER.VERBOSE_LOG("Forcing the listStyleImage for the button");
        document.getElementById("button-sync").style.listStyleImage =
          "url('chrome://gcontactsync/skin/logo_main_24.png')";
      }
      com.gContactSync.LOGGER.VERBOSE_LOG("Finished adding button\n");
      return true;
    }
    catch(e) {
       com.gContactSync.LOGGER.LOG_WARNING("Couldn't setup the sync button", e);
    }
    return false;
  },
  /**
   * Modifies the SetAbView function.  Unused
   */
  // NOTE - this function can break search and more if not overridden properly
  mySetAbView: function ABOverlay_mySetAbView(aURI, aSearchView, aSortCol, aSortDir) {
    // call the original
    com.gContactSync.originalSetAbView.apply(this, arguments);
    // TODO fix this
    /*
    var children =  gAbResultsTree.getElementsByAttribute("ondraggesture", "nsDragAndDrop.startDrag(event, abResultsPaneObserver);");
    var treeChildren = children[0];
    var str = "";
    for (var i = 0; i < children[0].children.length; i++) {
      str += children[0].children[i] + "\n";
    }
    com.gContactSync.alert(str + "\n" + children[0].children);
    */
    /*for (var i in gAbResultsTree.children[0])
      str += i + "\n";
    str += "1:\n";
    for (var i in gAbResultsTree.children[1])
      str += i + "\n";
    com.gContactSync.alert(str);*/
    // now find and hide any dummy e-mail addresses
  },
  /**
   * Updates the Card View pane boxes and headers for whether or not they should
   * be visible based on additional attributes added by gContactSync.
   * Links the third and fourth e-mail address as well as the "other" address.
   * Should be set to override the DisplayCardViewPane function in
   * abCardViewOverlay.js.  Requires that the original function should be set as
   * the com.gContactSync.originalDisplayCardViewPane variable.
   * @param aCard {nsIAbCard} The card being viewed.
   */
  myDisplayCardViewPane: function ABOverlay_myDisplayCardViewPane(aCard) {
    // call the original first
    com.gContactSync.originalDisplayCardViewPane.apply(this, arguments);
    if (aCard.isMailList) {
      // collapse all the attributes added
      com.gContactSync.ABOverlay.hideNodes(com.gContactSync.ContactConverter.getExtraSyncAttributes());
      try {
        // then collapse the e-mail boxes
        cvData.cvThirdEmailBox.collapsed = true;
        cvData.cvFourthEmailBox.collapsed = true;
      } catch(e) {}
      return; // and quit, nothing was added for mail lists
    }
    try {
      var contact = new com.gContactSync.TBContact(aCard, null);
      com.gContactSync.ABOverlay.showNodes(com.gContactSync.ContactConverter.getExtraSyncAttributes());
      var primaryEmail = com.gContactSync.GAbManager.getCardValue(aCard,
                                                 com.gContactSync.dummyEmailName);
      // if the primary e-mail address is the dummy address, hide it
      if (com.gContactSync.isDummyEmail(primaryEmail)) {
        // TODO recalculate if the contact info box must be collapsed too
        switch (com.gContactSync.dummyEmailName) {
          case "PrimaryEmail" :
            cvData.cvEmail1Box.collapsed = true;
            break;
          case "SecondEmail" :
            cvData.cvEmail2Box.collapsed = true;
            break;
          default:
            com.gContactSync.alertError("Error - invalid dummy email name");
        }
      }
      cvData.cvThirdEmailBox.collapsed = false;
      cvData.cvFourthEmailBox.collapsed = false;
      // Contact section (ThirdEmail, FourthEmail, TalkScreenName, MSNScreenName,
      // JabberScreenName, YahooScreenName, ICQScreenName)
      var visible     = !cvData.cvbContact.getAttribute("collapsed");
      // don't show the Third and Fourth e-mail addresses in Postbox
      if (!contact.mPostbox) {
        var thirdEmail  = contact.getValue("ThirdEmail");
        var fourthEmail = contact.getValue("FourthEmail");
        visible = HandleLink(cvData.cvThirdEmail, com.gContactSync.StringBundle.getStr("ThirdEmail"),
                             thirdEmail, cvData.cvThirdEmailBox, "mailto:" +
                             thirdEmail) || visible;
        // Workaround for a bug where the collapsed attributes set here don't
        // seem to get applied
        document.getElementById(cvData.cvThirdEmailBox.id).collapsed = cvData.cvThirdEmailBox.collapsed;
        visible = HandleLink(cvData.cvFourthEmail, com.gContactSync.StringBundle.getStr("FourthEmail"),
                             fourthEmail, cvData.cvFourthEmailBox, "mailto:" +
                             fourthEmail) || visible;
      }
    
      visible = com.gContactSync.ABOverlay.getVisible(aCard, ["TalkScreenName",
                                                              "JabberScreenName",
                                                              "YahooScreenName",
                                                              "MSNScreenName",
                                                              "ICQScreenName"],
                                                      visible, true);
      cvSetVisible(cvData.cvhContact, visible);
      cvSetVisible(cvData.cvbContact, visible);
      // Other section (relations)
      var visible = !cvData.cvhOther.getAttribute("collapsed");
      // Relation fields
      visible = com.gContactSync.ABOverlay.getVisible(aCard, ["Relation0",
                                                              "Relation1",
                                                              "Relation2",
                                                              "Relation3"],
                                                      visible, true);
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
      visible = com.gContactSync.ABOverlay.getVisible(aCard, ["WorkPhone", "HomePhone", "FaxNumber",
                                           "CellularNumber", "PagerNumber",
                                           "OtherNumber", "HomeFaxNumber"],
                                   visible, true);
      cvSetVisible(cvData.cvhPhone, visible);
      cvSetVisible(cvData.cvbPhone, visible);
    } catch(e) { 
        com.gContactSync.alertError("Error while modifying view pane: " + e);
        com.gContactSync.LOGGER.LOG_WARNING("Error while modifying the view pane.", e);
    }
  },
  /**
   * Hides all of the nodes based on the array.  The node must be a propery of
   * cvData with the same name as the element in aArray prefixed with a 'cv'.
   * For example, to hide cvData.cvHomeAddress the element would be
   * 'HomeAddress'.
   * @param {array} aArray An array of names as described above.
   */
  hideNodes: function ABOverlay_hideNodes(aArray) {
    for (var i = 0, length = aArray.length; i < length; i++) {
      if (aArray[i].indexOf("Type") != -1)
        continue;
      try {
        cvSetVisible(cvData["cv" + aArray[i]], false);
      }
      catch (e) {
        com.gContactSync.LOGGER.LOG_WARNING("Error while hiding node '" + aArray[i] + "'", e);
      }
    }
  },
  /**
   * Shows all of the nodes based on the array.  The node must be a propery of
   * cvData with the same name as the element in aArray prefixed with a 'cv'.
   * For example, to show cvData.cvHomeAddress the element would be
   * 'HomeAddress'.
   * @param aArray {array} An array of names as described above.
   */
  showNodes: function ABOverlay_showNodes(aArray) {
    for (var i = 0, length = aArray.length; i < length; i++) {
      if (aArray[i].indexOf("Type") != -1)
        continue;
      try {
        cvSetVisible(cvData["cv" + aArray[i]], true);
      }
      catch (e) {
        com.gContactSync.LOGGER.LOG_WARNING("Error while showing node '" + aArray[i] + "'", e);
      }
    }
  },
  /**
   * A helper method for myDisplayCardViewPane that iterates through an array of
   * attributes and returns true if at least one of them is present in the given
   * card.
   * @param aCard         {nsIAbCard} The card whose attributes are checked.
   * @param aArray        {array}     The array of attributes to check for in
   *                                  the card.
   * @param aVisible      {boolean}   Optional. True if the element was
   *                                  previously visible.
   * @param aUseTypeLabel {boolean}   Optional.  True if the labels should be
   *                                  the type of the attribute instead of the
   *                                  attribute's name.
   * @returns {boolean} True if at least one attribute in aArray is present in aCard.
   */
  getVisible: function ABOverlay_getVisible(aCard, aArray, aVisible, aUseTypeLabel) {
    var visible = aVisible;
    // return true if the card has the current attribute
    for (var i = 0; i < aArray.length; i++) {
      var attr = aArray[i];
      var value = com.gContactSync.GAbManager.getCardValue(aCard, attr);
      // get the name of the string to find in the bundle
      var label = aUseTypeLabel ? com.gContactSync.GAbManager.getCardValue(aCard, attr + "Type")
                                : attr;
      // get the actual string
      // if the label is null (ie aUseTypeLabel was true, but there wasn't a type)
      // then use the attribute's string as a default value
      var str = label && label != "" ? com.gContactSync.StringBundle.getStr(label)
                                     : com.gContactSync.StringBundle.getStr(attr);
      var prefix = this.links[label];
      // Make this a link if there is a prefix (aim:goim?...), the pref is set,
      // and there is a box for this data
      if (prefix && com.gContactSync.Preferences.mSyncPrefs.enableImUrls.value && cvData["cv" + attr + "Box"]) {
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
   * Sets up a few nodes and labels in addition to what the OnLoadCardView
   * function does in abCardViewOverlay.js.  Should be run when the Overlay is
   * loaded.
   */
  myOnLoadCardView: function ABOverlay_myOnLoadCardView() {
    if (!com.gContactSync.originalOnLoadCardView)
      return;
    com.gContactSync.originalOnLoadCardView.apply(this, arguments);

    // add the <description> elements
    var vbox = document.getElementById("cvbContact");
    // setup the third and fourth e-mail addresses
    var xhtml = "http://www.w3.org/1999/xhtml";
    cvData.cvThirdEmailBox = com.gContactSync.ABOverlay.makeDescElement("ThirdEmailBox",
                                                                      "CardViewLink");
    cvData.cvThirdEmail = document.createElementNS(xhtml, "html:a");
    cvData.cvThirdEmail.setAttribute("id", "ThirdEmail");
    cvData.cvThirdEmailBox.appendChild(cvData.cvThirdEmail);
    cvData.cvFourthEmailBox = com.gContactSync.ABOverlay.makeDescElement("FourthEmailBox",
                                                                       "CardViewLink");
    cvData.cvFourthEmail = document.createElementNS(xhtml, "html:a");
    cvData.cvFourthEmail.setAttribute("id", "FourthEmail");
    cvData.cvFourthEmailBox.appendChild(cvData.cvFourthEmail);
    vbox.insertBefore(cvData.cvFourthEmailBox, document.getElementById("cvScreennameBox"));
    vbox.insertBefore(cvData.cvThirdEmailBox, cvData.cvFourthEmailBox);
    
    // the screennames
    if (com.gContactSync.Preferences.mSyncPrefs.enableImUrls.value) {
      cvData.cvTalkScreenNameBox  = com.gContactSync.ABOverlay.makeDescElement("TalkScreenNameBox",
                                                                             "CardViewLink");
      cvData.cvTalkScreenName     = document.createElementNS(xhtml, "html:a");
      cvData.cvTalkScreenName.setAttribute("id", "TalkScreenName");
      cvData.cvTalkScreenNameBox.appendChild(cvData.cvTalkScreenName);
      cvData.cvICQScreenNameBox   = com.gContactSync.ABOverlay.makeDescElement("ICQScreenNameBox",
                                                                             "CardViewLink");
      cvData.cvICQScreenName      = document.createElementNS(xhtml, "html:a");
      cvData.cvICQScreenName.setAttribute("id", "ICQScreenName");    
      cvData.cvICQScreenNameBox.appendChild(cvData.cvICQScreenName);
      cvData.cvYahooScreenNameBox  = com.gContactSync.ABOverlay.makeDescElement("YahooScreenNameBox",
                                                                              "CardViewLink");
      cvData.cvYahooScreenName     = document.createElementNS(xhtml, "html:a");
      cvData.cvYahooScreenName.setAttribute("id", "YahooScreenName");    
      cvData.cvYahooScreenNameBox.appendChild(cvData.cvYahooScreenName);
      cvData.cvMSNScreenNameBox    = com.gContactSync.ABOverlay.makeDescElement("MSNScreenNameBox",
                                                                              "CardViewLink");
      cvData.cvMSNScreenName       = document.createElementNS(xhtml, "html:a");
      cvData.cvMSNScreenName.setAttribute("id", "MSNScreenName");    
      cvData.cvMSNScreenNameBox.appendChild(cvData.cvMSNScreenName);
      cvData.cvJabberScreenNameBox = com.gContactSync.ABOverlay.makeDescElement("JabberScreenNameBox",
                                                                              "CardViewLink");
      cvData.cvJabberScreenName    = document.createElementNS(xhtml, "html:a");
      cvData.cvJabberScreenName.setAttribute("id", "JabberScreenName");
      cvData.cvJabberScreenNameBox.appendChild(cvData.cvJabberScreenName);
      
      vbox.appendChild(cvData.cvTalkScreenNameBox);
      vbox.appendChild(cvData.cvICQScreenNameBox);
      vbox.appendChild(cvData.cvMSNScreenNameBox);
      vbox.appendChild(cvData.cvYahooScreenNameBox);
      vbox.appendChild(cvData.cvJabberScreenNameBox);
    }
    else {
      cvData.cvTalkScreenName   = com.gContactSync.ABOverlay.makeDescElement("TalkScreenName",   "CardViewText");
      cvData.cvICQScreenName    = com.gContactSync.ABOverlay.makeDescElement("ICQScreenName",    "CardViewText");
      cvData.cvYahooScreenName  = com.gContactSync.ABOverlay.makeDescElement("YahooScreenName",  "CardViewText");
      cvData.cvMSNScreenName    = com.gContactSync.ABOverlay.makeDescElement("MSNScreenName",    "CardViewText");
      cvData.cvJabberScreenName = com.gContactSync.ABOverlay.makeDescElement("JabberScreenName", "CardViewText");
      vbox.appendChild(cvData.cvTalkScreenName);
      vbox.appendChild(cvData.cvICQScreenName);
      vbox.appendChild(cvData.cvMSNScreenName);
      vbox.appendChild(cvData.cvYahooScreenName);
      vbox.appendChild(cvData.cvJabberScreenName);
    }

    // Work section
    cvData.cvJobDescription = com.gContactSync.ABOverlay.makeDescElement("JobDescription", "CardViewText");
    cvData.cvCompanySymbol  = com.gContactSync.ABOverlay.makeDescElement("CompanySymbol",  "CardViewText");
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
      cvData["cvRelation" + i] = com.gContactSync.ABOverlay.makeDescElement("Relation" + i, "CardViewText");
      otherVbox.appendChild(cvData["cvRelation" + i]);
    }

    // Other Number and HomeFaxNumber
    cvData.cvOtherNumber = com.gContactSync.ABOverlay.makeDescElement("OtherNumber", "CardViewText");
    cvData.cvHomeFaxNumber = com.gContactSync.ABOverlay.makeDescElement("HomeFaxNumber", "CardViewText");
    vbox = document.getElementById("cvbPhone");
    vbox.appendChild(cvData.cvHomeFaxNumber);
    vbox.appendChild(cvData.cvOtherNumber);
  },
  /**
   * Makes and returns a <description> element of the given class and with an ID
   * of aName with a prefix of "cv"
   * @param aName  {string} The ID of the element that will be prefixed with a
   *                        "cv"
   * @param aClass {string} The class of the element.
   * @returns {XML} A new <description> element.
   */
  makeDescElement: function ABOverlay_makeDescElement(aName, aClass) {
    var elem = document.createElement("description");
    elem.setAttribute("class", aClass);
    elem.setAttribute("id", "cv" + aName);
    return elem;
  },
  /**
   * Adds a 'Reset' menuitem to the Address Book contaxt menu for the list on
   * the left side of the Address Book window.
   */
  addResetContext: function ABOverlay_addResetContext() {
    var item = document.createElement("menuitem");
    item.id  = "dirTreeContext-reset";
    item.setAttribute("label",     com.gContactSync.StringBundle.getStr("reset"));
    item.setAttribute("accesskey", com.gContactSync.StringBundle.getStr("resetKey"));
    item.setAttribute("oncommand", "com.gContactSync.ABOverlay.resetSelectedAB()");
    document.getElementById("dirTreeContext").appendChild(item);
  },
  /**
   * Resets the currently selected address book after showing a confirmation
   * dialog.
   */
  resetSelectedAB: function ABOverlay_resetSelectedAB() {
    var dirTree  = document.getElementById("dirTree");
    var selected = dirTree.builderView.getResourceAtIndex(dirTree.currentIndex);
    var ab = new com.gContactSync.GAbManager.getGAbByURI(selected.Value);
    // make sure the AB was not already reset
    if (ab.mPrefs.reset === "true") {
      com.gContactSync.alert(com.gContactSync.StringBundle.getStr("alreadyReset"));
      return;
    }
    // show a confirm dialog to make sure the user knows what's about to happen
    if (com.gContactSync.confirm(com.gContactSync.StringBundle.getStr("resetConfirm2"))) {
      if (ab.reset()) {
        var restartStr = com.gContactSync.StringBundle.getStr("pleaseRestart");
        com.gContactSync.Preferences.setSyncPref("needRestart", true);
        this.setStatusBarText(restartStr);
        com.gContactSync.alertError(restartStr);
      }
    }
  },
  /**
   * Fixes the description style as set (accidentally?) by the
   * Duplicate Contacts Manager extension in duplicateContactsManager.css
   * It appears that the new description style was applied to addressbook.xul
   * on accident when it was meant only for duplicateEntriesWindow.xul
   *
   * @returns {boolean} true if the description style was removed.
   */
  fixDescriptionStyle: function ABOverlay_fixDescriptionStyle() {
    // Make sure this is addressbook.xul only
    if (document.location && document.location.href.indexOf("/addressbook.xul") != -1) {
      var ss = document.styleSheets;
      var s;
      // Iterate through each stylesheet and look for one from
      // Duplicate Contacts Manager
      for (var i = 0; i < ss.length; i++) {
        // If this is duplicateContactsManager.css then remove the
        // description style
        if (ss[i] && ss[i].href == "chrome://duplicatecontactsmanager/skin/duplicateContactsManager.css") {
          var rules = ss[i].cssRules;
          for (var j = 0; j < rules.length; j++) {
            if (rules[j].selectorText == "description") {
              ss[i].deleteRule(j);
              return true;
            }
          }
        }
      }
    }
    return false;
  }
}
