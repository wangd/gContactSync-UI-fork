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

import com.google.api.client.http.HttpTransport;
import com.google.api.client.util.Key;

import org.pirules.gcontactsync.android.model.Entry;
import org.pirules.gcontactsync.android.model.contact.ContactCursor;
import org.pirules.gcontactsync.android.model.contact.ContactEntry;
import org.pirules.gcontactsync.android.model.elements.Element;

import android.database.Cursor;

import java.io.IOException;
import java.util.ArrayList;

/**
 * Stores information about a group, including contacts within the group.
 * Contacts must be added manually through addContact.
 * @author Josh Geenen
 */
public class GroupEntry extends Entry {

  // Note that Entry already has most of the necessary attributes.
  
  /**
   * Stores the system group information (just the non-localized name, id).
   */
  @Key("gContact:systemGroup")
  public Element systemGroup;
  
  /** The contacts in this group. */
  private ArrayList<ContactEntry> contacts;
  
  /**
   * The cursor for the contacts in this group.
   * This is set and updated when necessary.
   */
  private ContactCursor cursor;
  
  /**
   * Adds a contact to this group internally.  This does NOT modify the group to
   * actually contain the contact in Google Contacts.
   * @param contact The contact to add to this group object.
   */
  public void addContact(ContactEntry contact) {
    
    if (contacts == null) {
      contacts = new ArrayList<ContactEntry>();
    }
    
    // TODO - could check & set group membership here and update the contact...
    contacts.add(contact);
    
    cursor = null; // invalidate the cursor since a contact was added
  }
  
  /**
   * Removes the given contact from this group.  This does NOT modify the contact
   * to make it actually be removed from this group.
   * @param contact The contact to remove from this group object.
   * @return true if the contact was in this group and removed.
   */
  public boolean removeContact(ContactEntry contact) {
    if (contacts != null && contacts.remove(contact)) {
      cursor = null; // invalidate the cursor since a contact was removed
      return true;
    }
    return false;
  }
  
  /**
   * Gets the list of contacts in this group.
   * @return The list of contacts in this group.
   */
  public final ArrayList<ContactEntry> getContacts() {
    return contacts;
  }
  
  /**
   * Gets a ContactCursor for this group's contacts.
   * @return A ContactCursor for this group's contacts.
   */
  public Cursor getContactsCursor() {
    // Create the cursor if necessary, else return the existing cursor
    if (cursor == null) {
      cursor = new ContactCursor(contacts);
    }
    return cursor;
  }
  
  /**
   * Returns a String representation of this group.  Right now this is just the
   * group's title without the 'System Group: ' part that system groups have.
   * @see org.pirules.gcontactsync.android.model.Entry#toString()
   */
  @Override
  public String toString() {
    // Use the system group ID if present else the title
    String ret = systemGroup != null ? systemGroup.id : title;
    return ret == null ? "" : ret;
  }
  
  /**
   * Returns a string representing the contact feed for this group.
   * @return A string representing the contact feed for this group.
   */
  public String getContactFeedLink() {
    return id;
  }

  /**
   * Returns a copy of this entry.
   * @see org.pirules.gcontactsync.android.model.Entry#clone()
   */
  @Override
  public GroupEntry clone() {
    GroupEntry ret = (GroupEntry) super.clone();
    ret.contacts = contacts;
    ret.cursor = null;
    return ret;
  }
  
  /**
   * Adds this group to the authenticated user's group feed and returns the new
   * group.  The new group object should be used, and this one discarded, as the
   * new group will have an assigned ID, edit link, etc.
   * @param transport The HttpTransport to use.
   * @return The inserted GroupEntry, or null if the insertion failed.
   */
  public GroupEntry insert(HttpTransport transport) {
    try {
      return (GroupEntry) executeInsert(transport, GroupUrl.forAllGroupsFeed());
    } catch (IOException exception) {
      exception.printStackTrace();
      return null;
    }
  }
}
