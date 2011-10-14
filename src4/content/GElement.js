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
 * A simple class for storing information about how Google represents a contact
 * in XML.
 * @param aType       {string} The "type" of contact, as found in gdata.types.
 * @param aTagName    {string} The tag name of the element.
 * @param aNamespace  {Namespace} The Namespace object that contains the
 *                                element.
 * @param aValidTypes {array} The different types allowed, as an array, for
 *                            example, ["home", "work", "other"]
 * @param aAttribute  {string} The attribute, if any, in which the value of the
 *                             element is stored.  If not present, then it is
 *                             assumed that the value is stored as the child
 *                             node.
 * @constructor
 * @class
 */
com.gContactSync.GElement = function gCS_GElement(aType, aTagName, aNamespace, aValidTypes, aAttribute) {
  this.contactType = aType;
  this.tagName     = aTagName;
  this.namespace = aNamespace;
  switch (aType) {
  case com.gContactSync.gdata.contacts.types.TYPED_WITH_ATTR:
    this.attribute = aAttribute;
  // fall through
  case com.gContactSync.gdata.contacts.types.TYPED_WITH_CHILD:
    this.types = aValidTypes;
    break;
  }  
};
