var AbListener = {
  onItemAdded: function(aParentDir, aItem) {
    // this.update(aParentDir, aItem);
  },
  onItemPropertyChanged: function(aItem, aProperty , aOldValue , aNewValue ) {
    // do nothing
  },
  onItemRemoved: function(aParentDir, aItem) {
    this.update(aParentDir, aItem);
  },
  update: function(aParentDir, aItem) {
    var now = (new Date).getTime()/1000;
    aParentDir.QueryInterface(Ci.nsIAbDirectory);
    var uri = this.getURI(aParentDir);
    var dir = aParentDir;
    if (aParentDir instanceof Ci.nsIAbDirectory && aParentDir.isMailList) {
      aParentDir.lastModifiedDate = now;
      //this.updateList(aParentDir);
      uri = uri.substring(0, uri.lastIndexOf("/"));
      dir = this.getAbByURI(uri);
    }
    if (aItem instanceof Ci.nsIAbDirectory) {
      aItem.lastModifiedDate = now;
      this.updateList(aItem);
    }
    else if (aItem instanceof Ci.nsIAbCard) {
      aItem.QueryInterface(Ci.nsIAbMDBCard);
      aItem.lastModifiedDate = now;
      this.updateCard(dir, aItem, uri);
    }
  },
  updateCard: function(aDirectory, aCard, aURI) {
    if (aDirectory && aDirectory.modifyCard)
      aDirectory.modifyCard(aCard);
    else if (aCard && aURI && aCard.editCardToDatabase)
      aCard.editCardToDatabase(aURI);
    else
      LOGGER.LOG_WARNING("unable to update card " + aCard + " to directory "
                         + aDirectory + " with URI " + aURI);
  },
  updateList: function(aList) {
    if (Cc["@mozilla.org/abmanager;1"])
      aList.editMailListToDatabase(null);
    else
      aList.editMailListToDatabase(this.getURI(aList), null);
  },
  getURI: function(aDirectory) {
    if (aDirectory.URI)
      return aDirectory.URI;
    aDirectory.QueryInterface(Ci.nsIAbMDBDirectory);
    if (aDirectory.getDirUri)
      return aDirectory.getDirUri();
    LOGGER.LOG_WARNING('AbListener could not get a URI for: ' + aDirectory);
  },
  add: function() {
    if (Cc["@mozilla.org/abmanager;1"]) {
      var flags = Ci.nsIAbListener.itemAdded |
                  Ci.nsIAbListener.directoryItemRemoved;
      Cc["@mozilla.org/abmanager;1"]
       .getService(Ci.nsIAbManager)
       .addAddressBookListener(AbListener, flags);
    }
    else {
      var flags = Ci.nsIAddrBookSession.added |
                  Ci.nsIAddrBookSession.directoryItemRemoved;
      Cc["@mozilla.org/addressbook/services/session;1"]
       .getService(Ci.nsIAddrBookSession)
       .addAddressBookListener(AbListener, flags);
    }
  },
  remove: function() {
    if (Cc["@mozilla.org/abmanager;1"]) {
      Cc["@mozilla.org/abmanager;1"]
       .getService(Ci.nsIAbManager)
       .removeAddressBookListener(AbListener);
    }
    else {
      Cc["@mozilla.org/addressbook/services/session;1"]
       .getService(Ci.nsIAddrBookSession)
       .removeAddressBookListener(AbListener);
    }
  },
  getAbByURI: function(aURI) {
    if (!aURI)
      throw StringBundle.getStr("error") + "aURI" + StringBundle.getStr("suppliedTo") +
            "getAbByURI" + StringBundle.getStr("errorEnd");
    try {
      var dir;
      if (Cc["@mozilla.org/abmanager;1"])
        dir = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager)
               .getDirectory(aURI).QueryInterface(Ci.nsIAbDirectory);
      else
       dir = Cc["@mozilla.org/rdf/rdf-service;1"]
              .getService(Ci.nsIRDFService)
              .GetResource(aURI)
              .QueryInterface(Ci.nsIAbDirectory);
      return dir;
    }
    catch(e) { LOGGER.VERBOSE_LOG("Error in getAbByURI: " + e); }
  }
}
