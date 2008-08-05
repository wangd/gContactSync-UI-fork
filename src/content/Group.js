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
 * Group

 * @class
 * @constructor
 */
function Group(aXml, aTitle) {
  if (!aXml) {
    if (!aTitle)
      throw "Error - No title or XML passed to the Group constructor";
    var atom = gdata.namespaces.ATOM;
    var gd = gdata.namespaces.GD;
    var gcontact = gdata.namespaces.GCONTACT;
    var xml = document.createElementNS(atom.url, atom.prefix + "entry");
    var category = document.createElementNS(atom.url, atom.prefix + "category");
    category.setAttribute("scheme", gd.url + "/#kind");
    category.setAttribute("term", gcontact.url + "/#group");
    xml.appendChild(category);
    var title = document.createElementNS(atom.url, atom.prefix + "title");
    var text = document.createTextNode(aTitle);
    title.appendChild(text);
    xml.appendChild(title);
    this.xml = xml;
    this.mTitle = aTitle;
  }
  else {
    this.xml = aXml;
    this.mTitle = this.getTitle();
  }
}

Group.prototype = {
  mListURIName: "ListURI",
  setTitle: function(aTitle) {
    if (!aTitle)
      throw "Error - invalid title passed to Group.setTitle";
    var atom = gdata.namespaces.ATOM;
    var title = this.xml.getElementsByTagNameNS(atom.url, "title")[0];
    this.mTitle = aTitle;
    if (title) {
      if (title.childNodes[0])
        title.childNodes[0].nodeValue = aTitle;
      else {
       var text = document.createTextNode(aValue);
        title.appendChild(text);
      }
    }
    else {
      title = document.createElementNS(atom.url, atom.prefix + "title");
      var text = document.createTextNode(aTitle);
      title.appendChild(text);
      this.xml.appendChild(title);
    }
  },
  getTitle: function() {
    if (this.mTitle)
      return this.mTitle;
    var atom = gdata.namespaces.ATOM;
    var title = this.xml.getElementsByTagNameNS(atom.url, "title")[0];
    if (title && title.childNodes[0])
      return title.childNodes[0].nodeValue;
  },
  getEditURL: function() {
    var atom = gdata.namespaces.ATOM;
    var arr = this.xml.getElementsByTagNameNS(atom.url, "link");
    for (var i = 0, length = arr.length; i < length; i++)
      if (arr[i].getAttribute("rel") == gdata.contacts.links.EditURL)
        return arr[i].getAttribute("href");
  },
  getID: function() {
    var atom = gdata.namespaces.ATOM;
    var id = this.xml.getElementsByTagNameNS(atom.url, "id")[0];
    if (id && id.childNodes[0])
      return id.childNodes[0].nodeValue;
  },
  getListURI: function() {
    return this.getExtendedProperty(this.mListURIName);
  },
  setListURI: function(aURI) {
    if (!aURI)
      throw "Error - bad URI given to Group.setListURI";
    this.removeExtendedProperties();
    this.setExtendedProperty(this.mListURIName, aURI);
  },
  removeExtendedProperties: function() {
    var arr = this.xml.getElementsByTagNameNS(gdata.namespaces.GD.url, "extendedProperty");
    for (var i = arr.length - 1; i > -1 ; i--)
      this.xml.removeChild(arr[i]);
  },
  getExtendedProperty: function(aName) {
    var arr = this.xml.getElementsByTagNameNS(gdata.namespaces.GD.url, "extendedProperty");
    for (var i = 0, length = arr.length; i < length; i++)
      if (arr[i].getAttribute("name") == aName)
        return arr[i].getAttribute("value");
  },
  /**
   * Gets the last modified date from the group's XML feed in milliseconds from 1970
   * @return The last modified date of the group in milliseconds from 1970
   */
  getLastModifiedDate: function() {
    try {
      var sModified = this.xml.getElementsByTagName('updated')[0].childNodes[0].nodeValue;
      var year = sModified.substring(0,4);
      var month = sModified.substring(5,7);
      var day = sModified.substring(8,10);
      var hrs = sModified.substring(11,13);
      var mins = sModified.substring(14,16);
      var sec = sModified.substring(17,19);
      var ms = sModified.substring(20,23);
      return  parseInt(Date.UTC(year, parseInt(month, 10) - 1, day, hrs, mins, sec, ms));
    }
    catch(e) {
      LOGGER.LOG_WARNING("Unable to get last modified date from a group:\n" + e);
    }
  },
  /**
   * Sets an extended property with the given name and value if there are less
   * than 10 existing.  Logs a warning if there are already 10 or more.
   * @param aName  The name of the property.
   * @param aValue The value of the property.
   */
  setExtendedProperty: function(aName, aValue) {
    if (this.xml.getElementsByTagNameNS(gdata.namespaces.GD.url,
        "extendedProperty").length >= 10) {
      LOGGER.LOG_WARNING("Attempt to add too many properties aborted");
      return;
    }
    if (aValue && aValue != "") {
      var property = document.createElementNS(gdata.namespaces.GD.url,
                                              "extendedProperty");
      property.setAttribute("name", aName);
      property.setAttribute("value", aValue);
      this.xml.appendChild(property);
    }
  }
}
