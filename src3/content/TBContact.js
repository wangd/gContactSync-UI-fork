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
 
/**
 * TBContact
 * Makes a new TBContact object that has functions to get and set various values
 * for a contact independently of the version of Thunderbird (using AbManager).
 * Optionally takes the parent directory and is able to update the card in that
 * directory.
 * 
 * @param aContact   {nsIAbCard}   A Thunderbird contact.
 * @param aDirectory {AddressBook} The parent directory.  Optional.
 * @class
 * @constructor
 */
function TBContact(aContact, aDirectory) {
  AbManager.checkCard(aContact, "TBContact constructor");
  //if (!aDirectory instanceof AddressBook) {
  //  throw "Error - invalid directory sent to the TBContact constructor";
  //}
  this.mAddressBook = aDirectory;
  this.mContact     = aContact;
}

TBContact.prototype = {
  /**
   * TBContact.getValue
   * Returns the value of the requested property of this contact.
   *
   * If the readOnly preference is enabled, then this will return 0 for the
   * LastModifiedDate.
   * 
   * @param aAttribute {string} The attribute to get (PrimaryEmail, for example)
   *
   * @return The value of the attribute, or null if not set.
   */
  getValue: function TBContact_getValue(aAttribute) {
    if (!aAttribute)
      throw "Error - invalid attribute sent to TBContact_getValue";
    if (aAttribute == "LastModifiedDate" && Preferences.mSyncPrefs.readOnly.value) {
      LOGGER.VERBOSE_LOG(" * Read only mode, setting LMD to 0");
      return 0;
    }
    return AbManager.getCardValue(this.mContact, aAttribute);
  },
  /**
   * TBContact.setValue
   * Sets the value of the requested attribute of this contact and optionally
   * updates the contact in its parent directory.
   *
   * @param aAttribute {string} The attribute to set (PrimaryEmail, for example)
   * @param aValue     {string} The value for the given attribute.  If null the
   *                   attribute is 'deleted' from the contact.
   * @param aUpdate    {bool}   Set to true to update this card after setting
   *                   the value of the attribute.
   */
  setValue: function TBContact_setValue(aAttribute, aValue, aUpdate) {
    AbManager.setCardValue(this.mContact, aAttribute, aValue);
    if (aUpdate) {
      return this.update();
    }
    return false;
  },
  /**
   * TBContact.update
   * Updates this card in its parent directory, if possible.
   */
  update: function TBContact_update() {
    if (!this.mAddressBook) {
      LOGGER.LOG_WARNING("Warning - TBContact.update called w/o a directory");
      return false;
    }
    return this.mAddressBook.updateCard(this.mContact);
  },
  /**
   * TBContact.remove
   * Removes this card from its parent directory, if possible.
   */
  remove: function TBContact_remove() {
    if (!this.mAddressBook) {
      LOGGER.LOG_WARNING("Warning - TBContact.remove called w/o a directory");
      return false;
    }
    return this.mAddressBook.deleteCards([this.mContact]);
  },
  /**
   * TBContact.getName
   * Returns a 'name' for this contact.  It is the first non-null and not blank
   * value for the following attributes:
   *  - DisplayName
   *  - PrimaryEmail
   *  - GoogleID
   */
  getName: function TBContact_getName() {
    var displayName  = this.getValue("DisplayName");
    if (displayName)  return displayName;
    var primaryEmail = this.getValue("PrimaryEmail");
    if (primaryEmail) return primaryEmail;
    return this.getValue("GoogleID");
  }
};