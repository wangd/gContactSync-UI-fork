/*
 * Copyright (c) 2011 Google Inc.
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

package org.pirules.gcontactsync.android.model;

import org.pirules.gcontactsync.android.model.contact.ContactEntry;
import org.pirules.gcontactsync.android.model.group.GroupEntry;

import java.util.List;

import android.content.Context;

import android.view.Gravity;

import android.widget.AbsListView;

import android.widget.TextView;

import android.view.View;
import android.view.ViewGroup;

import android.widget.BaseExpandableListAdapter;

/**
 * @author Josh Geenen
 *
 */
public class GCSExpandableListAdapter extends BaseExpandableListAdapter {
  
  Context context;
  
  public GCSExpandableListAdapter(Context context) {
    this.context = context;
  }
  
  private List<GroupEntry> groups;
  //private String[] groups = {};
  //private String[][] children = {};
  
  public void setGroups(List<GroupEntry> groups) {
    this.groups = groups;
    /*
    this.groups   = new String[groups.size()];
    this.children = new String[groups.size()][];
    int i = 0;
    for (GroupEntry group : groups) {
      this.groups[i] = group.title;
      if ()
      this.children[i] = new String[group.contacts == null ? 0 : group.contacts.size()];
      int j = 0;
      for (ContactEntry contact : group.contacts) {
        this.children[i][j] = contact.title;
        ++j;
      }
      ++i;
    }
    */
  }

  /* (non-Javadoc)
   * @see android.widget.ExpandableListAdapter#getChild(int, int)
   */
  @Override
  public Object getChild(int groupPosition, int childPosition) {
    GroupEntry group = groups.get(groupPosition);
    ContactEntry contact = group != null && group.contacts != null ? group.contacts.get(childPosition) : null;
    return contact != null ? contact.getName() : "";
  }

  /* (non-Javadoc)
   * @see android.widget.ExpandableListAdapter#getChildId(int, int)
   */
  @Override
  public long getChildId(int groupPosition, int childPosition) {
    return childPosition;
  }

  /* (non-Javadoc)
   * @see android.widget.ExpandableListAdapter#getChildView(int, int, boolean, android.view.View, android.view.ViewGroup)
   */
  @Override
  public View getChildView(int groupPosition, int childPosition, boolean isExpanded, View convertView, ViewGroup parent) {
    TextView textView = getGenericView();
    textView.setText(getChild(groupPosition, childPosition).toString());
    return textView;
  }

  /* (non-Javadoc)
   * @see android.widget.ExpandableListAdapter#getChildrenCount(int)
   */
  @Override
  public int getChildrenCount(int groupPosition) {
    GroupEntry group = groups.get(groupPosition);
    return group != null && group.contacts != null ? group.contacts.size() : 0;
  }

  /* (non-Javadoc)
   * @see android.widget.ExpandableListAdapter#getGroup(int)
   */
  @Override
  public Object getGroup(int groupPosition) {
    GroupEntry group = groups.get(groupPosition);
    return group != null ? group.getName() : "";
  }

  /* (non-Javadoc)
   * @see android.widget.ExpandableListAdapter#getGroupCount()
   */
  @Override
  public int getGroupCount() {
    return groups.size();
  }

  /* (non-Javadoc)
   * @see android.widget.ExpandableListAdapter#getGroupId(int)
   */
  @Override
  public long getGroupId(int groupPosition) {
    return groupPosition;
  }

  /* (non-Javadoc)
   * @see android.widget.ExpandableListAdapter#getGroupView(int, boolean, android.view.View, android.view.ViewGroup)
   */
  @Override
  public View getGroupView(int groupPosition, boolean isExpanded, View convertView, ViewGroup parent) {
    TextView textView = getGenericView();
    textView.setText(getGroup(groupPosition).toString());
    return textView;
  }

  /* (non-Javadoc)
   * @see android.widget.ExpandableListAdapter#hasStableIds()
   */
  @Override
  public boolean hasStableIds() {
    return true;
  }

  /* (non-Javadoc)
   * @see android.widget.ExpandableListAdapter#isChildSelectable(int, int)
   */
  @Override
  public boolean isChildSelectable(int groupPosition, int childPosition) {
    return true;
  }
  
  public TextView getGenericView() {
    // Layout parameters for the ExpandableListView
    AbsListView.LayoutParams lp = new AbsListView.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 64);

    TextView textView = new TextView(context);
    textView.setLayoutParams(lp);
    // Center the text vertically
    textView.setGravity(Gravity.CENTER_VERTICAL | Gravity.LEFT);
    // Set the text starting position
    textView.setPadding(36, 0, 0, 0);
    return textView;
  }


}
