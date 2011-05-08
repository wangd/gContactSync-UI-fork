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
  
  // UI Elements
  private TextView mTextViewName;
  private ListView mListViewDetails;
  
  @Override
  public void onCreate(Bundle savedInstanceState) {
    ContactEntry contact = ContactListActivity.mSelectedContact;
    super.onCreate(savedInstanceState);
    
    setContentView(R.layout.show_contact);
    
    mTextViewName = (TextView)findViewById(R.id.textViewName);
    mListViewDetails = (ListView)findViewById(R.id.listViewDetails);
    
    mListViewDetails.setTextFilterEnabled(true);

    if (contact != null) {
      mTextViewName.setText(ContactListActivity.mSelectedContact.toString());
      
      ArrayAdapter<String> adapter = new ContactEntryListViewAdapter(this, R.layout.contact_detail_layout);
      
      Object [] detailElements = {
        contact.name,
        contact.email
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
      
      mListViewDetails.setAdapter(adapter);
    }
    
  }
}
