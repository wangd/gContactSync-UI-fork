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

import org.pirules.gcontactsync.android.model.contact.ContactCursor;
import org.pirules.gcontactsync.android.model.contact.ContactEntry;
import org.pirules.gcontactsync.android.model.group.GroupCursor;
import org.pirules.gcontactsync.android.model.group.GroupEntry;

import java.util.ArrayList;

import android.content.Context;

import android.database.Cursor;

import android.widget.SimpleCursorTreeAdapter;

/**
 * 
 * @author Josh Geenen (joshgeenen@gmail.com)
 */
public class GCSTreeAdapter extends SimpleCursorTreeAdapter {

  public GCSTreeAdapter(Context context, GroupCursor groupCursor, int groupLayout,
                              int childLayout, String[] groupFrom, int[] groupTo, String[] childrenFrom,
                              int[] childrenTo) {
    
    super(context, groupCursor, groupLayout, groupFrom, groupTo, childLayout, childrenFrom,
      childrenTo);
  }
  
  public void removeGroup(GroupEntry group) {
    ArrayList<GroupEntry> groups = ((GroupCursor) getCursor()).groups;
    groups.remove(group);
    
    setGroupCursor(new GroupCursor(groups));
    notifyDataSetChanged();
  }
  
  public void removeContact(ContactEntry contact) {
    ArrayList<GroupEntry> groups = ((GroupCursor) getCursor()).groups;
    for (GroupEntry group : groups) {
      int groupPosition = groups.indexOf(group);
      if (group.contacts != null && group.contacts.remove(contact)) {
        this.setChildrenCursor(groupPosition, new ContactCursor(group.contacts));
      }
    }
  }

  /**
   * @see android.widget.CursorTreeAdapter#getChildrenCursor(android.database.Cursor)
   */
  @Override
  protected Cursor getChildrenCursor(Cursor groupCursor) {
    return ((GroupCursor) groupCursor).groups.get(groupCursor.getPosition()).getContactsCursor();
  }
  
  public GroupEntry getGroupEntry(int groupPosition) {
    return ((GroupCursor) this.getCursor()).groups.get(groupPosition);
  }
  public ContactEntry getContact(int groupPosition, int childPosition) {
    return getGroupEntry(groupPosition).contacts.get(childPosition);
  }

}
