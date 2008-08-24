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
window.addEventListener("load", function(e) { Overlay.initialize(); }, false);
var originalOnLoadCardView;
var originalDisplayCardViewPane;
/**
 * Overlay
 * Checks if the authentication token is present and valid.  If so, it starts
 * everything up and synchronizes the contacts.  Otherwise it shows the
 * login window.
 * @class
 */
var Overlay = {
  /**
   * Called when the overlay is loaded and initializes everything and begins
   * the authentication check and sync or login prompt.
   */
  initialize: function() {
    // determine if this is before or after Bug 413260 landed
    var card = Cc["@mozilla.org/addressbook/cardproperty;1"]
              .createInstance(nsIAbCard);
    this.mBug413260 = card.getProperty ? true : false;
    StringBundle.init(); // initialize the string bundle
    Preferences.getSyncPrefs(); // get the preferences
    FileIO.init(); // initialize the FileIO class
    originalOnLoadCardView = OnLoadCardView;
    OnLoadCardView = this.myOnLoadCardView;
    Overlay.setupButton(); // insert the Sync button
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
    AbListener.add(); // add the address book listener
    // call the unload function when the address book window is shut
    window.addEventListener("unload", function(e) { Overlay.unload(); }, false);
    this.checkAuthentication(); // check if the Auth token is valid
  },
  /**
   * Called when the overlay is unloaded and removes the address book listener.
   */
  unload: function() {
    AbListener.remove();
  },
  /**
   * ContactConverter.addTreeCols
   * Adds treecol elements to the address book results tree that shows cards in
   * the currently selected directory.  These treecols allow the user to show
   * and sort by extra attributes that are added by this extension.  This will
   * only work after Bug 413260 landed, so in Thunderbird 3.0b1pre and after.
   */
  addTreeCols: function() {
    // get the treecols XUL element
    var treeCols = document.getElementById("abResultsTreeCols");
    if (!treeCols || !treeCols.appendChild)
      return;
    // fix the existing phone numbers
    var arr = ["WorkPhone", "HomePhone", "FaxNumber","CellularNumber",
               "PagerNumber"];
    for (var i = 0; i < arr.length; i++) {
      var elem = document.getElementById(arr[i]);
      if (!elem)
        continue;
      // remove it
      treeCols.removeChild(elem);
      elem.setAttribute("label", StringBundle.getStr(arr[i]));
      // and then add it to the end of the treecols element
      treeCols.appendChild(elem);
    }
    // if Bug 413260 isn't applied in this version of TB, stop here
    if (!this.mBug413260)
      return;
    // get the added attributes
    var ids = ContactConverter.getExtraSyncAttributes(false);
    // iterate through every added attribute and add a treecol for it unless
    // it is a postal address
    for (var i = 0, length = ids.length; i < length; i++) {
      var id = ids[i];
      if (id.indexOf("Address") != -1 || id.indexOf("Type") != -1) 
        continue; // skip addresses and Types
      // make and add the splitter first
      var splitter = document.createElement("splitter");
      splitter.setAttribute("class", "tree-splitter");
      treeCols.appendChild(splitter);
      // make the new treecol
      var treeCol = document.createElement("treecol");
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
   * Overlay.setupButton
   * Sets up the Sync button to go between the Write and Delete buttons and adds
   * a separator between Sync and Delete.
   */
  setupButton: function() {
    try {
      // get the toolbar with the buttons
      var toolbar = document.getElementById("ab-bar2");
      // setup the separator
      var separator = document.createElement("toolbarseparator");
      separator.setAttribute("id", "new-separator");
      // setup the button
      var button = document.createElement("toolbarbutton");
      button.setAttribute("class", "gContactSync-Button toolbarbutton-1" + 
                          " chromeclass-toolbar-additional");
      button.setAttribute("id", "gContactSyncButton");
      button.setAttribute("label", StringBundle.getStr("syncButton"));
      button.setAttribute("oncommand", "Sync.begin();");
      button.setAttribute("tooltiptext", StringBundle.getStr("syncTooltip"));
      button.setAttribute("insertbefore", "new-separator");
      // insert the separator before the Delete button
      toolbar.insertBefore(separator, document.getElementById("button-abdelete"));
      // insert the button before the separator
      toolbar.insertBefore(button, separator);
    }
    catch(e) { LOGGER.LOG_WARNING("Couldn't setup the sync button", e); }
  },
  /**
   * Overlay.checkAuthentication
   * Checks to see whether or not there is an authentication token in the login
   * manager.  If so, it begins a sync.  If not, it shows the login prompt.
   * @param firstLogin 
   */
  checkAuthentication: function() {
    if (gdata.isAuthValid()) {
      if (this.mUsername) {
        var name = Preferences.mSyncPrefs.addressBookName.value;
        var ab = new AddressBook(AbManager.getAbByName(name));
        ab.setUsername(this.mUsername);
        ab.setPrimary(true);
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
   * Prompts the user to enter his or her Google™ username and password and then
   * gets an authentication token to store and use.
   */
  promptLogin: function() {
    var prompt = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                  .getService(Ci.nsIPromptService)
                  .promptUsernameAndPassword;
    var username = {};
    var password = {};
    // opens a username/password prompt
    var ok = prompt(window, StringBundle.getStr("loginTitle"),
                    StringBundle.getStr("loginText"), username, password, null,
                    {value: false});
    if (!ok)
      return;
    var body = gdata.makeAuthBody(username.value, password.value);
    var httpReq = new GHttpRequest("authenticate", null, null, body);
    // if it succeeds and Google returns the auth token, store it and then start
    // a new sync
    httpReq.mOnSuccess = ["Overlay.login('" + username.value +
                          "', httpReq.responseText.split(\"\\n\")[2]);"];
    // if it fails, alert the user and prompt them to try again
    httpReq.mOnError = ["alert(StringBundle.getStr('authErr'));",
                        "LOGGER.LOG_ERROR('Authentication Error - ' + " +
                        "httpReq.responseText);",
                        "Overlay.promptLogin();"];
    // if the user is offline, alert them and quit
    httpReq.mOnOffline = ["alert(StringBundle.getStr('offlineErr'));",
                          "LOGGER.LOG_ERROR(StringBundle.getStr('offlineErr'));"];
    httpReq.send();
  },
  /**
   * Overlay.login
   * Stores the given auth token in the login manager and starts the setup
   * window that will begin the first synchronization when closed.
   * @param aAuthToken The authentication token to store.
   */
  login: function(aUsername, aAuthToken) {
    LoginManager.addAuthToken(aUsername, 'GoogleLogin ' + aAuthToken);
    this.setStatusBarText(StringBundle.getStr("initialSetup"));
    var setup = window.open("chrome://gcontactsync/content/FirstLogin.xul",
                            "SetupWindow",
                            "chrome,resizable=yes,scrollbars=no,status=no");
    this.mUsername = aUsername;
    // when the setup window loads, set its onunload property to begin a sync
    setup.onload = function() {
      setup.onunload = function () {
        Overlay.checkAuthentication(); 
      };
    };
  },
  /**
   * Overlay.setStatusBarText
   * Sets the text of the status bar to the given value.
   * @param aText  The text to put on the status bar.
   */
  setStatusBarText: function(aText) {
    document.getElementById("statusText2").label = aText;
  },
  /**
   * Overlay.writeTimeToStatusBar
   * Writes the current time to the status bar along with the sync finished
   * string.
   */
  writeTimeToStatusBar: function() {
    var hours = new String(new Date().getHours());
    hours = hours.length == 0 ? "00" + hours : hours;
    hours = hours.length == 1 ? "0" + hours : hours;
    var minutes = new String(new Date().getMinutes());
    minutes = minutes.length == 1 ? "0" + minutes : minutes;
    var seconds = new String(new Date().getSeconds());
    seconds = seconds.length == 1 ? "0" + seconds : seconds;
    var text = StringBundle.getStr("syncFinishedString");
    this.setStatusBarText(text + " " + hours + ":" + minutes + ":" + seconds);
    var elem = document.getElementById("statusText2");
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
  myDisplayCardViewPane: function(aCard) {
    originalDisplayCardViewPane(aCard); // call the original first
    if (aCard.isMailList) {
      // collapse all the attributes added
      Overlay.hideNodes(ContactConverter.getExtraSyncAttributes());
      try {
        // and then collapse the e-mail boxes
        cvData.cvThirdEmailBox.collapsed = true;
        cvData.cvFourthEmailBox.collapsed = true;
      } catch(e) {}
      return; // and quit, nothing was added for mail lists
    }
    try {
      Overlay.showNodes(ContactConverter.getExtraSyncAttributes());
      cvData.cvThirdEmailBox.collapsed = false;
      cvData.cvFourthEmailBox.collapsed = false;
      var ab = AbManager;
      // Contact section (ThirdEmail, FourthEmail, TalkScreenName, MSNScreenName,
      // JabberScreenName, YahooScreenName, ICQScreenName)
      var visible = !cvData.cvbContact.getAttribute("collapsed");
      var thirdEmail = ab.getCardValue(aCard, "ThirdEmail");
      var fourthEmail = ab.getCardValue(aCard, "FourthEmail");
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
      // Other section (OtherAddress)
      var visible = !cvData.cvhOther.getAttribute("collapsed");
      visible = Overlay.getVisible(aCard, ["OtherAddress"], visible);
      cvSetVisible(cvData.cvhOther, visible);
      cvSetVisible(cvData.cvbOther, visible);
      // setup the OtherAddress MapIt button 
      if (cvData.cvOtherAddress && cvData.cvOtherAddress.childNodes[0] &&
          cvData.cvOtherAddress.childNodes[0].nodeValue) {
        var baseUrl = "http://maps.google.com/maps?q=";
        var address = cvData.cvOtherAddress.childNodes[0].nodeValue;
        // remove the label
        var index = address.indexOf(":")
        if (index != -1 && address.length > index + 2)
          address = address.substring(address.indexOf(":") + 2);
        cvData.cvOtherMapIt.setAttribute("url",  baseUrl + encodeURIComponent(address));
        cvSetVisible(cvData.cvbOtherMapItBox, true);
      }  
      else {
        cvData.cvOtherMapIt.setAttribute("url", "");
        cvSetVisible(cvData.cvbOtherMapItBox, false);
      }
      // setup the OtherAddress MapIt button 
      if (cvData.cvOtherAddress && cvData.cvOtherAddress.childNodes[0] &&
          cvData.cvOtherAddress.childNodes[0].nodeValue) {
        var baseUrl = "http://maps.google.com/maps?q=";
        var address = cvData.cvOtherAddress.childNodes[0].nodeValue;
        // remove the label
        var index = address.indexOf(":")
        if (index != -1 && address.length > index + 2)
          address = address.substring(address.indexOf(":") + 2);
        cvData.cvOtherMapIt.setAttribute("url",  baseUrl + encodeURIComponent(address));
        cvSetVisible(cvData.cvbOtherMapItBox, true);
      }  
      else {
        cvData.cvOtherMapIt.setAttribute("url", "");
        cvSetVisible(cvData.cvbOtherMapItBox, false);
      }
      // Home Section (FullHomeAddress)
      var visible = !cvData.cvhHome.getAttribute("collapsed");
      visible = Overlay.getVisible(aCard, ["FullHomeAddress"], visible);
      cvSetVisible(cvData.cvhHome, visible);
      cvSetVisible(cvData.cvbHome, visible);
      // setup the HomeAddress MapIt button 
      if (cvData.cvFullHomeAddress && cvData.cvFullHomeAddress.childNodes[0] &&
          cvData.cvFullHomeAddress.childNodes[0].nodeValue) {
        var baseUrl = "http://maps.google.com/maps?q=";
        var address = cvData.cvFullHomeAddress.childNodes[0].nodeValue;
        // remove the label
        var index = address.indexOf(":")
        if (index != -1 && address.length > index + 2)
          address = address.substring(address.indexOf(":") + 2);
        cvData.cvFullHomeMapIt.setAttribute("url",  baseUrl + encodeURIComponent(address));
        cvSetVisible(cvData.cvbFullHomeMapItBox, true);
        // hide the old home address...
        Overlay.collapseAddress("Home");
      }  
      else {
        cvData.cvFullHomeMapIt.setAttribute("url", "");
        cvSetVisible(cvData.cvbFullHomeMapItBox, false);
      }
      // Work Section (FullWorkAddress)
      var visible = !cvData.cvhWork.getAttribute("collapsed");
      visible = Overlay.getVisible(aCard, ["FullWorkAddress"], visible);
      cvSetVisible(cvData.cvhWork, visible);
      cvSetVisible(cvData.cvbWork, visible);
      // setup the WorkAddress MapIt button 
      if (cvData.cvFullWorkAddress && cvData.cvFullWorkAddress.childNodes[0] &&
          cvData.cvFullWorkAddress.childNodes[0].nodeValue) {
        var baseUrl = "http://maps.google.com/maps?q=";
        var address = cvData.cvFullWorkAddress.childNodes[0].nodeValue;
        // remove the label
        var index = address.indexOf(":")
        if (index != -1 && address.length > index + 2)
          address = address.substring(address.indexOf(":") + 2);
        cvData.cvFullWorkMapIt.setAttribute("url",  baseUrl + encodeURIComponent(address));
        cvSetVisible(cvData.cvbFullWorkMapItBox, true);
        // hide the old Work address...
        Overlay.collapseAddress("Work");
      }  
      else {
        cvData.cvFullWorkMapIt.setAttribute("url", "");
        cvSetVisible(cvData.cvbFullWorkMapItBox, false);
      }
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
    } catch(e) {alert(e);}
  },
  /**
   * Overlay.collapseAddress
   * Collapses (hides) the old components of an address: Address Line 1 and 2,
   * the City, State Zip line, and the Country of the given type (Home or Work).
   * @param aPrefix The type of address.  Must be 'Home' or 'Work'.
   */
  collapseAddress: function(aPrefix) {
    if (!aPrefix || (aPrefix != "Home" && aPrefix != "Work"))
      return;
    var arr = ["Address", "Address2", "CityStZip", "Country"];
    for (var i = 0, length = arr.length; i < length; i++) {
      var id = "cv" + aPrefix + arr[i];
      var elem = document.getElementById(id);
      if (elem && elem.setAttribute)
        elem.setAttribute("collapsed", true);
    }
    var mapItBox = document.getElementById("cvb" + aPrefix + "MapItBox");
    if (mapItBox && mapItBox.setAttribute)
      mapItBox.setAttribute("collapsed", true);
  },
  /**
   * Overlay.hideNodes
   * Hides all of the nodes based on the array.  The node must be a propery of
   * cvData with the same name as the element in aArray prefixed with a 'cv'.
   * For example, to hide cvData.cvHomeAddress the element would be
   * 'HomeAddress'.
   * @param aArray An array of names as described above.
   */
  hideNodes: function(aArray) {
    for (var i = 0, length = aArray.length; i < length; i++) {
      if (aArray[i].indexOf("Type") != -1)
        continue;
      try {
        cvSetVisible(cvData["cv" + aArray[i]], false);
      }
      catch (e) {
        LOGGER.LOG_WARNING("Error while hiding nodes: ", e);
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
  showNodes: function(aArray) {
    for (var i = 0, length = aArray.length; i < length; i++) {
      if (aArray[i].indexOf("Type") != -1)
        continue;
      try {
        cvSetVisible(cvData["cv" + aArray[i]], true);
      }
      catch (e) {
        LOGGER.LOG_WARNING("Error while showing nodes", e);
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
  getVisible: function(aCard, aArray, aVisible, aUseTypeLabel) {
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
  myOnLoadCardView: function() {
    if (!originalOnLoadCardView)
      return;
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
    cvData.cvTalkScreenName = Overlay.makeDescElement("TalkScreenName", "CardViewText");
    cvData.cvICQScreenName = Overlay.makeDescElement("ICQScreenName", "CardViewText");
    cvData.cvYahooScreenName = Overlay.makeDescElement("YahooScreenName", "CardViewText");
    cvData.cvMSNScreenName = Overlay.makeDescElement("MSNScreenName", "CardViewText");
    cvData.cvJabberScreenName = Overlay.makeDescElement("JabberScreenName", "CardViewText");
    vbox.appendChild(cvData.cvTalkScreenName);
    vbox.appendChild(cvData.cvICQScreenName);
    vbox.appendChild(cvData.cvMSNScreenName);
    vbox.appendChild(cvData.cvYahooScreenName);
    vbox.appendChild(cvData.cvJabberScreenName);
    // Other Address
    vbox = document.getElementById("cvbOther");
    var otherHbox = document.createElement("hbox");
    var otherVbox = document.createElement("vbox");
    otherVbox.setAttribute("flex", "1");
    cvData.cvOtherAddress = Overlay.makeDescElement("OtherAddress", "CardViewText");
    if (Cc["@mozilla.org/abmanager;1"]) // TB 3 - style should be pre-wrap
      cvData.cvOtherAddress.setAttribute("style", "white-space: pre-wrap;");
    else // TB 2 - the style should be -moz-pre-wrap
      cvData.cvOtherAddress.setAttribute("style", "white-space: -moz-pre-wrap;");
    // setup the MapIt box
    cvData.cvbOtherMapItBox = document.createElement("vbox");
    cvData.cvbOtherMapItBox.setAttribute("id", "cvbOtherMapItBox");
    cvData.cvbOtherMapItBox.setAttribute("pack", "end");
    cvData.cvOtherMapIt = document.createElement("button");
    cvData.cvOtherMapIt.setAttribute("label", StringBundle.getStr("getMap"));
    cvData.cvOtherMapIt.setAttribute("url", "");
    cvData.cvOtherMapIt.setAttribute("oncommand", "MapIt('cvOtherMapIt');");
    cvData.cvOtherMapIt.setAttribute("tooltip", StringBundle.getStr("getMapTooltip"));
    cvData.cvOtherMapIt.setAttribute("id", "cvOtherMapIt");
    otherVbox.appendChild(cvData.cvOtherAddress);
    cvData.cvbOtherMapItBox.appendChild(cvData.cvOtherMapIt);
    otherHbox.appendChild(otherVbox);
    otherHbox.appendChild(cvData.cvbOtherMapItBox);
    vbox.appendChild(otherHbox);
    // FullHomeAddress
    vbox = document.getElementById("cvbHome");
    var FullHomeHbox = document.createElement("hbox");
    var FullHomeVbox = document.createElement("vbox");
    FullHomeVbox.setAttribute("flex", "1");
    cvData.cvFullHomeAddress = Overlay.makeDescElement("FullHomeAddress", "CardViewText");
    if (Cc["@mozilla.org/abmanager;1"]) // TB 3 - style should be pre-wrap
      cvData.cvFullHomeAddress.setAttribute("style", "white-space: pre-wrap;");
    else // TB 2 - the style should be -moz-pre-wrap
      cvData.cvFullHomeAddress.setAttribute("style", "white-space: -moz-pre-wrap;");
    // setup the MapIt box
    cvData.cvbFullHomeMapItBox = document.createElement("vbox");
    cvData.cvbFullHomeMapItBox.setAttribute("id", "cvbFullHomeMapItBox");
    cvData.cvbFullHomeMapItBox.setAttribute("pack", "end");
    cvData.cvFullHomeMapIt = document.createElement("button");
    cvData.cvFullHomeMapIt.setAttribute("label", StringBundle.getStr("getMap"));
    cvData.cvFullHomeMapIt.setAttribute("url", "");
    cvData.cvFullHomeMapIt.setAttribute("oncommand", "MapIt('cvFullHomeMapIt');");
    cvData.cvFullHomeMapIt.setAttribute("tooltip", StringBundle.getStr("getMapTooltip"));
    cvData.cvFullHomeMapIt.setAttribute("id", "cvFullHomeMapIt");
    FullHomeVbox.appendChild(cvData.cvFullHomeAddress);
    cvData.cvbFullHomeMapItBox.appendChild(cvData.cvFullHomeMapIt);
    FullHomeHbox.appendChild(FullHomeVbox);
    FullHomeHbox.appendChild(cvData.cvbFullHomeMapItBox);
    var homeWebPageBox = document.getElementById("cvHomeWebPageBox");
    if (homeWebPageBox)
      vbox.insertBefore(FullHomeHbox, homeWebPageBox);
    else
      vbox.appendChild(FullHomeHbox);
    // FullWorkAddress
    vbox = document.getElementById("cvbWork");
    var FullWorkHbox = document.createElement("hbox");
    var FullWorkVbox = document.createElement("vbox");
    FullWorkVbox.setAttribute("flex", "1");
    cvData.cvFullWorkAddress = Overlay.makeDescElement("FullWorkAddress", "CardViewText");
    if (Cc["@mozilla.org/abmanager;1"]) // TB 3 - style should be pre-wrap
      cvData.cvFullWorkAddress.setAttribute("style", "white-space: pre-wrap;");
    else // TB 2 - the style should be -moz-pre-wrap
      cvData.cvFullWorkAddress.setAttribute("style", "white-space: -moz-pre-wrap;");
    // setup the MapIt box
    cvData.cvbFullWorkMapItBox = document.createElement("vbox");
    cvData.cvbFullWorkMapItBox.setAttribute("id", "cvbFullWorkMapItBox");
    cvData.cvbFullWorkMapItBox.setAttribute("pack", "end");
    cvData.cvFullWorkMapIt = document.createElement("button");
    cvData.cvFullWorkMapIt.setAttribute("label", StringBundle.getStr("getMap"));
    cvData.cvFullWorkMapIt.setAttribute("url", "");
    cvData.cvFullWorkMapIt.setAttribute("oncommand", "MapIt('cvFullWorkMapIt');");
    cvData.cvFullWorkMapIt.setAttribute("tooltip", StringBundle.getStr("getMapTooltip"));
    cvData.cvFullWorkMapIt.setAttribute("id", "cvFullWorkMapIt");
    FullWorkVbox.appendChild(cvData.cvFullWorkAddress);
    cvData.cvbFullWorkMapItBox.appendChild(cvData.cvFullWorkMapIt);
    FullWorkHbox.appendChild(FullWorkVbox);
    FullWorkHbox.appendChild(cvData.cvbFullWorkMapItBox);
    var WorkWebPageBox = document.getElementById("cvWorkWebPageBox");
    if (WorkWebPageBox)
      vbox.insertBefore(FullWorkHbox, WorkWebPageBox);
    else
      vbox.appendChild(FullWorkHbox);
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
  makeDescElement: function(aName, aClass) {
    var elem = document.createElement("description");
    elem.setAttribute("class", aClass);
    elem.setAttribute("id", "cv" + aName);
    return elem;
  }
};
