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
function MailList(aList, aParentDirectory, aNew) {
  if (!aParentDirectory ||
    !(aParentDirectory instanceof AddressBook || aParentDirectory instanceof GAddressBook))
    throw "Error - invalid address book supplied to the MailList Constructor";
  this.mParent = aParentDirectory;
  this.mParent.checkList(aList, "MailList constructor");
  this.mList   = aList;
  this.mList.QueryInterface(Components.interfaces.nsIAbMDBDirectory);
  this.mNew    = aNew;
  if (!aNew)
    this.getAllCards();
}

MailList.prototype = {
  mCards:       [],
  mCardsUpdate: false,
  /**
   * MailList.setName
   * Sets the name of this list. The update method must be called in order for
   * the change to become permanent.
   * @param aName The new name for the list.
   */
  setName: function MailList_setName(aName) {
    this.mList.dirName = aName;
  },
  /**
   * MailList.getName
   * Returns the name of this list.
   * @return The name of this list.
   */
  getName: function MailList_getName() {
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
  hasCard: function MailList_hasCard(aCard) {
    AbManager.checkCard(aCard);
    // get all of the cards in this list again, if necessary
    if (this.mCardsUpdate || this.mCards.length == 0)
      this.getAllCards();
    for (var i = 0, length = this.mCards.length; i < length; i++) {
      var card = this.mCards[i];
      var aCardID = AbManager.getCardValue(aCard, "GoogleID");
      // if it is an old card (has id) compare IDs
      if (aCardID) {
        if (aCardID == AbManager.getCardValue(card, "GoogleID"))
          return card;
      }
      // else check that display name, primary and second email are equal
      else if (AbManager.getCardValue(aCard, "DisplayName") ==
                                      AbManager.getCardValue(card,"DisplayName")
              && AbManager.getCardValue(aCard, "PrimaryEmail") ==
                                        AbManager.getCardValue(card, "PrimaryEmail")
              && AbManager.getCardValue(aCard, "SecondEmail") ==
                                        AbManager.getCardValue(card, "SecondEmail"))
        return card;
    }
    return null;
  },
  /**
   * MailList.setNickName
   * Sets the nick name for this mailing list.  The update method must be
   * called in order for the change to become permanent.
   * @param aNickName The new nick name for this mailing list.
   */
  setNickName: function MailList_setNickName(aNickName) {
    this.mList.listNickName = aNickName;
  },
  /**
   * MailList.getNickName
   * Returns the nick name of this mailing list.
   * @return The nick name of this mailing list.
   */
  getNickName: function MailList_getNickName() {
    return this.mList.listNickName;
  },
  /**
   * MailList.setDescription
   * Sets the description for this mailing list.  The update method must be
   * called in order for the change to become permanent.
   * @param aDescription The new description for this mailing list.
   */
  setDescription: function MailList_setDescription(aDescription) {
    this.mList.description = aDescription;
  },
  /**
   * MailList.getDescription
   * Returns the description of this mailing list.
   * @return The description of this mailing list.
   */
  getDescription: function MailList_getDescription() {
    return this.mList.description;
  },
  /**
   * MailList.addCard
   * Adds a card to this mailing list without checking if it already exists.
   * @param aCard The card to add to this mailing list.
   * @return A real card (MDB card prior to 413260).
   */
  addCard: function MailList_addCard(aCard) {
    AbManager.checkCard(aCard);
    var realCard = this.mList.addCard(aCard);
    this.mCards.push(realCard);
    return realCard;
  },
  /**
   * MailList.getURI
   * Returns the uniform resource identifier (URI) for this mailing list.
   * @return The URI of this list.
   */
  getURI: function MailList_getURI() {
    if (this.mList.URI)
      return this.mList.URI;
    return this.mList.getDirUri();
  },
  /**
   * MailList.getAllCards
   * Returns an array of all of the cards in this mailing list.
   * @return An array containing all of the cards in this mailing list.
   */
  getAllCards: function MailList_getAllCards() {
    // NOTE: Sometimes hasMoreElements fails if mail lists aren't working
    // properly, but it shouldn't be caught or the sync won't function properly
    this.mCards = [];
    var iter = this.mList.childCards;
    var data;
    if (AbManager.mVersion == 3) { // TB 3
      try {
        while (iter.hasMoreElements()) {
          data = iter.getNext();
          if (data instanceof Components.interfaces.nsIAbCard)
            this.mCards.push(data);
        }
      }
      catch (e) {
        LOGGER.LOG_ERROR("A mailing list is not working:", e);
        if (confirm(StringBundle.getStr("resetConfirm"))) {
          this.mParent.reset();
          alert(StringBundle.getStr("pleaseRestart"));
        }
        // Throw an error to stop the sync
        throw "A mailing list is not working correctly";
      }
    }
    else { // TB 2
      // use nsIEnumerator...
      try {
        iter.first();
        do {
          data = iter.currentItem();
          if(data instanceof Components.interfaces.nsIAbCard)
            this.mCards.push(data);
          iter.next();
        } while (Components.lastResult == 0);
      }
      catch(e) {
        // TODO find a way to distinguish between the usual errors and the
        // broken list errors
        // error is expected when finished
        LOGGER.VERBOSE_LOG("This error is expected:\n" + e);
      }
    }
    return this.mCards;
  },
  /**
   * MailList.deleteCards
   * Deletes all of the cards in the array of cards from this list.
   * @param aCards The array of cards to delete from this mailing list.
   */
  deleteCards: function MailList_deleteCards(aCards) {
    if (!(aCards && aCards.length && aCards.length > 0))
      return;
    var arr;
    if (AbManager.mVersion == 3) { // TB 3
      arr = Components.classes["@mozilla.org/array;1"]
                      .createInstance(Components.interfaces.nsIMutableArray);
      for (var i = 0; i < aCards.length; i++) {
        AbManager.checkCard(aCards[i]);
        arr.appendElement(aCards[i], false);
      }
    }
    else { // TB 2
      arr =  Components.classes["@mozilla.org/supports-array;1"]
                       .createInstance(Components.interfaces.nsISupportsArray);
      for (var i = 0; i < aCards.length; i++) {
        AbManager.checkCard(aCards[i]);
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
      LOGGER.LOG_WARNING("Error while deleting cards from a mailing list", e);
    }
    this.mCards = this.getAllCards();
  },
  /**
   * MailList.delete
   * Deletes this mailing list from its parent address book.
   */
  delete: function MailList_delete() {
    this.mParent.mDirectory.deleteDirectory(this.mList);
    this.mCards = [];
    // make sure the functions don't do anything
    for (var i in this) {
      if (i instanceof Function)
        i = function() {};
    }
  },
  /**
   * MailList.update
   * Updates this mail list.
   */
  update: function MailList_update() {
    try {
      if (AbManager.mVersion == 3)
        this.mList.editMailListToDatabase(null);
      else
        this.mList.editMailListToDatabase(this.getURI(), null);
    }
    catch(e) { LOGGER.LOG_WARNING("Unable to update mail list", e);}
  }
};