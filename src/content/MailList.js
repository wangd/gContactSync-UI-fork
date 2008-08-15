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
 * MailList
 * MailList is an abstraction of a mailing list that facilitates getting the
 * cards contained within the actual list as well as accessing and modifying the
 * list and its properties.
 * @constructor
 * @class
 */
function MailList(aList, aParentDirectory, aNew) {
  if (!aParentDirectory || !(aParentDirectory instanceof AddressBook))
    throw "Error - invalid address book supplied to the MailList Constructor";
  this.mParent = aParentDirectory;
  this.mParent.checkList(aList, "MailList constructor");
  this.mList = aList;
  this.mList.QueryInterface(Ci.nsIAbMDBDirectory);
  this.mNew = aNew;
  if (!aNew)
    this.mCards = this.getAllCards();
}

MailList.prototype = {
  mCards: [],
  /**
   * MailList.setName
   * Sets the name of this list. The update method must be called in order for
   * the change to become permanent.
   * @param aName The new name for the list.
   */
  setName: function(aName) {
    this.mList.dirName = aName;
  },
  /**
   * MailList.getName
   * Returns the name of this list.
   * @return The name of this list.
   */
  getName: function() {
    return this.mList.dirName;
  },
  /**
   * MailList.hasCard
   * Returns the card in this mail list, if any, with the same (not-null)
   * value for the GoogleID attribute, or, if the GoogleID is null, if the
   *         display name, primary, and second emails are the same.
   * @param aCard The card being searched for.
   * @return The card in this list, if any, with the same, and non-null value
   *         for its GoogleID attribute, or, if the GoogleID is null, if the
   *         display name, primary, and second emails are the same.
   */
  hasCard: function(aCard) {
    this.mParent.checkCard(aCard);
    var ab = this.mParent;
    for (var i = 0, length = this.mCards.length; i < length; i++) {
      var card = this.mCards[i];
      var aCardID = ab.getCardValue(aCard, "GoogleID");
      // if it is an old card (has id) compare IDs
      if (aCardID) {
        if (aCardID == ab.getCardValue(card, "GoogleID"))
          return card;
      }
      // else check that display name, primary and second email are equal
      else if (ab.getCardValue(aCard, "DisplayName") == ab.getCardValue(card, "DisplayName")
              && ab.getCardValue(aCard, "PrimaryEmail") == ab.getCardValue(card, "PrimaryEmail")
              && ab.getCardValue(aCard, "SecondEmail") == ab.getCardValue(card, "SecondEmail"))
        return card;
    }
  },
  /**
   * MailList.setNickName
   * Sets the nick name for this mailing list.  The update method must be
   * called in order for the change to become permanent.
   * @param aNickName The new nick name for this mailing list.
   */
  setNickName: function(aNickName) {
    this.mList.listNickName = aNickName;
  },
  /**
   * MailList.getNickName
   * Returns the nick name of this mailing list.
   * @return The nick name of this mailing list.
   */
  getNickName: function() {
    return this.mList.listNickName;
  },
  /**
   * MailList.setPrefId
   * Sets the preference id for this mailing list.  The update method must be
   * called in order for the change to become permanent.
   * @param aPrefId The new preference ID for this mailing list.
   */
  setPrefId: function(aPrefId) {
    this.mList.dirPrefId = aPrefId;
  },
  /**
   * MailList.getPrefId
   * Returns the preference ID of this mailing list.
   * @return The preference ID of this mailing list.
   */
  getPrefId: function() {
    return this.mList.dirPrefId;
  },
  /**
   * MailList.getStringPref
   * Gets and returns the string preference, if possible, with the given name.
   * Returns null if this list doesn't have a preference ID or if there was an
   * error getting the preference.
   * @param aName         The name of the preference to get.
   * @param aDefaultValue The value to set the preference at if it fails.  Only
   *                      used in Thunderbird 3.
   * @return The value of the preference with the given name in the preference
   *         branch specified by the preference ID, if possible.  Otherwise null.
   */
  getStringPref: function(aName, aDefaultValue) {
    if (this.mList.getStringValue) {
      try {
        return this.mList.getStringValue(aName, aDefaultValue);
      } catch (e) { LOGGER.LOG_WARNING("Error while setting list pref", e); }
    }
    var id = this.getPrefId();
    if (!id)
      return;
    try {
      var branch = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService)
                    .getBranch(dirPrefId)
                    .QueryInterface(Ci.nsIPrefBranch2);
      branch.getCharPref(aName);
    } catch(e) { LOGGER.LOG_WARNING("Error while getting list pref", e); }
  },
  /**
   * MailList.getStringPref
   * Gets and returns the string preference, if possible, with the given name.
   * @param aName  The name of the preference to get.
   * @param aValue The value to set the preference to.
   */
  setStringPref: function(aName, aValue) {
    if (this.mList.getStringValue) {
      try {
        return this.mList.setStringValue(aName, aValue);
      } catch (e) { LOGGER.LOG_WARNING("Error while setting list pref", e); }
    }
    var id = this.getPrefId();
    if (!id)
      return;
    try {
      var branch = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService)
                    .getBranch(dirPrefId)
                    .QueryInterface(Ci.nsIPrefBranch2);
      branch.setCharPref(aName, aValue);
    } catch(e) { LOGGER.LOG_WARNING("Error while setting list pref", e); }
  },
  /**
   * MailList.setDescription
   * Sets the description for this mailing list.  The update method must be
   * called in order for the change to become permanent.
   * @param aDescription The new description for this mailing list.
   */
  setDescription: function(aDescription) {
    this.mList.description = aDescription;
  },
  /**
   * MailList.getDescription
   * Returns the description of this mailing list.
   * @return The description of this mailing list.
   */
  getDescription: function() {
    return this.mList.description;
  },
  /**
   * MailList.addCard
   * Adds a card to this mailing list without checking if it already exists.
   * @param aCard The card to add to this mailing list.
   * @return A real card (MDB card prior to 413260).
   */
  addCard: function(aCard) {
    this.mParent.checkCard(aCard);
    var realCard = this.mList.addCard(aCard);
    this.mCards.push(realCard);
    return realCard;
  },
  /**
   * MailList.getURI
   * Returns the uniform resource identifier (URI) for this mailing list.
   * @return The URI of this list.
   */
  getURI: function() {
    if (this.mList.URI)
      return this.mList.URI;
    return this.mList.getDirUri();
  },
  /**
   * MailList.getAllCards
   * Returns an array of all of the cards in this mailing list.
   * @return An array containing all of the cards in this mailing list.
   */
  getAllCards: function() {
    // NOTE: Sometimes hasMoreElements fails if mail lists aren't working
    // properly, but it shouldn't be caught or the sync won't function properly
    var arr = [];
    var iter = this.mList.childCards;
    if (this.mParent.mVersion == 3) { // TB 3
      while (iter.hasMoreElements()) {
        data = iter.getNext();
        if (data instanceof nsIAbCard)
          arr.push(data);
      }
    }
    else { // TB 2
      // use nsIEnumerator...
      try {
        iter.first();
        do {
          var data = iter.currentItem();
          if(data instanceof nsIAbCard)
            arr.push(data);
          iter.next();
        } while (Components.lastResult == 0);
      } catch(e) {} // error is expected when finished   
    }
    return arr;
  },
  /**
   * MailList.deleteCards
   * Deletes all of the cards in the array of cards from this list.
   * @param aCards The array of cards to delete from this mailing list.
   */
  deleteCards: function(aCards) {
    if (!(aCards && aCards.length && aCards.length > 0))
      return;
    var arr;
    if (this.mParent.mVersion == 3) { // TB 3
      arr = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
      for (var i = 0; i < aCards.length; i++) {
        this.mParent.checkCard(aCards[i], "deleteAbCard");
        arr.appendElement(aCards[i], false);
      }
    }
    else { // TB 2
      arr =  Cc["@mozilla.org/supports-array;1"].createInstance(Ci.nsISupportsArray);
      for (var i = 0; i < aCards.length; i++) {
        this.mParent.checkCard(aCards[i], "deleteAbCard");
        arr.AppendElement(aCards[i], false);
      }
    }
    try {
      if (arr) // make sure arr isn't null (mailnews bug 448165)
        this.mList.deleteCards(arr);
    }
    catch(e) {
      LOGGER.LOG_WARNING("Error while deleting cards from a mailing list: " + e);
    }
    this.mCards = this.getAllCards();
  },
  /**
   * MailList.delete
   * Deletes this mailing list from its parent address book.
   */
  delete: function() {
    this.mParent.mDirectory.deleteDirectory(this.mList);
    this.mCards = [];
  },
  /**
   * MailList.update
   * Updates this mail list.
   */
  update: function() {
    try {
      if (this.mParent.mVersion == 3)
        this.mList.editMailListToDatabase(null);
      else
        this.mList.editMailListToDatabase(this.getURI(), null);
    }
    catch(e) { LOGGER.LOG_WARNING("Unable to update mail list: " + e);}
  }
};
