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
 * A simple, class that logs messages.
 * @class
 */
var LOGGER = {
  mErrorCount: 0,
  mWarningCount: 0,
  /**
   * Logger.LOG
   * Appends the message to the log file and adds a newline character after the
   * message.
   * @param aMessage The message to append.
   */
  LOG: function LOGGER_LOG(aMessage) {
    if (!aMessage)
      return;
    FileIO.appendToFile(FileIO.mLogFile, aMessage + "\n");
  },
  /**
   * Logger.VERBOSE_LOG
   * Logs the message if verbose logging is enabled.
   * @param aMessage The message to log.
   */
  VERBOSE_LOG: function LOGGER_VERBOSE_LOG(aMessage) {
    if (Preferences.mSyncPrefs.verboseLog.value)
      this.LOG(aMessage);
  },
  /**
   * LOGGER.LOG_ERROR
   * Logs an error and updates the error count.
   * @param aMessage The error message.
   * @param aError   Optional.  The exception caught.
   */
  LOG_ERROR: function LOGGER_LOG_ERROR(aMessage, aError) {
    var str = "***ERROR: " + aMessage;
    if (aError)
      str += "\nError Message:\n" + aError;
    str += StringBundle.getStr("pleaseReport");
    this.LOG(str);
    this.mErrorCount++;
  },
  /**
   * LOGGER.LOG_WARNING
   * Logs a warning and updates the warning count.
   * @param aWarningMessage The warning message with info about the problem.
   * @param aError          Optional.  The exception caught.
   */
  LOG_WARNING: function LOGGER_LOG_WARNING(aWarningMessage, aError) {
    var str = "***WARNING: " + aWarningMessage;
    if (aError)
      str += "\nError Message:\n" + aError;
    str += "\n" + StringBundle.getStr("pleaseReport");
    this.LOG(str);
    this.mWarningCount++;
  }
};
