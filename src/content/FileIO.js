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
 * FileIO
 * A class for reading, writing, and appending to files with an nsIFile for
 * storing data, authentication info, and logs.
 * @class
 */
var FileIO = {
  mLogFile: null,
  fileNames: {
    LOG_FILE: "content/log/log.txt" // stores the log from the last sync
  },
  /**
   * FileIO.init
   * Initializes the files contained in this class.
   */
  init: function FileIO_init() {
    this.mLogFile = this.getFileInExtDir(this.fileNames.LOG_FILE);
  },
  /**
   * FileIO.getFileInExtDir
   * Gets the the file in the extension's directory with the given name.
   * @param aName  The name of the file to get.
   * @return An nsIFile with the given name in the extension's directory.
   */
  getFileInExtDir: function FileIO_getFileInExtDir(aName) {
    var MY_ID = "gContactSync@pirules.net";
    var em = Cc["@mozilla.org/extensions/manager;1"]
              .getService(Ci.nsIExtensionManager);
    return em.getInstallLocation(MY_ID).getItemFile(MY_ID, aName);
  },
  /**
   * FileIO.readFile
   * Opens the given file and returns an array of the lines within it.
   * @param aFile  The nsIFile to read.
   * @return An array of the lines in the file or [] if there is an error.
   */
  readFile: function FileIO_readFile(aFile) {
    this.checkFile(aFile);
    if (!aFile.exists())
      return [];
    try {
      var istream = Cc["@mozilla.org/network/file-input-stream;1"]
                     .createInstance(Ci.nsIFileInputStream);
      istream.init(aFile, 0x01, 0444, 0);
      istream.QueryInterface(Ci.nsILineInputStream);

      var line = {}, lines = [], hasmore;
      do {
        hasmore = istream.readLine(line);
        lines.push(line.value);
      } while(hasmore);

      istream.close();
      return lines;
    }
    catch(e) {
      LOGGER.LOG_WARNING("Unable to read from file: " + aFile, e);
      return [];
    }
  },
  /**
   * FileIO.writeToFile
   * Writes the string data to the nsIFile aFile.
   * NOTE: This will delete any existing text in the file.
   * @param aFile  The nsIFile to which the string is written.
   * @param aData  The string of data to write to the file.
   * @return True if there is no error.
   */
  writeToFile: function FileIO_writeToFile(aFile, aData) {
    this.checkFile(aFile);
    if (!aData)
      return;
    try {
      var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
                      .createInstance(Ci.nsIFileOutputStream);
      foStream.init(aFile, 0x02 | 0x08 | 0x20, 0666, 0);
      foStream.write(aData, aData.length);
      foStream.close();
      return true;
    }
    catch(e) {
      LOGGER.LOG_WARNING("Unable to write '" + aData + "' to file: " + aFile, e);
    }
  },
  /**
   * FileIO.appendToFile
   * Appends the string aData to the nsIFile aFile.
   * @param aFile  The nsIFile to which the string is appended.
   * @param aData  The string of data to append to the file.
   * @return True if there is no error.
   */
  appendToFile: function FileIO_appendToFile(aFile, aData) {
    if (!aData)
      return;
    this.checkFile(aFile);
    try {
      var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
                      .createInstance(Ci.nsIFileOutputStream);
      if (aFile.exists())
        foStream.init(aFile, 0x02 | 0x10, 0666, 0);
      else
        foStream.init(aFile, 0x02 | 0x08 | 0x20, 0666, 0);
      foStream.write(aData, aData.length);
      foStream.close();
      return true;
    }
    catch(e) {
      LOGGER.LOG_WARNING("Unable to append '" + aData + "' to file: " + aFile, e);
    }
  },
  /**
   * FileIO.checkFile
   * Checks that an argument is not null, is an instance of nsIFile, and that,
   * if it exists, that it is a file (not a directory).
   * @param aFile    The file to check.
   * @param aCaller  The name of the calling method.
   */
  checkFile: function FileIO_checkFile(aFile) {
    if (!aFile || !aFile instanceof Ci.nsIFile || (aFile.exists() && !aFile.isFile()))
      throw "Invalid File: " + aFile + " sent to the '" + this.checkFile.caller
            + "' method" + StringBundle.getStr("pleaseReport");
  }
};
