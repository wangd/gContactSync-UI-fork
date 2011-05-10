/*
 * Copyright (c) 2011 Josh Geenen.
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

import org.pirules.gcontactsync.android.model.contact.ContactEntry;

import android.view.MenuItem;

import android.view.Menu;
import android.view.MenuInflater;

import android.widget.ArrayAdapter;

import java.util.List;

import android.widget.TextView;

import android.widget.ListView;

import android.os.Bundle;

import android.app.Activity;

/**
 * 
 * @author joshgeenen@gmail.com (Josh Geenen)
 */
public class ShowContactActivity extends Activity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    ContactEntry contact = ContactListActivity.mSelectedContact;
    super.onCreate(savedInstanceState);

    setContentView(R.layout.show_contact);

    TextView textViewName = (TextView)findViewById(R.id.textViewName);
    ListView listViewDetails = (ListView)findViewById(R.id.listViewDetails);

    listViewDetails.setTextFilterEnabled(true);

    if (contact != null) {
      textViewName.setText(ContactListActivity.mSelectedContact.toString());

      ArrayAdapter<String> adapter = new ContactEntryListViewAdapter(this, R.layout.contact_detail_layout);

      Object [] detailElements = {
                                  contact.nickname,
                                  contact.occupation,
                                  contact.email,
                                  contact.phoneNumber,
                                  contact.ims,
                                  contact.birthday,
                                  contact.hobbies,
                                  contact.websites,
                                  contact.relations
      };

      for (Object element : detailElements) {
        if (element == null) {
          continue;
        }
        if (element instanceof List<?>) {
          for (Object item : (List<?>)element) {
            adapter.add(item.toString());
          }
        }
        else {
          adapter.add(element.toString());
        }
      }

      listViewDetails.setAdapter(adapter);
    }

  }

  @Override
  public boolean onCreateOptionsMenu(Menu menu) {
    MenuInflater inflater = getMenuInflater();
    inflater.inflate(R.menu.show_contact_menu, menu);
    return true;
  }

  @Override
  public boolean onOptionsItemSelected(MenuItem item) {
    switch (item.getItemId()) {
      case R.id.miDelete:
        ContactListActivity.deleteSelectedContact(this, this);
        return true;
      case R.id.miEmail:
        ContactListActivity.emailSelectedContact(this);
        return true;
      default:
        return super.onOptionsItemSelected(item);
    }

  }
}
