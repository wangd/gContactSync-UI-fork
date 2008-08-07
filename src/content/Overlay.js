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
  mAddressBook: null,
  initialize: function() {
    StringBundle.init(); // initialize the string bundle
    Preferences.getSyncPrefs(); // get the preferences
    FileIO.init(); // initialize the FileIO class
    originalOnLoadCardView = OnLoadCardView;
    OnLoadCardView = this.myOnLoadCardView;
    Overlay.setupButton(); // insert the Sync button
    gdata.contacts.init();
    ContactConverter.init();
    // override the onDrop method of abDirTreeObserver
    // so when a card is copied the extra attributes are copied with it
    if (Preferences.mSyncPrefs.overrideCopy.value)
      abDirTreeObserver.onDrop = myOnDrop;
    this.checkAuthentication(); // check if the Auth token is valid
    // call the unload function when the address book window is shut
    window.addEventListener("unload", function(e) { Overlay.unload(); }, false);
  },
  unload: function() {
    AbListener.remove();
  },
  /**
   * Overlay.setupButton
   * Sets up the Sync button to go between the Write and Delete buttons and adds
   * a separator between Sync and Delete.
   */
  setupButton: function() {
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
  },
  /**
   * Overlay.checkAuthentication
   * Checks to see whether or not there is an authentication token in the login
   * manager.  If so, it begins a sync.  If not, it shows the login prompt.
   */
  checkAuthentication: function() {
    if (gdata.isAuthValid()) {
      // get the Address Book
      this.mAddressBook = new AddressBook(Preferences.mSyncPrefs.addressBookName.value);
      // override the display card view pane
      originalDisplayCardViewPane = DisplayCardViewPane;
      DisplayCardViewPane = this.myDisplayCardViewPane;
      AbListener.add(); // add the address book listener
      Sync.schedule(Preferences.mSyncPrefs.initialDelay.value);  
      return;
    }
    this.setStatusBarText(StringBundle.getStr("notAuthString"));
    this.promptLogin();
  },
  /**
   * Overlay.promptLogin
   * Prompts the user to enter his or her Gmail™ username and password and then
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
    httpReq.mOnSuccess = ["Overlay.login(httpReq.responseText.split(\"\\n\")[2]);"];
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
  login: function(aAuthToken) {
    gdata.mAuthToken = 'GoogleLogin ' + aAuthToken;
    LoginManager.setAuthToken(gdata.mAuthToken);
    this.setStatusBarText(StringBundle.getStr("initialSetup"));
    var setup = window.open("chrome://gcontactsync/content/FirstLogin.xul",
                            "SetupWindow",
                            "chrome,resizable=yes,scrollbars=no,status=no");
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
      Overlay.clearNodes(ContactConverter.getExtraSyncAttributes());
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
      var ab = Overlay.mAddressBook;
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
                                           "ICQScreenName"], visible);
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
        // hide the old home address stuff...
        Overlay.hideAddress("Home");
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
        // hide the old Work address stuff...
        Overlay.hideAddress("Work");
      }  
      else {
        cvData.cvFullWorkMapIt.setAttribute("url", "");
        cvSetVisible(cvData.cvbFullWorkMapItBox, false);
      }
      // Phone section (add OtherNumber and HomeFaxNumber)
      var visible = !cvData.cvhPhone.getAttribute("collapsed");
      visible = Overlay.getVisible(aCard, ["OtherNumber", "HomeFaxNumber"], visible);
      cvSetVisible(cvData.cvhPhone, visible);
      cvSetVisible(cvData.cvbPhone, visible);
    } catch(e) {alert(e);}
  },
  hideAddress: function(aPrefix) {
    if (!aPrefix)
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
  clearNodes: function(aArray) {
    for (var i = 0, length = aArray.length; i < length; i++)
      try { cvSetVisible(cvData["cv" + aArray[i]], false); } catch (e) { alert('clear nodes error: ' + e); }
  },
  showNodes: function(aArray) {
    for (var i = 0, length = aArray.length; i < length; i++)
      try { cvSetVisible(cvData["cv" + aArray[i]], true); } catch (e) { alert('show nodes error' + e); }
  },
  /**
   * A helper method for myDisplayCardViewPane that iterates through an array of
   * attributes and returns true if at least one of them is present in the given
   * card.
   * @param aCard  The card whose attributes are checked.
   * @param aArray The array of attributes to check the presence of in the card.
   * @return True if at least one attribute in aArray is present in aCard.
   */
  getVisible: function(aCard, aArray, aVisible) {
    var ab = this.mAddressBook;
    var visible = aVisible;
    // return true if the card has the current attribute
    for (var i = 0; i < aArray.length; i++) {
      var attr = aArray[i];
      var value = ab.getCardValue(aCard, attr);
      visible = cvSetNodeWithLabel(cvData["cv" + attr], StringBundle.getStr(attr),
                                   value) || visible;
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
    cvData.cvJabberScreenName = Overlay.makeDescElement("JabberScreenName", "CardViewText");
    cvData.cvYahooScreenName = Overlay.makeDescElement("YahooScreenName", "CardViewText");
    cvData.cvMSNScreenName = Overlay.makeDescElement("MSNScreenName", "CardViewText");
    cvData.cvICQScreenName = Overlay.makeDescElement("ICQScreenName", "CardViewText");
    vbox.insertBefore(cvData.cvICQScreenName, document.getElementById("cvScreennameBox"));
    vbox.insertBefore(cvData.cvMSNScreenName, cvData.cvICQScreenName);
    vbox.insertBefore(cvData.cvYahooScreenName, cvData.cvMSNScreenName);
    vbox.insertBefore(cvData.cvJabberScreenName, cvData.cvYahooScreenName);
    vbox.insertBefore(cvData.cvTalkScreenName, cvData.cvJabberScreenName);
    // Other Address
    vbox = document.getElementById("cvbOther");
    var otherHbox = document.createElement("hbox");
    var otherVbox = document.createElement("vbox");
    otherVbox.setAttribute("flex", "1");
    cvData.cvOtherAddress = Overlay.makeDescElement("OtherAddress", "CardViewText");
    if (Cc["@mozilla.org/abmanager;1"])
      cvData.cvOtherAddress.setAttribute("style", "white-space: pre-wrap;");
    else
      cvData.cvOtherAddress.setAttribute("style", "white-space: -moz-pre-wrap;");
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
    if (Cc["@mozilla.org/abmanager;1"])
      cvData.cvFullHomeAddress.setAttribute("style", "white-space: pre-wrap;");
    else
      cvData.cvFullHomeAddress.setAttribute("style", "white-space: -moz-pre-wrap;");
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
    if (Cc["@mozilla.org/abmanager;1"])
      cvData.cvFullWorkAddress.setAttribute("style", "white-space: pre-wrap;");
    else
      cvData.cvFullWorkAddress.setAttribute("style", "white-space: -moz-pre-wrap;");
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
}
