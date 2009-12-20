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

if (!com) var com = {}; // A generic wrapper variable
// A wrapper for all GCS functions and variables
if (!com.gContactSync) com.gContactSync = {};

/**
 * Makes a new GContact object that has functions to get and set various values
 * for a Google Contact's Atom/XML representation.  If the parameter aXml is not
 * supplied, this constructor will make a new contact.
 * @param aXml Optional.  The Atom/XML representation of this contact.  If not
 *             supplied, will make a new contact.
 * @class
 * @constructor
 */
com.gContactSync.GContact = function gCS_GContact(aXml) {
  // if the contact exists, check its IM addresses
  if (aXml) {
    this.xml = aXml;
    this.checkIMAddress(); // check for invalid IM addresses
  }
  // otherwise, make a new contact
  else {
    this.mIsNew  = true;
    var atom     = com.gContactSync.gdata.namespaces.ATOM,
        gd       = com.gContactSync.gdata.namespaces.GD,
        xml      = document.createElementNS(atom.url, atom.prefix + "entry"),
        category = document.createElementNS(atom.url, atom.prefix + "category");
    category.setAttribute("scheme", gd.url + "#kind");
    category.setAttribute("term", gd.url + "#contact");
    xml.appendChild(category);
    this.xml = xml;
  }
};

com.gContactSync.GContact.prototype = {
  /** The current element being modified or returned (internal use only) */
  mCurrentElement:   null,
  /** The groups that this contact is in */
  mGroups:           {},
  /**
   * Checks for an invalid IM address as explained here:
   * http://pi3141.wordpress.com/2008/07/30/update-2/
   */
  checkIMAddress: function GContact_checkIMAddress() {
    var element = {},
        ns      = com.gContactSync.gdata.namespaces.GD.url,
        arr     = this.xml.getElementsByTagNameNS(ns, "im"),
        i       = 0,
        length  = arr.length,
        address;
    for (; i < length; i++) {
      address = arr[i].getAttribute("address");
      if (address && address.indexOf(": ") !== -1)
        arr[i].setAttribute("address", address.replace(": ", ""));
    }
  },
  /**
   * Gets the name and e-mail address of a contact from it's Atom
   * representation.
   */
  getName: function GContact_getName() {
    var contactName = "",
        titleElem   = this.xml.getElementsByTagName('title')[0],
        emailElem;
    try {
      if (titleElem && titleElem.childNodes[0]) {
        contactName = titleElem.childNodes[0].nodeValue;
      }
      emailElem = this.xml.getElementsByTagNameNS(com.gContactSync.gdata.namespaces.GD.url,
                                                      "email")[0];
      if (emailElem && emailElem.getAttribute) {
        if (contactName !== "")
          contactName += " - ";
        contactName += this.xml
                           .getElementsByTagNameNS(com.gContactSync.gdata.namespaces.GD.url,
                                                   "email")[0].getAttribute("address");
      }
    }
    catch (e) {
      com.gContactSync.LOGGER.LOG_WARNING("Unable to get the name or e-mail address of a contact", e);
    }
    return contactName;
  },
  /**
   * Returns the value of an element with a type where the value is in the
   * value of the child node.
   * @param aElement {GElement} The GElement object with information about the
   *                            value to get.
   * @param aIndex   {int} The index of the value (ie 0 for primary email, 1 for
   *                       second...).  Set to 0 if not supplied.
   * @param aType    {string} The type, if the element can have types.
   * @returns {Property} A new Property object with the value of the element, if
   *                    found.  The type of the Property will be aType.
   */
  getElementValue: function GContact_getElementValue(aElement, aIndex, aType) {
    if (!aIndex)
      aIndex = 0;
    this.mCurrentElement = null;
    var arr = this.xml.getElementsByTagNameNS(aElement.namespace.url,
                                              aElement.tagName),
        counter = 0,
        i       = 0,
        length  = arr.length,
        type;
    // iterate through each of the elements that match the tag name
    for (; i < length; i++) {
      // if the current element matches the type (true if there isn't a type)...
      if (this.isMatch(aElement, arr[i], aType)) {
        // some properties, like e-mail, can have multiple elements in Google,
        // so if this isn't the right one, go to the next element
        if (counter !== aIndex) {
          counter++;
          continue;
        }
        this.mCurrentElement = arr[i];
        // otherwise there is a match and it should be returned
        // get the contact's "type" as defined in gdata and return the attribute's
        // value based on where the value is actually stored in the element
        switch (aElement.contactType) {
        case com.gContactSync.gdata.contacts.types.TYPED_WITH_CHILD:
          if (arr[i].childNodes[0]) {
            type = arr[i].getAttribute("rel");
            if (!type)
              type = arr[i].getAttribute("label");
            if (type)
              type = type.substring(type.indexOf("#") + 1);
            return new com.gContactSync.Property(arr[i].childNodes[0].nodeValue,
                                                 type);
          }
          return null;
        case com.gContactSync.gdata.contacts.types.TYPED_WITH_ATTR:
          if (!aElement.attribute)
            com.gContactSync.LOGGER.LOG_WARNING("Error - invalid element passed to the " +
                               "getElementValue method." +
                               com.gContactSync.StringBundle.getStr("pleaseReport"));
          else {
            if (aElement.tagName == "im")
              type = arr[i].getAttribute("protocol");
            else {
              type = arr[i].getAttribute("rel");
              if (!type)
                type = arr[i].getAttribute("label");
            }
            type = type.substring(type.indexOf("#") + 1);
            return new com.gContactSync.Property(arr[i].getAttribute(aElement.attribute),
                                                 type);
          }
        // fall through
        case com.gContactSync.gdata.contacts.types.UNTYPED:
        case com.gContactSync.gdata.contacts.types.PARENT_TYPED:
          if (aElement.tagName === "birthday")
            return new com.gContactSync.Property(arr[i].getAttribute("when"));
          if (arr[i].childNodes[0])
            return new com.gContactSync.Property(arr[i].childNodes[0].nodeValue);
          return null;
        default:
          com.gContactSync.LOGGER.LOG_WARNING("Error - invalid contact type passed to the " +
                                              "getElementValue method." +
                                              com.gContactSync.StringBundle.getStr("pleaseReport"));
          return null;
        }
      }
    }
    return null;
  },
  /**
   * Google's contacts schema puts the organization name and job title in a
   * separate element, so this function handles those two attributes separately.
   * @param aElement {GElement} The GElement object with a valid org tag name
   *                            (orgDepartment, orgJobDescription, orgName,
   *                             orgSymbol, or orgTitle)
   * @param aValue  {string}    The value to set.  Null if the XML Element
   *                            should be removed.
   */
  setOrg: function GContact_setOrg(aElement, aValue) {
    var tagName      = aElement ? aElement.tagName : null,
        organization = this.xml.getElementsByTagNameNS(com.gContactSync.gdata.namespaces.GD.url,
                                                       "organization")[0],
        thisElem     = this.mCurrentElement;
    if (!tagName || !com.gContactSync.gdata.contacts.isOrgTag(tagName))
      return null;

    if (thisElem) {
      // if there is an existing value that should be updated, do so
      if (aValue)
        this.mCurrentElement.childNodes[0].nodeValue = aValue;
      // else the element should be removed
      else {
        thisElem.parentNode.removeChild(thisElem);
        // If the org elem is empty remove it
        if (!organization.childNodes.length) {
          organization.parentNode.removeChild(organization);
        }
      }
      return true;
    }
    // if it gets here, the node must be added, so add <organization> if necessary
    if (!organization) {
      organization = document.createElementNS(com.gContactSync.gdata.namespaces.GD.url,
                                              "organization");
      organization.setAttribute("rel", com.gContactSync.gdata.contacts.rel + "#other");
      this.xml.appendChild(organization);
    }
    var elem = document.createElementNS(aElement.namespace.url,
                                        aElement.tagName),
        text = document.createTextNode(aValue);
    elem.appendChild(text);

    organization.appendChild(elem);
    return true;
  },
  /**
   * Google's contacts schema puts several components of a name into a
   * separate element, so this function handles those attributes separately.
   * @param aElement {GElement} The GElement object with a valid gd:name tag
   *                           (givenName, additionalName, familyName,
   *                            namePrefix, nameSuffix, or fullName).
   * @param aValue   {string}  The value to set.  Null if the XML Element should
   *                           be removed.
   */
  setName: function GContact_setName(aElement, aValue) {
    var tagName  = aElement ? aElement.tagName : null,
        name     = this.xml.getElementsByTagNameNS(com.gContactSync.gdata.namespaces.GD.url,
                                                       "name")[0],
        thisElem = this.mCurrentElement;
    if (!tagName || !com.gContactSync.gdata.contacts.isNameTag(tagName))
      return null;

    if (thisElem) {
      // if there is an existing value that should be updated, do so
      if (aValue)
        this.mCurrentElement.childNodes[0].nodeValue = aValue;
      // else the element should be removed
      else {
        thisElem.parentNode.removeChild(thisElem);
        // If the org elem is empty remove it
        if (!name.childNodes.length)
          name.parentNode.removeChild(name);
      }
      return true;
    }
    // if it gets here, the node must be added, so add <name> if necessary
    if (!name) {
      name = document.createElementNS(com.gContactSync.gdata.namespaces.GD.url,
                                      "name");
      this.xml.appendChild(name);
    }
    var elem = document.createElementNS(aElement.namespace.url,
                                        aElement.tagName),
        text = document.createTextNode(aValue);
    elem.appendChild(text);

    name.appendChild(elem);    
    return true;
  },
  /**
   * Google's contacts schema puts several components of an address into a
   * separate element, so this function handles those attributes separately.
   * @param aElement {GElement} The GElement object with a valid
   *                            gd:structuredPostalAddress tag name
   * @param aValue   {string}   The value to set.  Null if the XML Element
   *                            should be removed.
   * @param aType    {string}   The 'type' of address (home, work, or other)
   * @param aIndex   {int}      The index of the address (0 for the first, 1 for
   *                            the second, etc)
   */
  setAddress: function GContact_setAddress(aElement, aValue, aType, aIndex) {
    var tagName   = aElement ? aElement.tagName : null,
        addresses = this.xml.getElementsByTagNameNS(com.gContactSync.gdata.namespaces.GD.url,
                                                    "structuredPostalAddress"),
        address   = null,
        thisElem,
        i         = 0;
    if (!tagName || !com.gContactSync.gdata.contacts.isAddressTag(tagName))
      return null;

    for (; i < addresses.length; i++) {
      if (addresses[i].getAttribute("rel").indexOf(aType) !== -1)
        address = addresses[i];
    }
    // TODO how will this work w/ multiple addresses...
    this.getElementValue(aElement, (aIndex ? aIndex : 0), aType);
    thisElem = this.mCurrentElement;
    com.gContactSync.LOGGER.VERBOSE_LOG("  - Setting address..." + address + " " + aValue + " " + aType + " " + thisElem);
    if (thisElem && address) {
      // if there is an existing value that should be updated, do so
      if (aValue) {
        // If a formatted address exists and we are updating the postal address
        // then remove the old formatted address so Google can update it based on
        // the new structured data
        // http://groups.google.com/group/google-contacts-api/browse_thread/thread/ea623b18efb16963?hl=en&pli=1
        for (i = 0; i < thisElem.parentNode.childNodes.length; i++) {
          var node = thisElem.parentNode.childNodes[i];
          if (node && node.tagName === "gd:formattedAddress") {
            com.gContactSync.LOGGER.VERBOSE_LOG("Removing formatted address: " + node.childNodes[0].nodeValue);
            node.parentNode.removeChild(node);
            break;
          }
        }
        this.mCurrentElement.childNodes[0].nodeValue = aValue;
      }
      // else the element should be removed
      else {
        thisElem.parentNode.removeChild(thisElem);
        // If the elem is empty remove it
        if (!address.childNodes.length)
          address.parentNode.removeChild(address);
      }
      return true;
    }
    if (!aValue)
      return true;
    // if it gets here, the node must be added, so add <structuredPostalAddress> if necessary
    if (!address) {
      address = document.createElementNS(com.gContactSync.gdata.namespaces.GD.url,
                                              "structuredPostalAddress");
      address.setAttribute("rel", "http://schemas.google.com/g/2005#" + aType);
      this.xml.appendChild(address);
    }
    var elem = document.createElementNS(aElement.namespace.url,
                                        aElement.tagName);
    var text = document.createTextNode(aValue);
    elem.appendChild(text);

    address.appendChild(elem);    
    return true;
  },  
  /**
   * Sets the value of the specified element.
   * @param aElement {GElement} The GElement object with information about the
   *                            value to get.
   * @param aIndex  {int}  The index of the value (ie 0 for primary email, 1 for
   *                       second...).  Set to 0 if not supplied.
   * @param aType    {string} The type, if the element can have types.
   * @param aValue   {string} The value to set for the element.
   */
  setElementValue: function GContact_setElementValue(aElement, aIndex, aType, aValue) {
    // Postal addresses are different...
    if (com.gContactSync.gdata.contacts.isAddressTag(aElement.tagName))
      return this.setAddress(aElement, aValue, aType, aIndex);
    // get the current element (as this.mCurrentElement) and it's value (returned)
    var property = this.getElementValue(aElement, aIndex, aType);
    property = property ? property : new com.gContactSync.Property(null, null);
    var value = property.value;
    // if the current value is already good, check the type and return
    if (value == aValue) {
      if (value && property.type != aType) {
        com.gContactSync.LOGGER.VERBOSE_LOG("Value is already good, changing type to: " + aType);
        if (aElement.tagName == "im")
          this.mCurrentElement.setAttribute("protocol", com.gContactSync.gdata.contacts.rel + "#" + aType);
        else if (aElement.tagName == "relation") {
          if (com.gContactSync.gdata.contacts.RELATION_TYPES[aType])
            this.mCurrentElement.setAttribute("rel", aType);
          else
            this.mCurrentElement.setAttribute("label", aType);
        }
        else if (aElement.tagName == "website")
          this.mCurrentElement.setAttribute("rel", aType);
        else
          this.mCurrentElement.setAttribute("rel", com.gContactSync.gdata.contacts.rel + "#" + aType);
      }
      else if (value)
        com.gContactSync.LOGGER.VERBOSE_LOG("   - value " + value + " and type " + property.type + " are good");
      return null;
    }
    // organization tags are special cases
    if (com.gContactSync.gdata.contacts.isOrgTag(aElement.tagName))
      return this.setOrg(aElement, aValue);
    // name tags are as well
    if (com.gContactSync.gdata.contacts.isNameTag(aElement.tagName))
      return this.setName(aElement, aValue);

    // if the element should be removed
    if (!aValue && this.mCurrentElement) {
      try { this.mCurrentElement.parentNode.removeChild(this.mCurrentElement); }
      catch (e) {
        com.gContactSync.LOGGER.LOG_WARNING("Error while removing element: " + e + "\n" +
                                            this.mCurrentElement);
      }
      this.mCurrentElement = null;
    }
    // otherwise set the value of the element
    else {
      switch (aElement.contactType) {
        case com.gContactSync.gdata.contacts.types.TYPED_WITH_CHILD:
          if (this.mCurrentElement && this.mCurrentElement.childNodes[0])
            this.mCurrentElement.childNodes[0].nodeValue = aValue;
          else {
            if (!aType) {
              com.gContactSync.LOGGER.LOG_WARNING("Invalid aType supplied to the 'setElementValue' "
                                 + "method." + com.gContactSync.StringBundle.getStr("pleaseReport"));
              return null;
            }
            var elem = this.mCurrentElement ? this.mCurrentElement :
                                              document.createElementNS
                                                       (aElement.namespace.url,
                                                        aElement.tagName);
            if (elem.tagName == "relation") {
              if (com.gContactSync.gdata.contacts.RELATION_TYPES[aType])
                elem.setAttribute("rel", aType);
              else
                elem.setAttribute("label", aType);
            }
            else
              elem.setAttribute("rel", com.gContactSync.gdata.contacts.rel + "#" + aType);
            var text = document.createTextNode(aValue);
            elem.appendChild(text);
            this.xml.appendChild(elem);
          }
          break;
        case com.gContactSync.gdata.contacts.types.TYPED_WITH_ATTR:
          if (this.mCurrentElement)
            this.mCurrentElement.setAttribute(aElement.attribute, aValue);
          else {
            var elem = document.createElementNS(aElement.namespace.url,
                                                aElement.tagName);
            if (aElement.tagName == "im") {
              elem.setAttribute("label", "CUSTOM");
              elem.setAttribute("protocol", com.gContactSync.gdata.contacts.rel + "#" + aType);
            }
            else if (elem.tagName == "website")
              elem.setAttribute("rel", aType);
            else
              elem.setAttribute("rel", com.gContactSync.gdata.contacts.rel + "#" + aType);
            elem.setAttribute(aElement.attribute, aValue);
            this.xml.appendChild(elem);
          }
          break;
        case com.gContactSync.gdata.contacts.types.UNTYPED:
        case com.gContactSync.gdata.contacts.types.PARENT_TYPED:
          if (aElement.tagName == "birthday") {
            // make sure the value at least has two -s
            // valid formats: YYYY-M-D and --M-D
            if (aValue.split("-").length < 3) {
              com.gContactSync.LOGGER.LOG_WARNING("Detected an invalid birthday: " + aValue);
              return null;
            }
            var elem = this.mCurrentElement ? this.mCurrentElement:
                                              document.createElementNS
                                                       (aElement.namespace.url,
                                                        aElement.tagName);
            elem.setAttribute("when", aValue);
            // add the element to the XML feed if it is new
            if (elem != this.mCurrentElement)
              this.xml.appendChild(elem);
            return true;
          }
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
          com.gContactSync.LOGGER.LOG_WARNING("Invalid aType parameter sent to the setElementValue"
                             + "method" + com.gContactSync.StringBundle.getStr("pleaseReport"));
          return null;
      }
    }
    return true;
  },
  /**
   * Gets the last modified date from an contacts's XML feed in milliseconds
   * since 1970.
   * @returns {int} The last modified date of the entry in milliseconds from 1970
   */
  getLastModifiedDate: function GContact_getLastModifiedDate() {
    try {
      if (com.gContactSync.Preferences.mSyncPrefs.writeOnly.value) {
        return 0;
      }
      var sModified = this.xml.getElementsByTagName('updated')[0].childNodes[0].nodeValue,
          year      = sModified.substring(0,4),
          month     = sModified.substring(5,7),
          day       = sModified.substring(8,10),
          hrs       = sModified.substring(11,13),
          mins      = sModified.substring(14,16),
          sec       = sModified.substring(17,19),
          ms        = sModified.substring(20,23);
      return parseInt(Date.UTC(year, parseInt(month, 10) - 1, day, hrs, mins, sec, ms));
    }
    catch(e) {
      com.gContactSync.LOGGER.LOG_WARNING("Unable to get last modified date from a contact:\n" + e);
    }
    return 0;
  },
  /**
   * Removes all extended properties from this contact.
   */
  removeExtendedProperties: function GContact_removeExtendedProperties() {
    var arr = this.xml.getElementsByTagNameNS(com.gContactSync.gdata.namespaces.GD.url, "extendedProperty");
    for (var i = arr.length - 1; i > -1 ; i--) {
      arr[i].parentNode.removeChild(arr[i]);
    }
  },
  /**
   * Returns the value of the extended property with a matching name attribute.
   * @param aName {string} The name of the extended property to return.
   * @returns {Property} A Property object with the value of the extended
   *                    property with the name attribute aName.
   */
  getExtendedProperty: function GContact_getExtendedProperty(aName) {
    var arr = this.xml.getElementsByTagNameNS(com.gContactSync.gdata.namespaces.GD.url, "extendedProperty");
    for (var i = 0, length = arr.length; i < length; i++)
      if (arr[i].getAttribute("name") == aName)
        return new com.gContactSync.Property(arr[i].getAttribute("value"));
    return null;
  },
  /**
   * Sets an extended property with the given name and value if there are less
   * than 10 existing.  Logs a warning if there are already 10 or more.
   * @param aName  {string} The name of the property.
   * @param aValue {string} The value of the property.
   */
  setExtendedProperty: function GContact_setExtendedProperty(aName, aValue) {
    if (this.xml.getElementsByTagNameNS(com.gContactSync.gdata.namespaces.GD.url,
        "extendedProperty").length >= 10) {
      com.gContactSync.LOGGER.LOG_WARNING("Attempt to add too many properties aborted");
      return null;
    }
    if (aValue && aValue != "") {
      var property = document.createElementNS(com.gContactSync.gdata.namespaces.GD.url,
                                              "extendedProperty");
      property.setAttribute("name", aName);
      property.setAttribute("value", aValue);
      this.xml.appendChild(property);
      return true;
    }
    return null;
  },
  /**
   * Returns the value of the XML Element with the supplied tag name at the
   * given index of the given type (home, work, other, etc.)
   * @param aName  {string} The tag name of the value to get.  See gdata for
                            valid tag names.
   * @param aIndex {int} Optional.  The index, if non-zero, of the value to get.
   * @param aType  {string} The type of element to get if the tag name has
   *                        different types (home, work, other, etc.).
   * @returns {Property} A new Property object with the value and type, if
   *                    applicable.
   *                    If aName is groupMembership info, returns an array of
   *                    the group IDs
   */
  getValue: function GContact_getValue(aName, aIndex, aType) {
    // TODO uncomment
    //try {
      // if the value to obtain is a link, get the value for the link
      if (com.gContactSync.gdata.contacts.links[aName]) {
        var arr = this.xml.getElementsByTagNameNS(com.gContactSync.gdata.namespaces.ATOM.url, "link");
        for (var i = 0, length = arr.length; i < length; i++)
          if (arr[i].getAttribute("rel") == com.gContactSync.gdata.contacts.links[aName])
            return new com.gContactSync.Property(arr[i].getAttribute("href"));
      }
      else if (aName == "groupMembershipInfo")
        return this.getGroups();
      // otherwise, if it is a normal attribute, get it's value
      else if (com.gContactSync.gdata.contacts[aName])
        return this.getElementValue(com.gContactSync.gdata.contacts[aName], aIndex, aType);
      // if the name of the value to get is something else, throw an error
      else
        com.gContactSync.LOGGER.LOG_WARNING("Unable to getValue for " + aName);
    //}
    //catch(e) {
    //  com.gContactSync.LOGGER.LOG_WARNING("Error in GContact.getValue:\n" + e);
    //}
    return null;
  },
  /**
   * Sets the value with the name aName to the value aValue based on the type
   * and index.
   * @param aName  {string} The tag name of the value to set.
   * @param aIndex {int}    The index of the element whose value is set.
   * @param aType  {string} The type of the element (home, work, other, etc.).
   * @param aValue {string} The value to set.  null if the element should be
   *                        removed.
   */
  setValue: function GContact_setValue(aName, aIndex, aType, aValue) {
    try {
      if (aValue == "")
        aValue = null;
      if (aType == "Home" || aType == "Work" || aType == "Other") {
        com.gContactSync.LOGGER.LOG_WARNING("Found and fixed an invalid type: " + aType);
        aType = aType.toLowerCase();
      }
      com.gContactSync.LOGGER.VERBOSE_LOG("   - " + aName + " - " + aIndex + " - " + aType + " - " + aValue);
      if (com.gContactSync.gdata.contacts[aName] && aName != "groupMembershipInfo")
        return this.setElementValue(com.gContactSync.gdata.contacts[aName],
                                    aIndex, aType, aValue);
      // if the name of the value to get is something else, throw an error
      else
        com.gContactSync.LOGGER.LOG_WARNING("Unable to setValue for " + aName + " - " + aValue);
    }
    catch(e) {
      com.gContactSync.LOGGER.LOG_WARNING("Error in GContact.setValue:\n" + e);
    }
    return null;
  },
  /**
   * Returns an array of the names of the groups to which this contact belongs.
   */
  getGroups: function GContact_getGroups() {
    var groupInfo = com.gContactSync.gdata.contacts.groupMembershipInfo;
    var arr = this.xml.getElementsByTagNameNS(groupInfo.namespace.url,
                                              groupInfo.tagName);
    var groups = {};
    // iterate through each group and add the group as a new property of the
    // groups object with the ID as the name of the property.
    for (var i = 0, length = arr.length; i < length; i++) {
      var id = arr[i].getAttribute("href");
      var group = com.gContactSync.Sync.mGroups[id];
      if (group)
        groups[id] = group;
      else {
        if (com.gContactSync.Preferences.mSyncPrefs.myContacts)
          groups[id] = true;
        else
          com.gContactSync.LOGGER.LOG_WARNING("Unable to find group: " + id);
      }
    }
    // return the object with the groups this contact belongs to
    return groups;
  },
  /**
   * Removes all groups from this contact.
   */
  clearGroups: function GContact_clearGroups() {
    var groupInfo = com.gContactSync.gdata.contacts.groupMembershipInfo;
    var arr = this.xml.getElementsByTagNameNS(groupInfo.namespace.url,
                                              groupInfo.tagName);
    // iterate through every group element and remove it from the XML
    for (var i = 0; i < arr.length; i++) {
      try {
        if (arr[i]) {
          arr[i].parentNode.removeChild(arr[i]);
        }
      }
      catch(e) {
        com.gContactSync.LOGGER.LOG_WARNING("Error while trying to clear group: " + arr[i], e);
      }
    }
    this.mGroups = {};
  },
  /**
   * Sets the groups of that this contact is in based on the array of IDs.
   * @param aGroups {array} An array of the IDs of the groups to which the
   *                        contact should belong.
   */
  setGroups: function GContact_setGroups(aGroups) {
    this.clearGroups(); // clear existing groups
    if (!aGroups)
      return null;
    // make sure the group 
    for (var i = 0, length = aGroups.length; i < length; i++) {
      var id = aGroups[i];
      // if the ID isn't valid log a warning and go to the next ID
      if (!id || !id.indexOf || id.indexOf("www.google.com/m8/feeds/groups") == -1) {
        com.gContactSync.LOGGER.LOG_WARNING("Invalid id in aGroups: " + id);
        continue;
      }
      this.addToGroup(id);
    }
    return true;
  },
  /**
   * Removes the contact from the given group element.
   * @param aGroup {Group} The group from which the contact should be removed.
   */
  removeFromGroup: function GContact_removeFromGroup(aGroup) {
    if (!aGroup) {
      com.gContactSync.LOGGER.LOG_WARNING("Attempt to remove a contact from a non-existant group");
      return null;
    }
    try {
      aGroup.parentNode.removeChild(aGroup);
      return true;
    }
    catch (e) {
      com.gContactSync.LOGGER.LOG_WARNING("Error while trying to remove a contact from a group: " + e);
    }
    return null;
  },
  /**
   * Adds the contact to the given, existing, group.
   * @param aGroupURL {string} The URL of an existing group to which the contact
   *                           will be added.
   */
  addToGroup: function GContact_addToGroup(aGroupURL) {
    if (!aGroupURL) {
      com.gContactSync.LOGGER.LOG_WARNING("Attempt to add a contact to a non-existant group");
      return null;
    }
    try {
      var ns = com.gContactSync.gdata.namespaces.GCONTACT;
      var group = document.createElementNS(ns.url,
                                           ns.prefix + "groupMembershipInfo");
      group.setAttribute("deleted", false);
      group.setAttribute("href", aGroupURL);
      this.xml.appendChild(group);
      return true;
    }
    catch(e) {
      com.gContactSync.LOGGER.LOG_WARNING("Error while trying to add a contact to a group: " + e);
    }
    return null;
  },
  /**
   * Returns true if the given XML Element is a match for the GElement object
   * and the type (ie home, work, other, etc.)
   * @param aElement {GElement}    The GElement object (@see GElement.js)
   * @param aXmlElem {XML Element} The XML Element to check
   * @param aType    {string}      The type (home, work, other, etc.)
   */
  isMatch: function GContact_isMatch(aElement, aXmlElem, aType, aDontSkip) {
    if (aElement.contactType === com.gContactSync.gdata.contacts.types.UNTYPED)
      return true;
    // if the parent contains the type then get the XML element's parent
    else if (aElement.contactType === com.gContactSync.gdata.contacts.types.PARENT_TYPED)
      aXmlElem = aXmlElem.parentNode;
    // If this is a phone number, check the phoneTypes pref
    // If the pref is true, then always say that this is a match
    // If the pref is false, continue with the normal type check
    if (aElement.tagName === "phoneNumber" &&
        com.gContactSync.Preferences.mSyncPrefs.phoneTypes.value) {
      return true;
    }
    switch (aElement.tagName) {
      case "email":
      case "website": // TODO - should this be typed?
      case "relation":
        if (!aDontSkip) // always return true for e-mail by default
          return true;
      case "im":
        if (!aDontSkip) // always return true for e-mail by default
          return true;
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
   * Returns the last portion of this contact's ID
   * @returns {string} The ID of this contact.
   */
  getID: function GContact_getID() {
    var val   = this.getValue("id").value;
    var index = val.lastIndexOf("/");
    return val.substr(index + 1);
  },
  /**
   * Returns an object with information about this contact's photo.
   * @returns An object containing the following properties:
   *  - url - The URL of the contact's photo
   *  - type - The type of photo (ex "image/*")
   *  - etag - The etag of the photo.
   * If there was no photo found (no etag) then this function returns null
   */
  getPhotoInfo: function GContact_hasPhoto() {
    // Sample photo XML:
    // <link rel='http://schemas.google.com/contacts/2008/rel#photo' type='image/*'
    //  href='http://google.com/m8/feeds/photos/media/liz%40gmail.com/c9012de'
    // gd:etag='"KTlcZWs1bCp7ImBBPV43VUV4LXEZCXERZAc."'/>
    var arr = this.xml.getElementsByTagNameNS(com.gContactSync.gdata.namespaces.ATOM.url, "link");
    var elem, etag;
    for (var i = 0, length = arr.length; i < length; i++) {
      elem = arr[i];
      if (elem.getAttribute("rel") == com.gContactSync.gdata.contacts.links["PhotoURL"]) {
        etag = elem.getAttributeNS(com.gContactSync.gdata.namespaces.GD.url, "etag");
        if (etag) {
          return {
            url:  elem.getAttribute("href"),
            type: elem.getAttribute("type"),
            etag: etag
          }
        }
      }
    }
    return null;
  },
  /**
   * Fetches and saves a local copy of this contact's photo, if present.
   * NOTE: Portions of this code are from Thunderbird written by me (Josh Geenen)
   * See https://bugzilla.mozilla.org/show_bug.cgi?id=119459
   * NOTE 2: This method sets a timeout before the image stream is written to
   * the disk but still returns an nsIFile where the image will be written.
   * @param aAuthToken {string} The authentication token for the account to
   *                            which this contact belongs.
   */
  writePhoto: function GContact_writePhoto(aAuthToken) {
    com.gContactSync.LOGGER.VERBOSE_LOG(" * Checking for a contact photo");
    if (!aAuthToken) {
      com.gContactSync.LOGGER.LOG_WARNING("No auth token passed to GContact.writePhoto");
      return null;
    }
    var info = this.getPhotoInfo();
    if (!info) {
      com.gContactSync.LOGGER.VERBOSE_LOG(" * This contact does not have a photo");
      return null;
    }
    // Get the profile directory
    var file = Components.classes["@mozilla.org/file/directory_service;1"]
                         .getService(Components.interfaces.nsIProperties)
                         .get("ProfD", Components.interfaces.nsIFile);
    // Get (or make) the Photos directory
    file.append("Photos");
    if (!file.exists() || !file.isDirectory())
      file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
    var ios = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService);
    var ch = ios.newChannel(info.url, null, null);
    ch.QueryInterface(Components.interfaces.nsIHttpChannel);
    ch.setRequestHeader("Authorization", aAuthToken, false);
    var istream = ch.open();
    // quit if the request failed
    if (!ch.requestSucceeded) {
      com.gContactSync.LOGGER.LOG_WARNING("The request to retrive the photo returned with a status ",
                         ch.responseStatus);
      return null;
    }

    // Create a name for the photo with the contact's ID and the photo extension
    var filename = this.getID();
    try {
      var ext = this.findPhotoExt(ch);
      filename = filename + (ext ? "." + ext : "");
    }
    catch (e) {
      com.gContactSync.LOGGER.LOG_WARNING("Couldn't find an extension for the photo");
    }
    file.append(filename);
    com.gContactSync.LOGGER.VERBOSE_LOG(" * Writing the photo to " + file.path);

    var output = Components.classes["@mozilla.org/network/file-output-stream;1"]
                           .createInstance(Components.interfaces.nsIFileOutputStream);

    // Now write that input stream to the file
    var fstream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"]
                            .createInstance(Components.interfaces.nsIFileOutputStream);
    var buffer = Components.classes["@mozilla.org/network/buffered-output-stream;1"]
                           .createInstance(Components.interfaces.nsIBufferedOutputStream);
    fstream.init(file, 0x04 | 0x08 | 0x20, 0600, 0); // write, create, truncate
    buffer.init(fstream, 8192);
    // A sleep is required here to allow istream time to get all the bytes ready
    // to be read (the number returned by istream.available)
    setTimeout(this.finishWritePhoto, 500, istream, fstream, buffer, this.getID());
    return file;
  },
  /**
   * Finishes writting the buffered output stream to the file from the input stream.
   * @param istream The input stream
   * @param fstream {nsIFileOutputStream} The file output stream
   * @param buffer {nsIBufferedOutputStream} The buffered output stream that
   *                                         has already been initialized.
   * @param name   {string} The filename of the photo (used for logging)
   */
  finishWritePhoto: function GContact_finishWritePhoto(istream, fstream, buffer, name) {
    buffer.writeFrom(istream, istream.available());

    // Close the output streams
    if (buffer instanceof Components.interfaces.nsISafeOutputStream)
        buffer.finish();
    else
        buffer.close();
    if (fstream instanceof Components.interfaces.nsISafeOutputStream)
        fstream.finish();
    else
        fstream.close();
    com.gContactSync.LOGGER.VERBOSE_LOG(" * Finished writing the photo " + name);
  },
  /**
   * NOTE: This function was originally from Thunderbird in abCardOverlay.js
   * Finds the file extension of the photo identified by the URI, if possible.
   * This function can be overridden (with a copy of the original) for URIs that
   * do not identify the extension or when the Content-Type response header is
   * either not set or isn't 'image/png', 'image/jpeg', or 'image/gif'.
   * The original function can be called if the URI does not match.
   *
   * @param aChannel {nsIHttpChannel} The opened channel for the URI.
   *
   * @return The extension of the file, if any, excluding the period.
   */
  findPhotoExt: function GContact_finishWritePhoto(aChannel) {
    var mimeSvc = Components.classes["@mozilla.org/mime;1"]
                            .getService(Components.interfaces.nsIMIMEService),
        ext = "",
        uri = aChannel.URI;
    if (uri instanceof Components.interfaces.nsIURL)
      ext = uri.fileExtension;
    try {
      return mimeSvc.getPrimaryExtension(aChannel.contentType, ext);
    } catch (e) {}
    return ext;
  }
};
