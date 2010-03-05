// refresh interval in minutes
pref("extensions.gContactSync.refreshInterval", 30);
// the delay between synchronizing individual accounts (in ms)
pref("extensions.gContactSync.accountDelay", 5000);
// the name of the address book to sync with
pref("extensions.gContactSync.addressBookName", "Google Contacts");
// the number of contacts supported.  Automatically raised, if necessary.
pref("extensions.gContactSync.maxContacts", 10000);
// set to true if Google should be updated when a contact changes in Thunderbird
// and Google.  False to update TB instead.
pref("extensions.gContactSync.updateGoogleInConflicts", true);
// set to true to enable an extended method of copying/moving cards that copies
// the extra attributes added by this extension
pref("extensions.gContactSync.overrideCopy", true);
// how long gContactSync should wait to sync after the address book is opened
pref("extensions.gContactSync.initialDelay", 500);
// set to true to enable logging (recommended)
pref("extensions.gContactSync.enableLogging", true);
// set to true to enable verbose logging
pref("extensions.gContactSync.verboseLog", false);
// set to true to enable automatic synchronizing when Thunderbird opens and after the sync delay
pref("extensions.gContactSync.autoSync", true);
// set to true to synchronize groups with mailing lists
pref("extensions.gContactSync.syncGroups", true);
// set to true to remove the old addresses when they are converted to the new format
pref("extensions.gContactSync.removeOldAddresses", false);
// enable/disable the sync toolbar button
pref("extensions.gContactSync.enableSyncBtn", true);
// enable/disable the menu
pref("extensions.gContactSync.enableMenu", true);
// enable/disable read-only mode (TB gets updates from Google only)
pref("extensions.gContactSync.readOnly", false);
// enable/disable write-only mode (TB writes updates Google only)
pref("extensions.gContactSync.writeOnly", false);
// force setting the button's image through JavaScript
pref("extensions.gContactSync.forceBtnImage", true);
// only sync the My Contacts group
pref("extensions.gContactSync.myContacts", false);
// the name of the group to sync if myContacts is true
// this must be the system group or title of the group
pref("extensions.gContactSync.myContactsName", "Contacts");
// try to parse display names from Google into First and Last names
pref("extensions.gContactSync.parseNames", true);
// true = new phone labels in the abResultsTreeCols (column labels in the AB)
pref("extensions.gContactSync.phoneColLabels", true);
// set to true to add types to phone numbers (Work, Home, Mobile, etc.)
pref("extensions.gContactSync.phoneTypes", true);
// whether or not gContactSync should add new tree column labels
// in Thunderbird 3 (it can't work in 2)
pref("extensions.gContactSync.newColLabels", true);
// enable the dummy e-mail address (used when contacts don't have an address)
// if disabled this can cause problems w/ mailing lists...
// in cases where problems will almost certainly happen this pref is ignored
pref("extensions.gContactSync.dummyEmail", false);
// enable different IM URLs as defined in Overlay.js
pref("extensions.gContactSync.enableImUrls", true);
// the last version of gContactSync loaded
pref("extensions.gContactSync.lastVersion", "0");
// fix a CSS problem in Duplicate Contacts Manager
// https://www.mozdev.org/bugs/show_bug.cgi?id=21883
pref("extensions.gContactSync.fixDupContactManagerCSS", false);
// download contact photos (TB 3/SM 2+)
pref("extensions.gContactSync.getPhotos", true);
// upload contact photos (TB 3/SM 2+)
pref("extensions.gContactSync.sendPhotos", true);
// add a 'reset' menuitem to the AB context menu
pref("extensions.gContactSync.addReset", true);
// default plugin for new synchronization accounts
pref("extensions.gContactSync.Plugin", "Google");
// disable synchronization with all address books--even those setup to sync--by default
pref("extensions.gContactSync.Disabled", "false");
// enable address synchronization (this is buggy and disabled by default since the API isn't fully implemented...)
pref("extensions.gContactSync.syncAddresses", false);
// the interval between AB backups, in days
pref("extensions.gContactSync.backupInterval", 14);
// the minimum number of contacts about to be deleted for a confirmation dialog to be displayed
pref("extensions.gContactSync.confirmDeleteThreshold", 5);
// extended properties to sync
pref("extensions.gContactSync.extended1", "PreferMailFormat");
pref("extensions.gContactSync.extended2", "AllowRemoteContent");
pref("extensions.gContactSync.extended3", "AnniversaryYear");
pref("extensions.gContactSync.extended4", "AnniversaryMonth");
pref("extensions.gContactSync.extended5", "AnniversaryDay");
pref("extensions.gContactSync.extended6", "PopularityIndex");
pref("extensions.gContactSync.extended7", "Custom1");
pref("extensions.gContactSync.extended8", "Custom2");
pref("extensions.gContactSync.extended9", "Custom3");
pref("extensions.gContactSync.extended10", "Custom4");
pref("extensions.gContactSync.syncExtended", true);
pref("extensions.gContactSync.wikiURL",  "http://www.pirules.org/tikiwiki/");
pref("extensions.gContactSync.faqURL",   "http://www.pirules.org/tikiwiki/tiki-index.php?page=gContactSync+FAQs");
pref("extensions.gContactSync.forumURL", "http://www.pirules.org/forum/");
pref("extensions.gContactSync.errorURL", "http://www.pirules.org/extensions/submit_error.php?ext=gContactSync");
pref("extensions.gContactSync.googleContactsURL", "http://www.google.com/contacts");
pref("extensions.gContactSync@pirules.net.description", "chrome://gContactSync/locale/gcontactsync.properties");
