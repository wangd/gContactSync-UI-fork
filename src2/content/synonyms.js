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
/*
 * synonyms.js
 * Some synonyms to shorten commonly-used items and some functions that don't
 * fit anywhere else.
 */
var Cc = Components.classes;
var CC = Components.Constructor;
var Ci = Components.interfaces;
var Cr = Components.results;

var nsIAbCard      = Ci.nsIAbCard;
var dummyEmailName = "PrimaryEmail";
var version        = "0.2.10";

function serialize(aXML, aRemoveVersion) {
  if (!aXML)
    return "";
  try {
    var serializer = new XMLSerializer();
    var str = serializer.serializeToString(aXML);
    // source: http://developer.mozilla.org/en/E4X#Known_bugs_and_limitations
    str = str.replace(/^<\?xml\s+version\s*=\s*(["'])[^\1]+\1[^?]*\?>/, ""); // bug 336551
    return XML(str).toXMLString();
  }
  catch(e) {
    LOGGER.LOG_WARNING("Error while serializing the following XML: " + aXML, e);
  }
  return "";
}
function serializeFromText(aString) {
  // if verbose logging is disabled, don't replace >< with >\n< because it only
  // wastes time
  if (Preferences.mSyncPrefs.verboseLog.value) {
    var arr = aString.split("><");
    aString = arr.join(">\n<");
  }
  return aString;
}
function makeDummyEmail(aContact, ignorePref) {
  if (!aContact) throw "Invalid contact sent to makeDummyEmail";
  if (!ignorePref && !Preferences.mSyncPrefs.dummyEmail.value) {
    LOGGER.VERBOSE_LOG(" * Not setting dummy e-mail");
    return "";
  }
  var prefix = StringBundle.getStr("dummy1");
  var suffix = StringBundle.getStr("dummy2");
  var id = null;
  // GContact and TBContact may not be defined
  try {
    if (aContact instanceof GContact) {
      id = aContact.getID();
    }
    // otherwise it is from Thunderbird, so try to get the Google ID, if any
    else if (aContact instanceof TBContact) {
      id = aContact.getValue("GoogleID");
    }
    else {
      id = AbManager.getCardValue(aContact, "GoogleID");
    }
  } catch(e) {
    try {
      // try getting the card's value
      if (aCard.getProperty) // post Bug 413260
        id = aCard.getProperty("GoogleID", null);
      else // pre Bug 413260
        id = aCard.getStringAttribute("GoogleID");
    }
    catch (e) {}
  }

  if (id) {
    return prefix + id + suffix;
  }
  // if there is no ID make a random number
  else {
    var num = new String(Math.random());
    num = num.replace("0.", "");
    return prefix + num + suffix;
  }
}

function isDummyEmail(aEmail) {
  return aEmail && aEmail.indexOf && 
        aEmail.indexOf(StringBundle.getStr("dummy2")) != -1;
}

function changeDeleteListener(enable) {
    Preferences.setPref(Preferences.mSyncBranch,
                        Preferences.mSyncPrefs.listenerDeleteFromGoogle.label,
                        Preferences.mSyncPrefs.listenerDeleteFromGoogle.type,
                        enable);
}
