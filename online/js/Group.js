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
 * A class for storing and editing the XML feed for a Group in Google Contacts.
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
  /**
   * Group.setTitle
   * Sets the title of this Group.
   * @param aTitle The new title for this Group.
   */
  setTitle: function Group_setTitle(aTitle) {
    if (!aTitle)
      throw "Error - invalid title passed to Group.setTitle";

    var atom = gdata.namespaces.ATOM;
    var title = this.xml.getElementsByTagNameNS(atom.url, "title")[0];
    if (title && title.value && title.value.indexOf("System Group") != -1)
      return; // cannot rename system groups
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
  /**
   * Group.getTitle
   * Returns the title of this Group.
   * @return the title of this Group.
   */
  getTitle: function Group_getTitle() {
    if (this.mTitle)
      return this.mTitle;
    var atom = gdata.namespaces.ATOM;
    var title = this.xml.getElementsByTagNameNS(atom.url, "title")[0];
    if (title && title.childNodes[0]) {
      this.mTitle = title.childNodes[0].nodeValue
                      ? title.childNodes[0].nodeValue
                             .replace("System Group: ", "")
                      : null;
      return this.mTitle;
    }
  },
  /**
   * Group.getEditURL
   * Returns the URL used to edit this Group.
   * @return the URL used to edit this Group.
   */
  getEditURL: function Group_getEditURL() {
    var atom = gdata.namespaces.ATOM;
    var arr = this.xml.getElementsByTagNameNS(atom.url, "link");
    for (var i = 0, length = arr.length; i < length; i++)
      if (arr[i].getAttribute("rel") == gdata.contacts.links.EditURL)
        return arr[i].getAttribute("href");
  },
  /**
   * Group.getID
   * Retrieves and returns the ID of this Group.
   * @return The ID of this Group.
   */
  getID: function Group_getID() {
    var atom = gdata.namespaces.ATOM;
    var id = this.xml.getElementsByTagNameNS(atom.url, "id")[0];
    if (id && id.childNodes[0])
      return id.childNodes[0].nodeValue;
  },
  /**
   * Group.removeExtendedProperties
   * Removes all of the extended properties from this Group.
   */
  removeExtendedProperties: function Group_removeExtendedProperties() {
    var arr = this.xml.getElementsByTagNameNS(gdata.namespaces.GD.url, "extendedProperty");
    for (var i = arr.length - 1; i > -1 ; i--)
      this.xml.removeChild(arr[i]);
  },
  /**
   * Group.getExtendedProperty
   * Returns the extended property of this group's XML whose value for the
   * name attribute matches aName, if any.
   * @param aName The value of the name attribute to find.
   * @return The value of an extended property whose name is the value of aName.
   */
  getExtendedProperty: function Group_getExtendedProperty(aName) {
    var arr = this.xml.getElementsByTagNameNS(gdata.namespaces.GD.url, "extendedProperty");
    for (var i = 0, length = arr.length; i < length; i++)
      if (arr[i].getAttribute("name") == aName)
        return arr[i].getAttribute("value");
  },
  /**
   * Group.getLastModifiedDate
   * Gets the last modified date from the group's XML feed in milliseconds since
   * 1970
   * @return The last modified date of the group in milliseconds since 1970
   */
  getLastModifiedDate: function Group_getLastModifiedDate() {
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
   * Group.setExtendedProperty
   * Sets an extended property with the given name and value if there are less
   * than 10 existing.  Logs a warning if there are already 10 or more and does
   * not add the property.
   * @param aName  The name of the property.
   * @param aValue The value of the property.
   */
  setExtendedProperty: function Group_setExtendedProperty(aName, aValue) {
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
};
