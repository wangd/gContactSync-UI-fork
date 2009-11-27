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
 * MailList is an abstraction of a mailing list that facilitates getting the
 * cards contained within the actual list as well as accessing and modifying the
 * list and its properties.
 *
 * @param aList {Components.interfaces.nsIAbDirectory}      The actual nsIAbDirectory
 *                                       representation of a mailing list.
 * @param aParentDirectory {AddressBook} The parent directory (as an
 *                                       AddressBook object) containing this
 *                                       mailing list.
 * @param aNew             {boolean}     Set as true for new mailing lists where
 *                                       no attempt should be made to fetch the
 *                                       contacts contained in the list.
 * @constructor
 * @class
 */
com.gContactSync.MailList = function gCS_MailList(aList, aParentDirectory, aNew) {
  if (!aParentDirectory ||
    !(aParentDirectory instanceof com.gContactSync.AddressBook ||
        aParentDirectory instanceof com.gContactSync.GAddressBook))
    throw "Error - invalid address book supplied to the MailList Constructor";
  this.mParent = aParentDirectory;
  this.mParent.checkList(aList, "MailList constructor");
  this.mList   = aList;
  this.mList.QueryInterface(Components.interfaces.nsIAbMDBDirectory);
  this.mNew    = aNew;
  if (!aNew)
    this.getAllCards();
}

com.gContactSync.MailList.prototype = {
  /** The contacts in this mailing list (cached) */
  mCards:       [],
  /** This is true whenever the contacts have to be fetched again */
  mCardsUpdate: false,
  /**
   * Sets the name of this list. The update method must be called in order for
   * the change to become permanent.
   * @param aName The new name for the list.
   */
  setName: function MailList_setName(aName) {
    this.mList.dirName = aName;
  },
  /**
   * Returns the name of this list.
   * @returns The name of this list.
   */
  getName: function MailList_getName() {
    return this.mList.dirName;
  },
  /**
   * Returns the card in this mail list, if any, with the same (not-null)
   * value for the GoogleID attribute, or, if the GoogleID is null, if the
   *         display name, primary, and second emails are the same.
   * @param aCard {nsIAbCard} The card being searched for.
   * @returns The card in this list, if any, with the same, and non-null value
   *         for its GoogleID attribute, or, if the GoogleID is null, if the
   *         display name, primary, and second emails are the same.
   */
  hasCard: function MailList_hasCard(aCard) {
    com.gContactSync.AbManager.checkCard(aCard);
    // get all of the cards in this list again, if necessary
    if (this.mCardsUpdate || this.mCards.length == 0)
      this.getAllCards();
    for (var i = 0, length = this.mCards.length; i < length; i++) {
      var card = this.mCards[i];
      var aCardID = com.gContactSync.AbManager.getCardValue(aCard, "GoogleID");
      // if it is an old card (has id) compare IDs
      if (aCardID) {
        if (aCardID == com.gContactSync.AbManager.getCardValue(card, "GoogleID"))
          return card;
      }
      // else check that display name, primary and second email are equal
      else if (com.gContactSync.AbManager.getCardValue(aCard, "DisplayName") ==
                                      com.gContactSync.AbManager.getCardValue(card,"DisplayName")
              && com.gContactSync.AbManager.getCardValue(aCard, "PrimaryEmail") ==
                                        com.gContactSync.AbManager.getCardValue(card, "PrimaryEmail")
              && com.gContactSync.AbManager.getCardValue(aCard, "SecondEmail") ==
                                        com.gContactSync.AbManager.getCardValue(card, "SecondEmail"))
        return card;
    }
    return null;
  },
  /**
   * Sets the nick name for this mailing list.  The update method must be
   * called in order for the change to become permanent.
   * @param aNickName The new nick name for this mailing list.
   */
  setNickName: function MailList_setNickName(aNickName) {
    this.mList.listNickName = aNickName;
  },
  /**
   * Returns the nick name of this mailing list.
   * @returns The nick name of this mailing list.
   */
  getNickName: function MailList_getNickName() {
    return this.mList.listNickName;
  },
  /**
   * Sets the description for this mailing list.  The update method must be
   * called in order for the change to become permanent.
   * @param aDescription The new description for this mailing list.
   */
  setDescription: function MailList_setDescription(aDescription) {
    this.mList.description = aDescription;
  },
  /**
   * Returns the description of this mailing list.
   * @returns The description of this mailing list.
   */
  getDescription: function MailList_getDescription() {
    return this.mList.description;
  },
  /**
   * Adds a card to this mailing list without checking if it already exists.
   * NOTE: If the contact does not have a primary e-mail address then this
   * method will add a fake one.
   * @param aCard The card to add to this mailing list.
   * @returns A real card (MDB card prior to 413260).
   */
  addCard: function MailList_addCard(aCard) {
    com.gContactSync.AbManager.checkCard(aCard);
    var ab = this.mParent;
    // Add a dummy e-mail address if necessary and ignore the preference
    // If this was not done then the mailing list would break.
    if (!ab.getCardValue(aCard, "PrimaryEmail")) {
      ab.setCardValue(aCard, "PrimaryEmail", com.gContactSync.makeDummyEmail(aCard, true));
      ab.updateCard(aCard);
    }
    var realCard = this.mList.addCard(aCard);
    this.mCards.push(realCard);
    return realCard;
  },
  /**
   * Returns the uniform resource identifier (URI) for this mailing list.
   * @returns The URI of this list.
   */
  getURI: function MailList_getURI() {
    if (this.mList.URI)
      return this.mList.URI;
    return this.mList.getDirUri();
  },
  /**
   * Returns an array of all of the cards in this mailing list.
   * @returns An array containing all of the cards in this mailing list.
   */
  getAllCards: function MailList_getAllCards() {
    // NOTE: Sometimes hasMoreElements fails if mail lists aren't working
    this.mCards = [];
    var iter    = this.mList.childCards;
    var data;
    if (iter instanceof Components.interfaces.nsISimpleEnumerator) { // Thunderbird 3
      try {
        while (iter.hasMoreElements()) {
          data = iter.getNext();
          if (data instanceof Components.interfaces.nsIAbCard)
            this.mCards.push(data);
        }
      }
      catch (e) {
        com.gContactSync.LOGGER.LOG_ERROR("A mailing list is not working:", e);
        if (confirm(com.gContactSync.StringBundle.getStr("resetConfirm"))) {
          this.mParent.reset();
          alert(com.gContactSync.StringBundle.getStr("pleaseRestart"));
        }
        // Throw an error to stop the sync
        throw com.gContactSync.StringBundle.getStr("mailListBroken");
      }
    }
    else if (iter instanceof Components.interfaces.nsIEnumerator) { // TB 2
      // use nsIEnumerator...
      try {
        iter.first();
        do {
          data = iter.currentItem();
          if (data instanceof Components.interfaces.nsIAbCard)
            this.mCards.push(data);
          iter.next();
        } while (Components.lastResult == 0);
      }
      catch(e) {
        // TODO find a way to distinguish between the usual errors and the
        // broken list errors
        // error is expected when finished
        com.gContactSync.LOGGER.VERBOSE_LOG("This error is expected:\n" + e);
      }
    }
    else {
      com.gContactSync.LOGGER.LOG_ERROR("Could not iterate through an address book's contacts");
      throw com.gContactSync.StringBundle.getStr("mailListBroken");
    }
    return this.mCards;
  },
  /**
   * Deletes all of the cards in the array of cards from this list.
   * @param aCards The array of cards to delete from this mailing list.
   */
  deleteCards: function MailList_deleteCards(aCards) {
    if (!(aCards && aCards.length && aCards.length > 0))
      return;
    var arr;
    if (com.gContactSync.AbManager.mVersion == 3) { // TB 3
      arr = Components.classes["@mozilla.org/array;1"]
                      .createInstance(Components.interfaces.nsIMutableArray);
      for (var i = 0; i < aCards.length; i++) {
        com.gContactSync.AbManager.checkCard(aCards[i]);
        arr.appendElement(aCards[i], false);
      }
    }
    else { // TB 2
      arr =  Components.classes["@mozilla.org/supports-array;1"]
                       .createInstance(Components.interfaces.nsISupportsArray);
      for (var i = 0; i < aCards.length; i++) {
        com.gContactSync.AbManager.checkCard(aCards[i]);
        arr.AppendElement(aCards[i], false);
      }
    }
    try {
      if (arr) { // make sure arr isn't null (mailnews bug 448165)
        this.mCardsUpdate = true; // update mCards when used
        this.mList.deleteCards(arr);
      }
    }
    catch(e) {
      com.gContactSync.LOGGER.LOG_WARNING("Error while deleting cards from a mailing list", e);
    }
    this.mCards = this.getAllCards();
  },
  /**
   * Deletes this mailing list from its parent address book.
   */
  remove: function MailList_delete() {
    this.mParent.mDirectory.deleteDirectory(this.mList);
    this.mCards = [];
    // make sure the functions don't do anything
    for (var i in this) {
      if (i instanceof Function)
        i = function() {};
    }
  },
  /**
   * Updates this mail list (commits changes like renaming or changing the
   * nickname)
   */
  update: function MailList_update() {
    try {
      if (com.gContactSync.AbManager.mVersion == 3)
        this.mList.editMailListToDatabase(null);
      else
        this.mList.editMailListToDatabase(this.getURI(), null);
    }
    catch(e) {
      com.gContactSync.LOGGER.LOG_WARNING("Unable to update mail list", e);
    }
  }
};
