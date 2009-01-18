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
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Seth Spitzer <sspitzer@netscape.com>
 *   Mark Banner <mark@standard8.demon.co.uk>
 *   Josh Geenen <gcontactsync@pirules.net>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either of the GNU General Public License Version 2 or later (the "GPL"),
 * or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
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
 * myOnDrop
 * Meant to override the code in the onDrop method of abDirTreeObserver (an
 * instance of nsIXULTreeBuilderObserver), which is called when the user drops
 * one or more cards.  The code is a modified version of onDrop found in
 * mailnews/addrbook/resources/content/abDragDrop.js
 * It's purpose is to copy over extra attributes that this extension adds to
 * address book cards.
 *
 * @param row          The row
 * @param orientation  An integer specifying on/after/before the given row
 */
function myOnDrop(row, orientation) {
  var dragSession = dragService.getCurrentSession();
  if (!dragSession)
    return;
  // get the attributes added by this extension
  var attributes = ContactConverter.getExtraSyncAttributes();
  var attributesLen = attributes.length;

  var trans = Cc["@mozilla.org/widget/transferable;1"]
               .createInstance(Ci.nsITransferable);
  trans.addDataFlavor("moz/abcard");

  var targetResource = dirTree.builderView.getResourceAtIndex(row);
  // get the source and target directory information
  var targetURI = targetResource.Value;
  var srcURI = GetSelectedDirectory();
  var toDirectory = GetDirectoryFromURI(targetURI);
  var srcDirectory = GetDirectoryFromURI(srcURI);
  var ab = new AddressBook(toDirectory);
  // iterate through each dropped item from the session
  for (var i = 0, dropItems = dragSession.numDropItems; i < dropItems; i++) {
    dragSession.getData(trans, i);
    var dataObj = {};
    var flavor = {};
    var len = {};
    var needToRefresh = false;
    try {
      trans.getAnyTransferData(flavor, dataObj, len);
      dataObj = dataObj.value.QueryInterface(Ci.nsISupportsString);
    }
    catch (ex) { continue; }
    var transData = dataObj.data.split("\n");
    var rows = transData[0].split(",");
    var numrows = rows.length;
    var result;
    // needToCopyCard is used for whether or not we should be creating
    // copies of the cards in a mailing list in a different address book
    // - it's not for if we are moving or not.
    var needToCopyCard = true;
    if (srcURI.length > targetURI.length) {
      result = srcURI.split(targetURI);
      if (result[0] != srcURI) {
        // src directory is a mailing list on target directory, no need to copy card
        needToCopyCard = false;
        // workaround for a mailnews bug, get the childCards enumerator to
        // update the mIsMailingList variable in the directory
        // https://www.mozdev.org/bugs/show_bug.cgi?id=19733
        toDirectory.childCards;
      }
    }
    else {
      result = targetURI.split(srcURI);
      if (result[0] != targetURI) {
        // target directory is a mailing list on src directory, no need to copy card
        needToCopyCard = false;
        // workaround for a mailnews bug, get the childCards enumerator to
        // update the mIsMailingList variable in the directory
        // https://www.mozdev.org/bugs/show_bug.cgi?id=19733
        toDirectory.childCards;
        needToRefresh = true;
      }
    }
    // if we still think we have to copy the card,
    // check if srcURI and targetURI are mailing lists on same directory
    // if so, we don't have to copy the card
    if (needToCopyCard) {
      var targetParentURI = GetParentDirectoryFromMailingListURI(targetURI);
      if (targetParentURI && (targetParentURI ==
                              GetParentDirectoryFromMailingListURI(srcURI)))
        needToCopyCard = false;
    }
    // Only move if we are not transferring to a mail list
    var actionIsMoving = (dragSession.dragAction & dragSession.DRAGDROP_ACTION_MOVE)
                         && !toDirectory.isMailList;
    // get the cards first
    var cards = [];
    for (var j = 0; j < numrows; j++) {
      cards.push(gAbView.getCardFromRow(rows[j]));
    }
    // iterate through each card and copy/move it
    for (var j = 0; j < numrows; j++) {
      var card = cards[j];
      if (!card)
        continue;
      if (card.isMailList) {
        // This check ensures we haven't slipped through by mistake
        if (needToCopyCard && actionIsMoving)
          toDirectory.addMailList(GetDirectoryFromURI(card.mailListURI));
      }
      else {
        var values = [];
        var types = [];
        // put in a try/catch block in case the card can't be QI'd to nsIAbMDBCard
        var isMDBCard = false;
        // only copy over the extra attributes if this is before Bug 413260 and
        // if the card is an MDB Card (not an LDAP or different card)
        try {
          if (!card.getProperty) {
            // MDB card was removed in 413260, but after that patch it is no
            // longer necessary to copy the extra attributes manually
            // the card may also be an LDAP card in which case it won't have
            // extra attributes to copy
            card.QueryInterface(Ci.nsIAbMDBCard);
            isMDBCard = true;
            for (var k = 0; k < attributesLen; k++) {
              values[k] = card.getStringAttribute(attributes[k]);
              types[k] = card.getStringAttribute(attributes[k] + "Type");
            }
          }
        }
        catch (e) {
          // ignore the error if the card wasn't an MDB card, otherwise log it
          if (isMDBCard)
            LOGGER.LOG_WARNING("Error while getting extra card attributes.", e);
        }
        // delete the card if the user chose to move it (rather than copy it)
        if (actionIsMoving)
          deleteCard(srcDirectory, card);
        var newCard = toDirectory.addCard(card);
        if (isMDBCard) { // copy the attributes if this is an MDB card
          try {
            newCard.QueryInterface(Ci.nsIAbMDBCard);
            if (isMDBCard) {
              for (var k = 0; k < attributesLen; k++) {
                var value = values[k] ? values[k] : "";
                var type = types[k] ? types[k] : "";
                newCard.setStringAttribute(attributes[k], value);
                newCard.getStringAttribute(attributes[k] + "Type", type);
              }
            }
          } catch (e) { LOGGER.LOG_WARNING("Error while copying card", e); }
        }
        try {
          var now = (new Date).getTime()/1000;
          // now set the new card's last modified date and update it
          ab.setCardValue(newCard, "LastModifiedDate", now);
          ab.updateCard(newCard);
        } catch (e) { LOGGER.LOG_WARNING('copy card error: ' + e); }
      }
    }
    var cardsTransferredText;

    // set the status bar text
    if (actionIsMoving)
      cardsTransferredText = 
        numrows == 1 ? gAddressBookBundle.getString("cardMoved")
                     : gAddressBookBundle.getFormattedString("cardsMoved",
                                                              [numrows]);
    else
      cardsTransferredText =
        numrows == 1 ? gAddressBookBundle.getString("cardCopied")
                     : gAddressBookBundle.getFormattedString("cardsCopied",
                                                              [numrows]);
    // refresh the results tree if necessary to avoid showing the same card twice
    if (needToRefresh) {
      // update the address book view so it doesn't show the card twice
      SetAbView(GetSelectedDirectory(), false);
      // select the first card, if any
      if (gAbView && gAbView.getCardFromRow(0))
        SelectFirstCard();
    }
    // set the status text after refreshing the results list
    document.getElementById("statusText").label = cardsTransferredText;
  }
}
/**
 * deleteCard
 * Deletes the given card from the given directory.
 * @param aDirectory The directory from which the card is deleted.
 * @param aCard      The card that is deleted from the directory.
 */
function deleteCard(aDirectory, aCard) {
  if (!aCard)
    return;
  var arr;
  // Thunderbird 2 and 3 differ in the type of array that must be passed to
  // the deleteCards method
  if (aDirectory.modifyCard) { // TB 3
    arr = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    arr.appendElement(aCard, false);
  }
  else { // TB 2
    arr = Cc["@mozilla.org/supports-array;1"]
           .createInstance(Ci.nsISupportsArray);
    arr.AppendElement(aCard, false);
  }
  aDirectory.deleteCards(arr);
}
