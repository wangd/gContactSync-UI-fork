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
 * HttpRequest
 * Sets up an HTTP request.
 * @constructor
 */
function HttpRequest() {
  if (window.XMLHttpRequest)
    this.mHttpRequest = new XMLHttpRequest();
  if (!this.mHttpRequest)
    throw "Error - could not create an XMLHttpRequest" +
          StringBundle.getStr("pleaseReport");
}

HttpRequest.prototype = {
  // content types
  CONTENT_TYPES: {
    URL_ENC: "application/x-www-form-urlencoded", 
    ATOM: "application/atom+xml",
    XML: "application/xml"
  },
  /**
   * HttpRequest.addContentOverride
   * Adds a content override to the header in case a firewall blocks DELETE or
   * PUT requests.
   * @param aType   The type of override.  Must be DELETE or PUT.
   */
  addContentOverride: function HttpRequest_addContentOverride(aType) {
    switch (aType) {
      case "delete" :
      case "DELETE" :
        this.addHeaderItem("X-HTTP-Method-Override", "DELETE");
        break;
      case "put":
      case "PUT":
        this.addHeaderItem("X-HTTP-Method-Override", "PUT");
        break;
      default:
        throw "Error - type sent to addContentOverride must be DELETE or PUT";
    }
  },
  /**
   * HttpRequest.addHeaderItem
   * Adds a header label/value pair to the arrays of header information
   * @param aLabel  The label for the header
   * @param aValue  The value for the header
   */
  addHeaderItem: function HttpRequest_addHeaderItem(aLabel, aValue) {
    if (!this.mHeaderLabels) {
      this.mHeaderLabels = [];
      this.mHeaderValues = [];
    }
    this.mHeaderLabels.push(aLabel);
    this.mHeaderValues.push(aValue);
  },
  /**
   * HttpRequest.send
   * Sends the HTTP Request with the information stored in the object.
   * Note: Setup everything, including the callbacks for different statuses
   *       including mOnSuccess, mOnError, mOnFail, and mOnCreated first.
   */
  send: function HttpRequest_send() {
    LOGGER.VERBOSE_LOG("HTTP Request being formed");
    LOGGER.VERBOSE_LOG(" * Caller is: " + this.send.caller.name);
    LOGGER.VERBOSE_LOG(" * URL: " + this.mUrl);
    LOGGER.VERBOSE_LOG(" * Type: " + this.mType);
    LOGGER.VERBOSE_LOG(" * Content-Type: " + this.mContentType);
    this.mHttpRequest.open(this.mType, this.mUrl, true); // open the request
    // set the header
    this.addHeaderItem("Content-Type", this.mContentType);
    LOGGER.VERBOSE_LOG(" * Setting up the header: ");
    for (var i = 0; i < this.mHeaderLabels.length; i++) {
       LOGGER.VERBOSE_LOG("   o " + this.mHeaderLabels[i] + " " + this.mHeaderValues[i]);
       this.mHttpRequest.setRequestHeader(this.mHeaderLabels[i],
                                          this.mHeaderValues[i]);
    }
    this.mHttpRequest.send(this.mBody); // send the request
    LOGGER.VERBOSE_LOG(" * Request Sent");
    var httpReq = this.mHttpRequest;
    var onSuccess = this.mOnSuccess ? this.mOnSuccess : [];
    var onOffline = this.mOnOffline ? this.mOnOffline : [];
    var onFail = this.mOnError ? this.mOnError : [];
    var onCreated = this.mOnCreated ? this.mOnCreated : [];

    httpReq.onreadystatechange = function httpReq_readyState() {
      var commands = [];
      //if the request is done then check the status
      if (httpReq.readyState == 4) {
        LOGGER.VERBOSE_LOG(" * The request has finished with status: " + httpReq.status);
        switch (httpReq.status) { 
          case 0: // the user is offline
            commands = onOffline;
            break;
          case 201: // if it is 201 CREATED
            commands = onCreated;
            break;
          case 200:
           // if the status is 200 OK
            commands = onSuccess;
            break;
          default: // other error
            commands = onFail;
        }
        LOGGER.VERBOSE_LOG(" * Evaluating commands");
        for (var i in commands) {
          LOGGER.VERBOSE_LOG("   o " + commands[i]);
          eval(commands[i]);
        }
      }//end of readyState
    }
  }
};
