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
 * GContact
 * Makes a new GContact object that has functions to get and set various values
 * for a Google Contact's Atom/XML representation.  If the parameter aXml is not
 * supplied, this constructor will make a new contact.
 * XXX update (localize) error strings and add some try/catches so one mistake
 * won't crash the extension
 * @param aXml Optional.  The Atom/XML representation of this contact.  If not
 *             supplied, will make a new contact.
 * @class
 * @constructor
 */
function GContact(aXml) {
  if (aXml) {
    this.xml = aXml;
    // check for invalid IM addresses
    this.checkIMAddress();
  }
  else {
    var atom = gdata.namespaces.ATOM;
    var gd = gdata.namespaces.GD;
    var xml = document.createElementNS(atom.url, atom.prefix + "entry");
    //xml.setAttribute("xmlns:" + gd.prefix.substring(0, gd.prefix.length - 1), gd.url);
    var category = document.createElementNS(atom.url, atom.prefix + "category");
    category.setAttribute("scheme", gd.url + "/#kind");
    category.setAttribute("term", gd.url + "/#contact");
    xml.appendChild(category);
    this.xml = xml;
  }
}

GContact.prototype = {
  mElementsToRemove: [],
  mCurrentElement: null,
  mGroups: {},
  /**
   * GContact.checkIMAddress
   * Checks for an invalid IM address as explained here:
   * http://pi3141.wordpress.com/2008/07/30/update-2/
   */
  checkIMAddress: function() {
    var i = 0;
    var element = {};
    var ns = gdata.namespaces.GD.url;
    var arr = this.xml.getElementsByTagNameNS(ns, "im");
    for (var i = 0, length = arr.length; i < length; i++) {
      var address = arr[i].getAttribute("address")
      if (address && address.indexOf(": ") != -1)
        arr[i].setAttribute("address", address.replace(": ", ""));
    }
  },
  removeElements: function() {
    for (var i = 0, length = this.mElementsToRemove.length; i < length; i++) {
      try { this.xml.removeChild(this.mElementsToRemove[i]); }
      catch (e) {
        LOGGER.LOG_WARNING("Error while removing element: " + e);
      }
    }
    this.mElementsToRemove = [];
  },
  /**
   * GContact.getContactName
   * Gets the name and e-mail address of a contact from it's Atom
   * representation.
   * @param aAtomEntry  The contact.
   */
  getName: function() {
    var contactName = "";
    if (this.xml.getElementsByTagName('title')[0] && 
        this.xml.getElementsByTagName('title')[0].childNodes[0])
      contactName = this.xml.getElementsByTagName('title')[0].childNodes[0]
                                                             .nodeValue;
    if (this.xml.getElementsByTagNameNS(gdata.namespaces.GD.url, "email")[0])
      contactName += this.xml.getElementsByTagNameNS(gdata.namespaces.GD.url,
                                                     "email")[0].getAttribute("address");
    return contactName;
  },
  /**
   * GContact.getElementValue
   * Returns the value of an element with a type where the value is in the
   * value of the child node.
   * @param aElement The GElement object with information about the value to get.
   * @param aIndex   The index of the value (ie 0 for primary email, 1 for
   *                 second...).  Set to 0 if not supplied.
   * @param aType    The type, if the element can have types.
   */
  getElementValue: function(aElement, aIndex, aType) {
    if (!aIndex)
      aIndex = 0;
    this.mCurrentElement = null;
    var arr = this.xml.getElementsByTagNameNS(aElement.namespace.url,
                                              aElement.tagName);
    var counter = 0;
    // iterate through each of the elements that match the tag name
    for (var i = 0, length = arr.length; i < length; i++) {
      // if the current element matches the type (true if there isn't a type)...
      if (this.isMatch(aElement, arr[i], aType)) {
        // some properties, like e-mail, can have multiple elements in Google,
        // so if this isn't the right one, go to the next element
        if (counter != aIndex) {
          counter++;
          continue;
        }
        this.mCurrentElement = arr[i];
        // otherwise there is a match and it should be returned
        // get the contact's "type" as defined in gdata and return the attribute's
        // value based on where the value is actually stored in the element
        switch (aElement.contactType) {
          case gdata.contacts.types.TYPED_WITH_CHILD:
            if (arr[i].childNodes[0])
              return arr[i].childNodes[0].nodeValue;
            return null;
          case gdata.contacts.types.TYPED_WITH_ATTR:
            if (!aElement.attribute)
              throw StringBundle.getStr("error") + "aElement.attribute" +
                    StringBundle.getStr("suppliedTo") + "GContact.getElementValue" +
                    StringBundle.getStr("errorEnd");
            return arr[i].getAttribute(aElement.attribute);
          case gdata.contacts.types.UNTYPED:
            if (arr[i].childNodes[0])
              return arr[i].childNodes[0].nodeValue;
            return null;
          default:
            LOGGER.LOG_WARNING(
              StringBundle.getStr("error") + "aElement.contactType" +
              StringBundle.getStr("suppliedTo") + "GContact.getElementValue" +
              StringBundle.getStr("errorEnd"));
        }
      }
    }
  },
  /**
   * GContact.setOrg
   * Google's contacts schema puts the organization name and job title in a
   * separate element, so this function handles those two attributes separately.
   * @param aElement The GElement object with a tag name of "orgName" or
   *                 "orgTitle"
   * @param aValue   The value to set.  Null if the XML Element should be
   *                 removed.
   */
  setOrg: function(aElement, aValue) {
    var tagName = aElement ? aElement.tagName : null;
    if (tagName != "orgName" && tagName != "orgTitle")
      throw StringBundle.getStr("error") + "aElement" +
            StringBundle.getStr("suppliedTo") + "GContact setOrg" +
            StringBundle.getStr("errorEnd");

    var organization = this.xml.getElementsByTagNameNS(gdata.namespaces.GD.url,
                                                       "organization")[0];
    var thisElem = this.mCurrentElement;
    if (thisElem) {
      // if there is an existing value that should be updated, do so
      if (aValue)
        this.mCurrentElement.childNodes[0].nodeValue = aValue;
      // else the element should be removed, first see if the organization
      // should also be removed
      else {
        var otherTagName = tagName == "orgName" ? "orgTitle" : "orgName";
        var other = this.xml.getElementsByTagNameNS(aElement.namespace.url,
                                                    otherTagName)[0];

        if (!other)
          this.xml.removeChild(organization);
        else if (organization)
          organization.removeChild(thisElem);
        else
          {} // XXX fix
      }
      return;
    }
    // if it gets here, the node must be added, so add <organization> if necessary
    if (!organization) {
      organization = document.createElementNS(gdata.namespaces.GD.url,
                                              "organization");
      organization.setAttribute("rel", gdata.contacts.rel + "#other");
      this.xml.appendChild(organization);
    }

    var elem = document.createElementNS(aElement.namespace.url,
                                        aElement.tagName);
    var text = document.createTextNode(aValue);
    elem.appendChild(text);

    organization.appendChild(elem);
  },
  // removeElements MUST be called after all elements are set
  // needs to be given the encoded value...
  setElementValue: function(aElement, aIndex, aType, aValue) {
    // get the current element (as this.mCurrentElement) and it's value (returned)
    var value = this.getElementValue(aElement, aIndex, aType);
    // if the current value is already good, return
    if (value == aValue)
      return;
    // orgName and orgTitle are special cases
    if (aElement.tagName == "orgTitle" || aElement.tagName == "orgName")
      return this.setOrg(aElement, aValue, value);
    
    // if the element should be removed
    if (!aValue && this.mCurrentElement) {
      LOGGER.VERBOSE_LOG("Will remove element");
      this.mElementsToRemove.push(this.mCurrentElement);
    }
    // otherwise set the value of the element
    else {
      switch (aElement.contactType) {
        case gdata.contacts.types.TYPED_WITH_CHILD:
          if (this.mCurrentElement && this.mCurrentElement.childNodes[0])
            this.mCurrentElement.childNodes[0].nodeValue = aValue;
          else {
            if (!aType)
              throw StringBundle.getStr("error") + "aType" +
                    StringBundle.getStr("suppliedTo") + "GContact.setElementValue" +
                    StringBundle.getStr("errorEnd");
            var elem = this.mCurrentElement ? this.mCurrentElement :
                                              document.createElementNS
                                                       (aElement.namespace.url,
                                                        aElement.tagName);
            elem.setAttribute("rel", gdata.contacts.rel + "#" + aType);
            var text = document.createTextNode(aValue);
            elem.appendChild(text);
            this.xml.appendChild(elem);
          }
          break;
        case gdata.contacts.types.TYPED_WITH_ATTR:
          if (this.mCurrentElement)
            this.mCurrentElement.setAttribute(aElement.attribute, aValue);
          else {
            var elem = document.createElementNS(aElement.namespace.url,
                                                aElement.tagName);
            if (aElement.tagName == "im") {
              elem.setAttribute("label", "CUSTOM");
              elem.setAttribute("protocol", gdata.contacts.rel + "#" + aType);
            }
            else
              elem.setAttribute("rel", gdata.contacts.rel + "#" + aType);
            elem.setAttribute(aElement.attribute, aValue);
            this.xml.appendChild(elem);
          }
          break;
        case gdata.contacts.types.UNTYPED:
          if (this.mCurrentElement && this.mCurrentElement.childNodes[0])
            this.mCurrentElement.childNodes[0].nodeValue = aValue;
          else {
            var elem = this.mCurrentElement ? this.mCurrentElement:
                                              document.createElementNS
                                                       (aElement.namespace.url,
                                                        aElement.tagName);
            var text = document.createTextNode(aValue);
            elem.appendChild(text);
            this.xml.appendChild(elem);
          }
          break;
        default:
          LOGGER.LOG_WARNING(
            StringBundle.getStr("error") + "aType" +
            StringBundle.getStr("suppliedTo") + "GContact.setElementValue" +
            StringBundle.getStr("errorEnd"));
      }
    }
  },
  /**
   * Gets the last modified date from an contacts's XML feed in milliseconds from 1970
   * @return The last modified date of the entry in milliseconds from 1970
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
      LOGGER.LOG_WARNING("Unable to get last modified date from a contact:\n" + e);
    }
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
  },
  /**
   * Returns the value of the XML Element with the supplied tag name at the
   * given index of the given type (home, work, other, etc.)
   * @param aName  The tag name of the value to get.  See gdata for valid tag
                   names.
   * @param aIndex Optional.  The index, if non-zero, of the value to get.
   * @param aType  The type of element to get if the tag name has different
   *               types (home, work, other, etc.).
   * @return The value.
   */
  getValue: function(aName, aIndex, aType) {
    try {
      // if the value to obtain is a link, get the value for the link
      if (gdata.contacts.links[aName]) {
        var arr = this.xml.getElementsByTagNameNS(gdata.namespaces.ATOM.url, "link");
        for (var i = 0, length = arr.length; i < length; i++)
          if (arr[i].getAttribute("rel") == gdata.contacts.links[aName])
            return arr[i].getAttribute("href");
      }
      else if (aName == "groupMembershipInfo")
        return this.getGroups();
      // otherwise, if it is a normal attribute, get it's value
      else if (gdata.contacts[aName])
        return this.decodeString(this.getElementValue(gdata.contacts[aName],
                                aIndex, aType));
      // if the name of the value to get is something else, throw an error
      else
        LOGGER.LOG_WARNING("Unable to getValue for " + aName);
    }
    catch(e) {
      LOGGER.LOG_WARNING("Error in GContact.getValue:\n" + e);
    }
  },
  /**
   * GContact.setValue
   * Sets the value with the name aName to the value aValue based on the type
   * and index.
   * @param aName  The tag name of the value to set.
   * @param aIndex The index of the element whose value is set.
   * @param aType  The type of the element (home, work, other, etc.).
   * @param aValue The value to set.  null if the element should be removed.
   */
  setValue: function(aName, aIndex, aType, aValue) {
    try {
      LOGGER.VERBOSE_LOG(aName + " - " + aIndex + " - " + aType + " - " + aValue);
      var value = null;
      if (aValue && aValue != "")
        value = this.encodeString(aValue);
      if (gdata.contacts[aName] && aName != "groupMembershipInfo")
        return this.setElementValue(gdata.contacts[aName],
                                    aIndex, aType, value);
      // if the name of the value to get is something else, throw an error
      else
        LOGGER.LOG_WARNING("Unable to SetValue for " + aName + " - " + aValue);
    }
    catch(e) {
      LOGGER.LOG_WARNING("Error in GContact.setValue:\n" + e);
    }
  },
  /**
   * GContact.getGroups
   * Returns an array of the names of the groups to which this contact belongs.
   */
  getGroups: function() {
    var groupInfo = gdata.contacts.groupMembershipInfo;
    var arr = this.xml.getElementsByTagNameNS(groupInfo.namespace.url,
                                              groupInfo.tagName);
    var groups = {};
    for (var i = 0, length = arr.length; i < length; i++) {
      var id = arr[i].getAttribute("href");
      var group = Sync.mGroups[id];
      if (group)
        groups[id] = group;
      else
        LOGGER.LOG_WARNING("Unable to find group: " + id);
    }
    return groups;
  },
  clearGroups: function() {
    var groupInfo = gdata.contacts.groupMembershipInfo;
    var arr = this.xml.getElementsByTagNameNS(groupInfo.namespace.url,
                                              groupInfo.tagName);
    for (var i = 0, length = arr.length; i < length; i++) {
      try {
        this.xml.removeChild(arr[i]);
      }
      catch(e) {
        LOGGER.LOG_WARNING("Error while trying to clear groups: " + e + "\n" + arr[i]);
      }
    }
    this.mGroups = {};
  },
  /**
   * GContact.setGroups
   * Sets the groups of that this contact is in based on the name(s).  If a
   * group does not exist, makes it and adds the contact to it.
   * @param aGroups An array of the names of the groups to which the contact
   *                should belong.
   */
  setGroups: function(aGroups) {
    this.clearGroups(); // clear existing groups
    if (!aGroups)
      return;
    // check if the contact needs to be added to one or more groups
    for (var i = 0, length = aGroups.length; i < length; i++) {
      var id = aGroups[i];
      if (!id || !id.indexOf || id.indexOf("www.google.com/m8/feeds/groups") == -1)
        continue;
      this.addToGroup(id);
    }
  },
  /**
   * GContact.removeFromGroup
   * Removes the contact from the given group.
   * @param aGroup The group from which the contact should be removed.
   */
  removeFromGroup: function(aGroup) {
    if (!aGroup) {
      LOGGER.LOG_WARNING("Attempt to remove a contact from a non-existant group");
      return;
    }
    try {
      this.xml.removeChild(aGroup);
    }
    catch (e) {
      LOGGER.LOG_WARNING("Error while trying to remove a contact from a group: " + e);
    }
  },
  /**
   * GContact.addToGroup
   * Adds the contact to the given, existing, group.
   * @param aGroupURL The URL of an existing group to which the contact will be
   *                  added.
   */
  addToGroup: function(aGroupURL) {
    if (!aGroupURL) {
      LOGGER.LOG_WARNING("Attempt to add a contact to a non-existant group");
      return;
    }
    try {
      var ns = gdata.namespaces.GCONTACT;
      var group = document.createElementNS(ns.url,
                                           ns.prefix + "groupMembershipInfo");
      group.setAttribute("deleted", false);
      group.setAttribute("href", aGroupURL);
      this.xml.appendChild(group);
    }
    catch(e) {
      LOGGER.LOG_WARNING("Error while trying to add a contact to a group: " + e);
    }
  },
  /**
   * GContact.isMatch
   * Returns true if the given XML Element is a match for the GElement object
   * and the type (ie home, work, other, etc.)
   * @param aElement The GElement object (@see GElement.js)
   * @param aXmlElem The XML Element to check
   * @param aType    The type (home, work, other, etc.)
   */
  isMatch: function(aElement, aXmlElem, aType) {
    if (aElement.contactType == gdata.contacts.types.UNTYPED)
      return true;
    switch (aElement.tagName) {
      case "email": // always return true for e-mail
        return true;
      case "im":
        var str = aXmlElem.getAttribute("protocol");
        break;
      default:
        var str = aXmlElem.getAttribute("rel");
    }
    if (!str)
      return false;
    // get only the very end
    var str = str.substring(str.length - aType.length);
    return str == aType; // return true if the end is equal to aType
  },
  /**
   * Encodes a string replacing invalid characters.
   * @param str The string to encode
   */
  encodeString: function(str) {
    if (str && str.replace)
  	  return str.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")
  	           .replace(">", "&gt;").replace("'", "&apos;");
  	return "";
  },
  /**
   * Decodes a string, replacing the representation of characters to the actual
   * characters themselves.
   * @param str The string to decode
   */
  decodeString: function(str) {
  	if (str && str.replace)
  	  return str.replace("&amp;", "&").replace("&quot;", '"').replace("&lt;", "<")
  	            .replace("&gt;", ">").replace("&apos;", "'");
    return "";
  }
};
