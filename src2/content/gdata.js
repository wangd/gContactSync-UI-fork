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
 * gdata
 * Stores information on using the Google Data Api™ protocol, specifically the
 * contacts portion of the protocol.
 * http://code.google.com/apis/contacts/
 * @class
 */
var gdata = {
  AUTH_URL: "https://www.google.com/accounts/ClientLogin",
  AUTH_REQUEST_TYPE: "POST",
  AUTH_SUB_SESSION_URL: "https://www.google.com/accounts/AuthSubSessionToken",
  AUTH_SUB_SESSION_TYPE: "GET",
  AUTH_SUB_REVOKE_URL: "https://www.google.com/accounts/AuthSubRevokeToken",
  AUTH_SUB_REVOKE_TYPE: "GET",
  O_AUTH_URL: "https://www.google.com/accounts/AuthSubRequest?scope=https%3A%" +
              "2F%2Fwww.google.com%2Fm8%2Ffeeds%2F&session=1&secure=0&next=" +
              "http%3A%2F%2Fpirules.org%2Ftools%2Fgcs%2Findex.php",
  O_AUTH_TYPE: "GET",
  /**
   * gdata.makeAuthBody
   * Sets up the body for an authentication request given the e-mail address
   * and password.
   * @param aEmail     The user's e-mail address
   * @param aPassword  The user's password
   */
  makeAuthBody: function gdata_makeAuthBody(aEmail, aPassword) {
    // NOTE: leave accountType as HOSTED_OR_GOOGLE or Google Apps for your
    // domain accounts won't work
    return "accountType=HOSTED_OR_GOOGLE&Email=" + encodeURIComponent(aEmail) +
           "&Passwd=" + encodeURIComponent(aPassword) +
           "&service=cp&source=Josh-gContactSync-0-2";
  },
  /**
   * gdata.getEmailFromId
   * Returns the email address of the given ID.
   */
  getEmailFromId: function gdata_getEmailFromId(aId) {
    if (!aId || !aId.indexOf || aId == "")
      return "";
    // typical ID:
    // http://www.google.com/m8/feeds/contacts/address%40gmail.com/base/...
    var startStr = "/feeds/contacts/";
    var start = aId.indexOf(startStr) + startStr.length;
    var endStr = "/base/";
    var end = aId.indexOf(endStr);
    if (start >= end)
      return "";
    var address = decodeURIComponent(aId.substring(start, end));
    LOGGER.VERBOSE_LOG("found address: " + address + " from ID: " + aId);
    return address;
  },
  // The namespaces used
  namespaces: {
    APP: new Namespace("http://www.w3.org/2007/app", "app:"),
    ATOM: new Namespace("http://www.w3.org/2005/Atom", "atom:"),
    GD: new Namespace("http://schemas.google.com/g/2005", "gd:"),
    GCONTACT: new Namespace("http://schemas.google.com/contact/2008",
                            "gContact:"),
    OPEN_SEARCH: new Namespace("http://a9.com/-/spec/opensearch/1.1/",
                               "openSearch:"),
    BATCH: new Namespace("http://schemas.google.com/gdata/batch","batch:")
  },
  // some things related to contacts, such as related URLs and HTTP Request
  // types
  contacts: {
    GET_ALL_URL:      "https://www.google.com/m8/feeds/contacts/default/full?" +
                      "max-results=",
    GET_ALL_THIN_URL: "https://www.google.com/m8/feeds/contacts/default/thin?" +
                      "max-results=",
    GROUPS_URL:       "https://www.google.com/m8/feeds/groups/default/full?" +
                      "max-results=1000",
    ADD_GROUP_URL:    "https://www.google.com/m8/feeds/groups/default/full",
    ADD_URL:          "https://www.google.com/m8/feeds/contacts/default/full",
    TYPES: {
      AIM:         "AIM",
      GOOGLE_TALK: "Google Talk",
      ICQ:         "ICQ",
      YAHOO:       "Yahoo",
      MSN:         "MSN",
      JABBER:      "Jabber",
      home:        "Home",
      work:        "Work",
      other:       "Other",
      mobile:      "Mobile",
      pager:       "Pager",
      work_fax:    "Work Fax",
      home_fax:    "Home Fax"
    },
    requestTypes: {
      GET_ALL: "GET",
      GET:     "GET",
      UPDATE:  "PUT", // NOTE: should be set to POST and overridden
      ADD:     "POST",
      DELETE:  "DELETE"  // NOTE: should be set to POST and overridden
    },
    // different "types" of contact elements
    types: {
      // has a type (#home, #work, #other, etc.) and the value is stored in a
      // child node
      TYPED_WITH_CHILD: 0,
      // has a type and the value is stored in an attribute
      TYPED_WITH_ATTR: 1,
      UNTYPED: 2
    },
    rel: "http://schemas.google.com/g/2005",
    /**
     * gdata.contacts.init
     * Initializes the values of the tagnames with an GElement object containing
     * information about how an Atom/XML representation of a contact from Google
     * is stored.
     */
    init: function gdata_contacts_init() {
      var untyped = gdata.contacts.types.UNTYPED;
      var typedWithChild = gdata.contacts.types.TYPED_WITH_CHILD;
      var typedWithAttr = gdata.contacts.types.TYPED_WITH_ATTR;
      this.postalAddress = new GElement(typedWithChild, "postalAddress",
                                       gdata.namespaces.GD, ["work", "home",
                                       "other"]);
      this.phoneNumber = new GElement(typedWithChild, "phoneNumber",
                                     gdata.namespaces.GD, ["work", "home",
                                     "mobile", "pager", "other", "home_fax",
                                     "work_fax"]);
      this.email = new GElement(typedWithAttr, "email", gdata.namespaces.GD,
                               ["home", "work", "other"], "address");
      this.im = new GElement(typedWithAttr, "im", gdata.namespaces.GD, ["JABBER",
                            "YAHOO", "AIM", "GOOGLE_TALK", "MSN", "ICQ"],
                            "address");
      this.id = new GElement(untyped, "id", gdata.namespaces.ATOM);
      this.updated = new GElement(untyped, "updated", gdata.namespaces.ATOM);
      this.title = new GElement(untyped, "title", gdata.namespaces.ATOM);
      this.notes = new GElement(untyped, "content", gdata.namespaces.ATOM);
      this.orgName = new GElement(untyped, "orgName", gdata.namespaces.GD);
      this.orgTitle = new GElement(untyped, "orgTitle", gdata.namespaces.GD);
      this.organization = new GElement(typedWithAttr, "organization",
                                      gdata.namespaces.GD, ["other"]);
      this.groupMembershipInfo = new GElement(untyped, "groupMembershipInfo",
                                              gdata.namespaces.GCONTACT);
    },
    // different tagnames in the Atom feed, must be initialized
    postalAddress: {},
    phoneNumber: {},
    email: {},
    im: {},
    id: {},
    updated: {},
    title: {},
    notes: {},
    orgName: {},
    orgTitle: {},
    organization: {},
    groupMembershipInfo: {},
    // links in the contacts feed.  The property name is the type of link
    // and the value is the value of the "rel" attribute
    links: {
      PhotoURL: "http://schemas.google.com/contacts/2008/rel#edit-photo",
      SelfURL:  "self",
      EditURL:  "edit"
    },
    /**
     * gdata.contacts.getNumberOfContacts
     * Returns the total number of contacts in an Atom document.
     * @param aXML The Atom feed from Google.
     */
    getNumberOfContacts: function gdata_contacts_getNumberOfContacts(aAtom) {
      return aAtom.getElementsByTagNameNS("totalResults",
                                         gdata.namespaces.OPEN_SEARCH.url);
    }
  },
  /**
   * gdata.isAuthValid
   * Returns true if there is at least one auth token.
   */ 
  isAuthValid: function gdata_isAuthValid() {
    if (LoginManager.mNumAuthTokens == 0)
      LoginManager.getAuthTokens();
    return LoginManager.mNumAuthTokens > 0;
  }
}
