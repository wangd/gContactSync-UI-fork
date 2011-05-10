/*
 * Copyright (c) 2010 Google Inc., 2011 Josh Geenen
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

package org.pirules.gcontactsync.android;

import com.google.api.client.googleapis.GoogleHeaders;
import com.google.api.client.http.HttpResponse;
import com.google.api.client.http.HttpResponseException;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.apache.ApacheHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;

import org.pirules.gcontactsync.android.model.contact.ContactEntry;
import org.pirules.gcontactsync.android.model.contact.ContactFeed;
import org.pirules.gcontactsync.android.model.contact.ContactUrl;
import org.pirules.gcontactsync.android.model.contact.elements.GContactGroupMembershipInfo;
import org.pirules.gcontactsync.android.model.group.GroupCursor;
import org.pirules.gcontactsync.android.model.group.GroupEntry;
import org.pirules.gcontactsync.android.model.group.GroupFeed;
import org.pirules.gcontactsync.android.model.group.GroupUrl;
import org.pirules.gcontactsync.android.util.HttpRequestWrapper;
import org.pirules.gcontactsync.android.util.Util;

import android.content.Context;

import android.view.Window;

import android.widget.ExpandableListView.ExpandableListContextMenuInfo;

import android.content.pm.PackageManager;

import android.view.MenuInflater;

import android.content.pm.PackageManager.NameNotFoundException;

import android.content.pm.PackageInfo;

import android.widget.ExpandableListView.OnChildClickListener;

import android.app.Activity;

import android.widget.ExpandableListView;

import com.google.api.client.http.xml.atom.AtomParser;
import com.google.common.collect.Lists;

import android.accounts.Account;
import android.accounts.AccountManager;
import android.app.AlertDialog;
import android.app.Dialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.ContextMenu;
import android.view.ContextMenu.ContextMenuInfo;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Hashtable;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * gContactSync for Android
 * <p>
 * To enable logging of HTTP requests/responses, run this command: {@code adb shell setprop
 * log.tag.HttpTransport DEBUG}. Then press-and-hold a contact, and enable "Logging".
 * </p>
 * 
 * Originally based on Google's Calendar v2 Android Sample project by Yaniv Inbar
 *
 * @author Yaniv Inbar, Josh Geenen
 */
public final class ContactListActivity extends Activity {

  /** The type of auth token (cp = contacts) */
  private static final String AUTH_TOKEN_TYPE = "cp";
  
  /** The gdata version of the API */
  private static final String GDATA_VERSION = "3"; 

  /** Whether to enable logging by default */
  private static final boolean LOGGING_DEFAULT = false;
  
  // Dialog IDs
  private static final int DIALOG_ACCOUNTS = 0;
  private static final int DIALOG_ABOUT = 1;

  // Context menu IDs
  private static final int CONTEXT_LOGGING = 0;
  private static final int CONTEXT_SHOW_CONTACT = 1;
  private static final int CONTEXT_EMAIL_CONTACT = 2;
  private static final int CONTEXT_DELETE_CONTACT = 3;

  private static final int REQUEST_AUTHENTICATE = 0;

  private static final String PREF = "org.pirules.gcontactsync.android.prefs";


  static HttpTransport transport;

  private String authToken;
  
  boolean mUpdateInProgress = false;
  
  /** The contact that was last selected for viewing */
  public static ContactEntry mSelectedContact = null;

  /** SDK 2.2 ("FroYo") version build number. */
  private static final int FROYO = 8;

  // These are both overwritten at runtime with manifest info
  private String mAppVersion = "Unknown Version";
  private String mPackageName = "Unknown Package";
  private String mActivityName = "Unknown Activity";
  
  // UI Elements
  ExpandableListView mListView = null;
  static GCSTreeAdapter mAdapter = null;
  
  

  public ContactListActivity() {
    if (Build.VERSION.SDK_INT <= FROYO) {
      transport = new ApacheHttpTransport();
    } else {
      transport = new NetHttpTransport();
    }
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    requestWindowFeature(Window.FEATURE_INDETERMINATE_PROGRESS);
    setProgressBarIndeterminate(true);
    setProgressBarIndeterminateVisibility(true);
    
    // Get the logging settings
    SharedPreferences settings = getSharedPreferences(PREF, 0);
    setLogging(settings.getBoolean("logging", LOGGING_DEFAULT));

    // Get the basic application data
    try {
      PackageManager pm = getPackageManager();
      PackageInfo packageInfo = pm.getPackageInfo(getPackageName(), 0);
      mAppVersion = packageInfo.versionName;
      mPackageName = packageInfo.packageName;
      mActivityName = (String) pm.getApplicationLabel(pm.getApplicationInfo(mPackageName, PackageManager.GET_META_DATA));
    }
    catch (NameNotFoundException e) {
      handleException(e);
    }
    
    // Setup the default headers for this application
    GoogleHeaders headers = new GoogleHeaders();
    headers.setApplicationName(mPackageName + "/" + mAppVersion);
    headers.gdataVersion = GDATA_VERSION;
    HttpRequestWrapper.defaultHeaders = headers;
    AtomParser parser = new AtomParser();
    parser.namespaceDictionary = Util.DICTIONARY;
    HttpRequestWrapper.parser = parser;
    
    // Adapter for the list of groups and contacts
    //mAdapter = new GCSExpandableListAdapter(ContactListActivity.this);
    /*mAdapter = new GCSExpandableAdapter(
      this,
      null,
      R.layout.expandable_group_layout,
      R.layout.expandable_child_layout,
      new String [] {"title"},
      new int [] {R.id.tvGroupName},
      new String [] {"DisplayName"},
      new int [] {R.id.tvChildName}
    );
    */
    
    setContentView(R.layout.contact_groups);
    
    mListView = (ExpandableListView)findViewById(R.id.expandableListView1);
    mListView.setFastScrollEnabled(true);
    mListView.setTextFilterEnabled(true);
    registerForContextMenu(mListView);
    
    mListView.setOnChildClickListener(new OnChildClickListener() {     
      @Override
      public boolean onChildClick(ExpandableListView listView, View view, int groupPosition, int childPosition, long arg4) {
        if (mUpdateInProgress) {
          return true;
        }
        
        mSelectedContact = mAdapter.getContact(groupPosition, childPosition);
        launchShowContact();
        return true;
      }
    });
    
    gotAccount(false);

  }

  @Override
  protected Dialog onCreateDialog(int id) {
    switch (id) {
      case DIALOG_ACCOUNTS:
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Select a Google Account");
        final AccountManager manager = AccountManager.get(this);
        final Account[] accounts = manager.getAccountsByType("com.google");
        final int size = accounts.length;
        String[] names = new String[size];
        for (int i = 0; i < size; i++) {
          names[i] = accounts[i].name;
        }
        builder.setItems(names, new DialogInterface.OnClickListener() {
          public void onClick(DialogInterface dialog, int which) {
            gotAccount(manager, accounts[which]);
          }
        });
        return builder.create();
      case DIALOG_ABOUT:
        new AlertDialog.Builder(ContactListActivity.this)
          .setTitle("About " + mActivityName).setMessage(
            "Author: Josh Geenen\n" +
            "Support: joshgeenen@gmail.com\n" +
            "Version: " + mAppVersion
          )
          .setPositiveButton("OK",
            new DialogInterface.OnClickListener() {
             public void onClick(DialogInterface dialog, int which) {}
            })
          .show();
    }
    return null;
  }

  private void gotAccount(boolean tokenExpired) {
    SharedPreferences settings = getSharedPreferences(PREF, 0);
    String accountName = settings.getString("accountName", null);
    if (accountName != null) {
      AccountManager manager = AccountManager.get(this);
      Account[] accounts = manager.getAccountsByType("com.google");
      int size = accounts.length;
      for (int i = 0; i < size; i++) {
        Account account = accounts[i];
        if (accountName.equals(account.name)) {
          if (tokenExpired) {
            manager.invalidateAuthToken("com.google", this.authToken);
          }
          gotAccount(manager, account);
          return;
        }
      }
    }
    showDialog(DIALOG_ACCOUNTS);
  }

  void gotAccount(final AccountManager manager, final Account account) {
    SharedPreferences settings = getSharedPreferences(PREF, 0);
    SharedPreferences.Editor editor = settings.edit();
    editor.putString("accountName", account.name);
    editor.commit();
    new Thread() {

      @Override
      public void run() {
        try {
          final Bundle bundle =
              manager.getAuthToken(account, AUTH_TOKEN_TYPE, true, null, null).getResult();
          runOnUiThread(new Runnable() {

            public void run() {
              try {
                if (bundle.containsKey(AccountManager.KEY_INTENT)) {
                  Intent intent = bundle.getParcelable(AccountManager.KEY_INTENT);
                  int flags = intent.getFlags();
                  flags &= ~Intent.FLAG_ACTIVITY_NEW_TASK;
                  intent.setFlags(flags);
                  startActivityForResult(intent, REQUEST_AUTHENTICATE);
                } else if (bundle.containsKey(AccountManager.KEY_AUTHTOKEN)) {
                  authenticated(bundle.getString(AccountManager.KEY_AUTHTOKEN));
                }
              } catch (Exception e) {
                handleException(e);
              }
            }
          });
        } catch (Exception e) {
          handleException(e);
        }
      }
    }.start();
  }

  @Override
  protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);
    switch (requestCode) {
      case REQUEST_AUTHENTICATE:
        if (resultCode == RESULT_OK) {
          gotAccount(false);
        } else {
          showDialog(DIALOG_ACCOUNTS);
        }
        break;
    }
  }

  void authenticated(String authToken) {
    this.authToken = authToken;
    HttpRequestWrapper.defaultHeaders.setGoogleLogin(authToken);
    //RedirectHandler.resetSessionId(transport);
    executeRefreshContacts();
  }

  @Override
  public boolean onCreateOptionsMenu(Menu menu) {
    MenuInflater inflater = getMenuInflater();
    inflater.inflate(R.menu.contact_groups_menu, menu);
    return true;
  }

  @Override
  public boolean onOptionsItemSelected(MenuItem item) {
    if (mUpdateInProgress) {
      return true;
    }
    switch (item.getItemId()) {
      /*
      case R.id.miAdd:
        ContactUrl url = ContactUrl.forAllContactsFeed();
        ContactEntry contact = new ContactEntry();
        contact.title = "Contact " + new DateTime(new Date());
        try {
          contact.executeInsert(transport, url);
        } catch (IOException e) {
          handleException(e);
        }
        executeRefreshContacts();
        return true;
      */
      case R.id.miRefresh:
        executeRefreshContacts();
        return true;
      case R.id.miSwitchAccount:
        showDialog(DIALOG_ACCOUNTS);
        return true;
      case R.id.miAbout:
        showDialog(DIALOG_ABOUT);
        return true;
      default:
        return super.onOptionsItemSelected(item);
    }
  }

  @Override
  public void onCreateContextMenu(ContextMenu menu, View v, ContextMenuInfo menuInfo) {
    
    if (mUpdateInProgress) {
      return;
    }
    super.onCreateContextMenu(menu, v, menuInfo);
    
    long packedPosition = ((ExpandableListContextMenuInfo) menuInfo).packedPosition;
    int type = ExpandableListView.getPackedPositionType(packedPosition);
    
    if (type == ExpandableListView.PACKED_POSITION_TYPE_CHILD) {
      int groupIndex = ExpandableListView.getPackedPositionGroup(packedPosition);
      int childIndex = ExpandableListView.getPackedPositionChild(packedPosition);
      
      mSelectedContact = mAdapter.getContact(groupIndex, childIndex);
      menu.setHeaderTitle(mSelectedContact.toString());
      menu.add(0, CONTEXT_SHOW_CONTACT, 0, "Show Contact Details");
      menu.add(0, CONTEXT_EMAIL_CONTACT, 0, R.string.send_email);
      menu.add(0, CONTEXT_DELETE_CONTACT, 0, R.string.delete_confirm_title);
    }
    
    // TODO implement
    //menu.add(0, CONTEXT_DELETE, 0, "Delete");
    SharedPreferences settings = getSharedPreferences(PREF, 0);
    boolean logging = settings.getBoolean("logging", false);
    menu.add(0, CONTEXT_LOGGING, 0, "Enable Logging").setCheckable(true).setChecked(logging);
  }

  @Override
  public boolean onContextItemSelected(MenuItem item) {
    if (mUpdateInProgress) {
      return true;
    }
    switch (item.getItemId()) {
      case CONTEXT_LOGGING:
        SharedPreferences settings = getSharedPreferences(PREF, 0);
        boolean logging = settings.getBoolean("logging", LOGGING_DEFAULT);
        setLogging(!logging);
        return true;
      case CONTEXT_EMAIL_CONTACT:
        emailSelectedContact(this);
        return true;
      case CONTEXT_DELETE_CONTACT:
        deleteSelectedContact(this, null);
        return true;
      case CONTEXT_SHOW_CONTACT:
        launchShowContact();
        return true;
      default:
        return super.onContextItemSelected(item);
    }
  }
  
  public static void emailSelectedContact(final Context context) {

    ContactEntry contact = ContactListActivity.mSelectedContact;
    if (contact == null || contact.email == null || contact.email.size() < 1) {
      new AlertDialog.Builder(context)
      .setIcon(android.R.drawable.ic_dialog_alert)
      .setTitle(context.getString(R.string.error))
      .setMessage(context.getString(R.string.no_email_address))
      .setNeutralButton(context.getString(R.string.ok), null)
      .show();
      return;
    }

    context.startActivity(
      new Intent(android.content.Intent.ACTION_SEND)
      .putExtra(android.content.Intent.EXTRA_EMAIL, new String[] {contact.email.get(0).address})
      .setType("plain/text")
    );
  }
  
  public static void deleteSelectedContact(final Context context, final ShowContactActivity activity) {
    if (ContactListActivity.mSelectedContact != null) {
      new AlertDialog.Builder(context)
      .setIcon(android.R.drawable.ic_dialog_alert)
      .setTitle(context.getString(R.string.delete_confirm_title) + " '" + mSelectedContact + "'")
      .setMessage(R.string.delete_confirm_message)
      .setPositiveButton(context.getString(R.string.yes), new DialogInterface.OnClickListener() {
          @Override
          public void onClick(DialogInterface dialog, int which) {
            if (!ContactListActivity.mSelectedContact.deleteContact(transport)) {
              new AlertDialog.Builder(context)
              .setIcon(android.R.drawable.ic_dialog_alert)
              .setTitle(R.string.error)
              .setMessage(R.string.delete_failed)
              .setNeutralButton(R.string.ok, null)
              .show();
            }
            else {
              // TODO remove contact
              //ContactListActivity.mAdapter.removeContact(mSelectedContact);
              ContactListActivity.mSelectedContact = null;
              
              if (activity != null) {
                activity.finish();
              }
            }
          }

      })
      .setNegativeButton(R.string.no, null)
      .show();
    }
  }
  
  /**
   * Launches the ShowContactActivity with the currently selected contact.
   */
  protected void launchShowContact() {
    if (!mUpdateInProgress && mSelectedContact != null) {
      Intent i = new Intent(this, ShowContactActivity.class);
      startActivity(i);
    }
  }

  private void executeRefreshContacts() {
    
    mUpdateInProgress = true;
    
    setProgressBarIndeterminateVisibility(mUpdateInProgress);
    
    final Context context = this;

    new Thread() {

      @Override
      public void run() {

        /** All the contacts */
        List<ContactEntry> contacts = Lists.newArrayList();
        
        /** All the groups */
        final ArrayList<GroupEntry> groups = Lists.newArrayList();

        /** Maps groups by their identifiers */
        Hashtable<String, GroupEntry> groupsMap = new Hashtable<String, GroupEntry>();

        try {

          ContactUrl contactUrl = ContactUrl.forAllContactsFeed();
          ContactFeed contactFeed = ContactFeed.executeGet(transport, contactUrl);
          if (contactFeed.contacts != null) {
            contacts.addAll(contactFeed.contacts);
          }

          GroupUrl groupUrl = GroupUrl.forAllGroupsFeed();
          GroupFeed groupFeed = GroupFeed.executeGet(transport, groupUrl);
          GroupEntry allContacts = new GroupEntry();
          allContacts.id = null;
          allContacts.title = "All Contacts";
          groups.add(allContacts);
          if (groupFeed.groups != null) {
            groups.addAll(groupFeed.groups);
          }

          // Create the group map
          for (GroupEntry group : groups) {
            if (group.id != null) {
              groupsMap.put(group.id, group);
            }
          }

          for (ContactEntry contact : contacts) {
            allContacts.addContact(contact);
            if (contact.groupMembership == null) {
              continue;
            }
            for (GContactGroupMembershipInfo info : contact.groupMembership) {
              if (!info.deleted && info.href != null) {
                GroupEntry group = groupsMap.get(info.href);
                if (group != null) {
                  group.addContact(contact);
                }
              }
            }
          }
        } catch (IOException e) {
          runOnUiThread(new Runnable() {

            public void run() {
              new AlertDialog.Builder(context)
                .setTitle("Error")
                .setMessage("Unable to retrieve your contacts.  Make sure you have a valid Internet connection.")
                .setNeutralButton("OK", new DialogInterface.OnClickListener() {
                  public void onClick(DialogInterface dialog, int id) {
                    dialog.cancel();
                    }
                  })
                .show();
            }
          });
          handleException(e);
        }

        runOnUiThread(new Runnable() {

          public void run() {
            mAdapter = new GCSTreeAdapter(
              context,
              new GroupCursor(groups),
              R.layout.expandable_group_layout,
              R.layout.expandable_child_layout,
              new String [] {"title"},
              new int [] {R.id.tvGroupName},
              new String [] {"DisplayName"},
              new int [] {R.id.tvChildName}
            );
            //mAdapter.setGroups(groups);
            mListView.setAdapter(mAdapter);
            
            mUpdateInProgress = false;

            setProgressBarIndeterminateVisibility(mUpdateInProgress);
          }
        });

      }
    }.start();

  }

  private void setLogging(boolean logging) {
    Logger.getLogger("org.pirules.gcontactsync.android").setLevel(logging ? Level.CONFIG : Level.OFF);
    SharedPreferences settings = getSharedPreferences(PREF, 0);
    boolean currentSetting = settings.getBoolean("logging", false);
    if (currentSetting != logging) {
      SharedPreferences.Editor editor = settings.edit();
      editor.putBoolean("logging", logging);
      editor.commit();
    }
  }

  void handleException(Exception e) {
    e.printStackTrace();
    SharedPreferences settings = getSharedPreferences(PREF, 0);
    boolean log = settings.getBoolean("logging", false);
    if (e instanceof HttpResponseException) {
      HttpResponse response = ((HttpResponseException) e).response;
      int statusCode = response.statusCode;
      try {
        response.ignore();
      } catch (IOException e1) {
        e1.printStackTrace();
      }
      if (statusCode == 401 || statusCode == 403) {
        gotAccount(true);
        return;
      }
      if (log) {
        try {
          Log.e(mActivityName, response.parseAsString());
        } catch (IOException parseException) {
          parseException.printStackTrace();
        }
      }
    }
    if (log) {
      Log.e(mActivityName, e.getMessage(), e);
    }
  }
}
