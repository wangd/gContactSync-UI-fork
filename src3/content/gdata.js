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

if (!com) var com = {};
if (!com.gContactSync) com.gContactSync = {};

window.addEventListener("load", function gdataLoadListener(e) {
  com.gContactSync.gdata.contacts.init();
 }, false);

/**
 * gdata
 * Stores information on using the Google Data Api™ protocol, specifically the
 * contacts portion of the protocol.
 * http://code.google.com/apis/contacts/
 * @class
 */
com.gContactSync.gdata = {
  AUTH_URL:              "https://www.google.com/accounts/ClientLogin",
  AUTH_REQUEST_TYPE:     "POST",
  AUTH_SUB_SESSION_URL:  "https://www.google.com/accounts/AuthSubSessionToken",
  AUTH_SUB_SESSION_TYPE: "GET",
  AUTH_SUB_REVOKE_URL:   "https://www.google.com/accounts/AuthSubRevokeToken",
  AUTH_SUB_REVOKE_TYPE:  "GET",
  O_AUTH_URL:            "https://www.google.com/accounts/AuthSubRequest?scope=https%3A%" +
                         "2F%2Fwww.google.com%2Fm8%2Ffeeds%2F&session=1&secure=0&next=" +
                         "http%3A%2F%2Fpirules.org%2Ftools%2Fgcs%2Findex.php",
  O_AUTH_TYPE:           "GET",
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
           "&service=cp&source=Josh-gContactSync-0-3";
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
    var start    = aId.indexOf(startStr) + startStr.length;
    var endStr   = "/base/";
    var end      = aId.indexOf(endStr);
    if (start >= end)
      return "";
    var address = decodeURIComponent(aId.substring(start, end));
    com.gContactSync.LOGGER.VERBOSE_LOG("found address: " + address + " from ID: " + aId);
    return address;
  },
  // The namespaces used
  namespaces: {
    APP:         new com.gContactSync.Namespace("http://www.w3.org/2007/app", "app:"),
    ATOM:        new com.gContactSync.Namespace("http://www.w3.org/2005/Atom", "atom:"),
    GD:          new com.gContactSync.Namespace("http://schemas.google.com/g/2005", "gd:"),
    GCONTACT:    new com.gContactSync.Namespace("http://schemas.google.com/contact/2008",
                               "gContact:"),
    OPEN_SEARCH: new com.gContactSync.Namespace("http://a9.com/-/spec/opensearch/1.1/",
                               "openSearch:"),
    BATCH:       new com.gContactSync.Namespace("http://schemas.google.com/gdata/batch","batch:")
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
    RELATION_TYPES: {      
      "assistant":        1,
      "brother":          1,
      "child":            1,
      "domestic-partner": 1,
      "father":           1,
      "friend":           1,
      "manager":          1,
      "mother":           1,
      "parent":           1,
      "partner":          1,
      "referred-by":      1,
      "relative":         1,
      "sister":           1,
      "spouse":           1
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
      UNTYPED: 2,
      // The type is stored in the element's parent
      PARENT_TYPED: 3
    },
    rel: "http://schemas.google.com/g/2005",
    /**
     * gdata.contacts.init
     * Initializes the values of the tagnames with an GElement object containing
     * information about how an Atom/XML representation of a contact from Google
     * is stored.
     */
    init: function gdata_contacts_init() {
      var GElement             = com.gContactSync.GElement;
      var untyped              = com.gContactSync.gdata.contacts.types.UNTYPED;
      var typedWithChild       = com.gContactSync.gdata.contacts.types.TYPED_WITH_CHILD;
      var typedWithAttr        = com.gContactSync.gdata.contacts.types.TYPED_WITH_ATTR;
      var parentTyped          = com.gContactSync.gdata.contacts.types.PARENT_TYPED;
      var gd                   = com.gContactSync.gdata.namespaces.GD;
      var atom                 = com.gContactSync.gdata.namespaces.ATOM;
      var gcontact             = com.gContactSync.gdata.namespaces.GCONTACT;
      this.postalAddress       = new GElement(typedWithChild, "postalAddress",
                                             gd, ["work", "home", "other"]);
      this.phoneNumber         = new GElement(typedWithChild, "phoneNumber",
                                             gd, ["work", "home", "mobile",
                                             "pager", "other", "home_fax",
                                             "work_fax"]);
      this.email               = new GElement(typedWithAttr, "email", gd,
                                             ["home", "work", "other"], "address");
      this.im                  = new GElement(typedWithAttr, "im", gd,
                                              ["JABBER", "YAHOO", "AIM", "GOOGLE_TALK", "MSN", "ICQ"],
                                              "address");
      this.id                  = new GElement(untyped, "id", atom);
      this.updated             = new GElement(untyped, "updated", atom);
      this.title               = new GElement(untyped, "title", atom);
      this.fullName            = new GElement(untyped, "fullName", gd);
      this.givenName           = new GElement(untyped, "givenName", gd);
      this.familyName          = new GElement(untyped, "familyName", gd);
      this.additionalName      = new GElement(untyped, "additionalName", gd);
      this.namePrefix          = new GElement(untyped, "namePrefix", gd);
      this.nameSuffix          = new GElement(untyped, "nameSuffix", gd);
      this.notes               = new GElement(untyped, "content", atom);
      this.orgName             = new GElement(untyped, "orgName", gd);
      this.orgTitle            = new GElement(untyped, "orgTitle", gd);
      this.orgJobDescription   = new GElement(untyped, "orgJobDescription", gd);
      this.orgDepartment       = new GElement(untyped, "orgDepartment", gd);
      this.orgSymbol           = new GElement(untyped, "orgSymbol", gd);
      this.birthday            = new GElement(untyped, "birthday", gcontact);
      this.organization        = new GElement(typedWithAttr, "organization",
                                              gd, ["other"]);
      this.groupMembershipInfo = new GElement(untyped, "groupMembershipInfo",
                                              gcontact);
      this.relation            = new GElement(typedWithChild, "relation",
                                              gcontact,
                                              this.RELATION_TYPES);
      this.nickname            = new GElement(untyped, "nickname",
                                              gcontact);
      this.website             = new GElement(typedWithAttr, "website",
                                              gcontact,
                                              this.WEBSITE_TYPES, "href");
      this.street              = new GElement(untyped, "street", gd),
      this.city                = new GElement(untyped, "city", gd),
      this.region              = new GElement(untyped, "region", gd),
      this.postcode            = new GElement(untyped, "postcode", gd),
      this.country             = new GElement(untyped, "country", gd)
    },
    WEBSITE_TYPES: [
      "home-page", "blog", "profile", "home", "work", "other", "ftp"
    ],
    ORG_TAGS: {
      orgDepartment:     "1",
      orgJobDescription: "1",
      orgName:           "1",
      orgSymbol:         "1",
      orgTitle:          "1"
    },
    isOrgTag: function gdata_contacts_isOrgTag(aTagName) {
      return this.ORG_TAGS[aTagName] ? true : false;
    },
    NAME_TAGS: {
      givenName:         "1",
      additionalName:    "1",
      familyName:        "1",
      namePrefix:        "1",
      nameSuffix:        "1",
      fullName:          "1"
    },
    isNameTag: function gdata_contacts_isNameTag(aTagName) {
      return this.NAME_TAGS[aTagName] ? true : false;
    },
    ADDRESS_TAGS: {
      housename:    "1",
      street:       "1",
      poBox:        "1",
      neighborhood: "1",
      city:         "1",
      subregion:    "1",
      region:       "1",
      postcode:     "1",
      country:      "1"
    },
    isAddressTag: function gdata_contacts_isAddressTag(aTagName) {
      return this.ADDRESS_TAGS[aTagName] ? true : false;
    },
    // different tagnames in the Atom feed, must be initialized
    postalAddress:       {},
    phoneNumber:         {},
    email:               {},
    im:                  {},
    id:                  {},
    updated:             {},
    title:               {},
    fullName:            {},
    givenName:           {},
    familyName:          {},
    additionalName:      {},
    namePrefix:          {},
    nameSuffix:          {},
    notes:               {},
    orgName:             {},
    orgTitle:            {},
    organization:        {},
    groupMembershipInfo: {},
    relation:            {},
    nickname:            {},
    birthday:            {},
    website:             {},
    // links in the contacts feed.  The property name is the type of link
    // and the value is the value of the "rel" attribute
    links: {
      PhotoURL: "http://schemas.google.com/contacts/2008/rel#photo",
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
                                          com.gContactSync.gdata.namespaces.OPEN_SEARCH.url);
    }
  },
  /**
   * gdata.isAuthValid
   * Returns true if there is at least one auth token.
   */ 
  isAuthValid: function gdata_isAuthValid() {
    if (com.gContactSync.LoginManager.mNumAuthTokens == 0)
      com.gContactSync.LoginManager.getAuthTokens();
    return com.gContactSync.LoginManager.mNumAuthTokens > 0;
  }
};
