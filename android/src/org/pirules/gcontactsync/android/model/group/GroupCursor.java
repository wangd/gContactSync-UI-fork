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

package org.pirules.gcontactsync.android.model.group;

import java.util.ArrayList;

import android.database.MatrixCursor;

/**
 * 
 * @author Josh Geenen (joshgeenen@gmail.com)
 */
public class GroupCursor extends MatrixCursor {
  private static final String [] GROUPS_CURSOR_PROJECTION = new String [] {
    "_id",
    "title"
  };
  public ArrayList<GroupEntry> groups;
  /**
   * 
   */
  public GroupCursor(ArrayList<GroupEntry> groups) {
    super(GROUPS_CURSOR_PROJECTION, groups == null ? 0 : groups.size());
    addGroups(groups);
    this.groups = groups;
  }
  
  public void addGroups(ArrayList<GroupEntry> groups) {
    if (groups == null) {
      return;
    }
    int i = 0;
    for (GroupEntry group : groups) {
      addRow(new Object[] {i, group.title});
      ++i;
    }
  }
}
