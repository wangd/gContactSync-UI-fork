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

import android.widget.TextView;

import java.util.ArrayList;

import android.view.ViewGroup;

import android.view.LayoutInflater;

import android.view.View;

import android.content.Context;

import android.widget.ArrayAdapter;

/**
 * An adapter for the contact view activity which extends ArrayAdapter.
 * @author Josh Geenen (joshgeenen@gmail.com)
 */
public class ContactEntryListViewAdapter extends ArrayAdapter<String> {

  Context context;
  ArrayList<String> items = new ArrayList<String>();
  
  /**
   * 
   * @param context
   * @param textViewResourceId
   */
  public ContactEntryListViewAdapter(Context context, int textViewResourceId) {
    super(context, textViewResourceId);
    this.context = context;
  }
  
  @Override
  public void add(String object) {
    super.add(object);
    items.add(object);
  }
  
  /**
   * 
   * @see android.widget.ArrayAdapter#getView(int, android.view.View, android.view.ViewGroup)
   * @param position 
   */
  @Override
  public View getView(int position, View convertView, ViewGroup parent) {
    if (convertView == null) {
        LayoutInflater inflater = (LayoutInflater)context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        convertView = inflater.inflate(R.layout.contact_detail_layout, null);
    }
    String item = items.get(position);
    if (item != null) {
            TextView tt = (TextView) convertView.findViewById(R.id.tvContactDetailItem);
            if (tt != null) {
                  tt.setText(item);
            }
    }
    return convertView;
  }

}
