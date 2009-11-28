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

window.addEventListener("load",
  /** Initializes the FileIO class when the window has finished loading */
  function gCS_FileIOLoadListener(e) {
    com.gContactSync.FileIO.init();
  },
false);

/**
 * A class for reading, writing, and appending to files with an nsIFile for
 * storing data, authentication info, and logs.
 * @class
 */
com.gContactSync.FileIO = {
  mLogFile: null,
  fileNames: {
    LOG_FILE: "gcontactsync_log.txt" // stores the log from the last sync
  },
  /**
   * Initializes the files contained in this class.
   * Also creates the log directory, if necessary.
   */
  init: function FileIO_init() {
    var directory = this.getProfileDirectory();
    // if the directory doesn't exist yet
    // This really shouldn't happen since this currently uses the profile dir
    if (!directory.exists()) {
      // create the directory (type = 1) - rw for the user and r for others
      try { directory.create("1", parseInt("755", 8)); } catch (e) {}
      // if it still doesn't exist let the user know, then quit
      if (!directory.exists()) {
        alert(com.gContactSync.StringBundle.getStr("couldntMkDir") + "\n" + directory.path);
        throw "Error - could not create the following directory: " + directory.path;
      }
    }
    if (!directory.isDirectory()) {
      alert(com.gContactSync.StringBundle.getStr("isNotDir") + "\n" + directory.path);
      throw "Error - " + directory.path + " is not a directory.";
    }
    if (!directory.isWritable()) {
      alert(com.gContactSync.StringBundle.getStr("notWritable") + "\n" + directory.path);
      throw "Error - Cannot write to the following directory: " + directory.path;
    }
    com.gContactSync.FileIO.mLogFile = directory;
    com.gContactSync.FileIO.mLogFile.append(this.fileNames.LOG_FILE);
    if (com.gContactSync.FileIO.mLogFile.exists && !com.gContactSync.FileIO.mLogFile.isWritable) {
      alert(com.gContactSync.StringBundle.getStr("logNotWritable") + "\n" + com.gContactSync.FileIO.mLogFile.path);
      throw "Error - cannot write to the log file: " + com.gContactSync.FileIO.mLogFile.path;
    }
  },
  /**
   * Gets the the file in the extension's directory with the given name.
   * @param aName {string} The name of the file to get.
   * @returns {nsIFile} The file with the given name in the extension's
   *                   directory.
   */
  getFileInExtDir: function FileIO_getFileInExtDir(aName) {
    var MY_ID = "gContactSync@pirules.net",
        em    = Components.classes["@mozilla.org/extensions/manager;1"]
                       .getService(Components.interfaces.nsIExtensionManager);
    return em.getInstallLocation(MY_ID).getItemFile(MY_ID, aName);
  },
  /**
   * Returns an nsIFile of the current profile directory of the application.
   * @returns {nsIFile} The current profile directory of the application.
   */
  getProfileDirectory: function FileIO_getProfileDirectory() {
    return Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
  },
  /**
   * Opens the given file and returns an array of the lines within it.
   * @param aFile  {nsIFile} The nsIFile to read.
   * @returns {array} An array of the lines in the file or [] if there is an
   *                 error.
   */
  readFile: function FileIO_readFile(aFile) {
    this.checkFile(aFile);
    if (!aFile.exists())
      return [];
    try {
      var line    = {},
          lines   = [],
          hasmore,
          istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                              .createInstance(Components.interfaces.nsIFileInputStream);
      istream.init(aFile, 0x01, 0444, 0);
      istream.QueryInterface(Components.interfaces.nsILineInputStream);

      do {
        hasmore = istream.readLine(line);
        lines.push(line.value);
      } while (hasmore);

      istream.close();
      return lines;
    }
    catch (e) {
      throw "Unable to read from file: " + aFile + "\n" + e;
    }
  },
  /**
   * Writes the string data to the nsIFile aFile.
   * NOTE: This will delete any existing text in the file.
   * @param aFile  {nsIFile} The nsIFile to which the string is written.
   * @param aData  {string}  The string of data to write to the file.
   * @returns {boolean} True if there is no error.
   */
  writeToFile: function FileIO_writeToFile(aFile, aData) {
    this.checkFile(aFile);
    if (!aData)
      return false;
    try {
      var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                               .createInstance(Components.interfaces.nsIFileOutputStream);
      foStream.init(aFile, 0x02 | 0x08 | 0x20, 0666, 0);
      foStream.write(aData, aData.length);
      foStream.close();
      return true;
    }
    catch (e) {
      throw "Unable to write '" + aData + "' to file: " + aFile + "\n" + e;
    }
    return false;
  },
  /**
   * Appends the string aData to the nsIFile aFile.
   * @param aFile {nsIFile} The nsIFile to which the string is appended.
   * @param aData {string} The string of data to append to the file.
   * @returns {boolean} True if there is no error.
   */
  appendToFile: function FileIO_appendToFile(aFile, aData) {
    if (!aData)
      return false;
    this.checkFile(aFile);
    try {
      var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                               .createInstance(Components.interfaces.nsIFileOutputStream);
      if (aFile.exists())
        foStream.init(aFile, 0x02 | 0x10, 0666, 0);
      else
        foStream.init(aFile, 0x02 | 0x08 | 0x20, 0666, 0);
      foStream.write(aData, aData.length);
      foStream.close();
      return true;
    }
    catch (e) {
      throw "Unable to append '" + aData + "' to file: " + aFile + "\n" + e;
    }
    return false;
  },
  /**
   * Checks that an argument is not null, is an instance of nsIFile, and that,
   * if it exists, that it is a file (not a directory).
   * @param aFile   {nsIFile} The file to check.
   * @param aCaller {string}  The name of the calling method.
   */
  checkFile: function FileIO_checkFile(aFile) {
    if (!aFile || !aFile instanceof Components.interfaces.nsIFile || (aFile.exists() && !aFile.isFile()))
      throw "Invalid File: " + aFile + " sent to the '" + this.checkFile.caller +
            "' method" + com.gContactSync.StringBundle.getStr("pleaseReport");
  }
};
