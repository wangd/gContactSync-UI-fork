/*
 * Copyright (c) 2011 Josh Geenen
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

import org.pirules.gcontactsync.android.model.Entry;
import org.pirules.gcontactsync.android.model.contact.ContactCursor;
import org.pirules.gcontactsync.android.model.contact.ContactEntry;

import android.database.Cursor;

import java.util.ArrayList;

/**
 * @author Josh Geenen
 */
public class GroupEntry extends Entry {

  private ArrayList<ContactEntry> contacts;
  private ContactCursor cursor;
  
  public void addContact(ContactEntry contact) {
    if (contacts == null) {
      contacts = new ArrayList<ContactEntry>();
    }
    contacts.add(contact);
    cursor = null; // invalidate the cursor since a contact was added
  }
  
  public boolean removeContact(ContactEntry contact) {
    if (contacts != null && contacts.remove(contact)) {
      cursor = null; // invalidate the cursor since a contact was removed
      return true;
    }
    return false;
  }
  
  public final ArrayList<ContactEntry> getContacts() {
    return contacts;
  }
  
  public Cursor getContactsCursor() {
    // Create the cursor if necessary, else return the existing cursor
    if (cursor == null) {
      cursor = new ContactCursor(contacts);
    }
    return cursor;
  }
  
  @Override
  public String toString() {
    return title != null ? title.replaceFirst("System Group: ", "") : "";
  }
  
  public String getContactFeedLink() {
    return id;
  }

  @Override
  public GroupEntry clone() {
    // TODO - need to copy contacts?
    return (GroupEntry) super.clone();
  }
}
