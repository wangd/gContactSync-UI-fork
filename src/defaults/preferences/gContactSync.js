// refresh interval in minutes
pref("extensions.gContactSync.refreshInterval", 30);
// the name of the address book to sync with
pref("extensions.gContactSync.addressBookName", "Google Contacts");
// the number of contacts supported.  Automatically raised, if necessary.
pref("extensions.gContactSync.maxContacts", 5000);
// set to true if Google should be updated when a contact changes in Thunderbird
// and Google.  False to update TB instead.
pref("extensions.gContactSync.updateGoogleInConflicts", true);
// set to true to receive a prompt when gContactSync is going to remove a duplicate.
pref("extensions.gContactSync.confirmDuplicates", true);
// set to true to enable an extended method of copying/moving cards that copies
// the extra attributes added by this extension
pref("extensions.gContactSync.overrideCopy", true);
// how long gContactSync should wait to sync after the address book is opened
pref("extensions.gContactSync.initialDelay", 500);
// set to true to enable verbose logging (recommended)
pref("extensions.gContactSync.verboseLog", true);
// set to true to enable automatic synchronizing when Thunderbird opens and after the sync delay
pref("extensions.gContactSync.autoSync", true);
// set to true to synchronize groups with mailing lists
pref("extensions.gContactSync.syncGroups", true);
// set to true to remove the old addresses when they are converted to the new format
pref("extensions.gContactSync.removeOldAddresses", true);
// extended properties to sync
pref("extensions.gContactSync.extended1", "WebPage1");
pref("extensions.gContactSync.extended2", "WebPage2");
pref("extensions.gContactSync.extended3", "Department");
pref("extensions.gContactSync.extended4", "FirstName");
pref("extensions.gContactSync.extended5", "LastName");
pref("extensions.gContactSync.extended6", "NickName");
pref("extensions.gContactSync.extended7", "PreferMailFormat");
pref("extensions.gContactSync.extended8", "AllowRemoteContent");
pref("extensions.gContactSync.extended9", "Custom1");
pref("extensions.gContactSync.extended10", "Custom2");
pref("extensions.gContactSync.syncExtended", true);
pref("extensions.gContactSync@pirules.net.description", "chrome://gContactSync/locale/gcontactsync.properties");
