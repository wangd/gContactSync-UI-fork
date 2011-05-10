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

import com.google.api.client.googleapis.GoogleUrl;
import com.google.api.client.http.HttpTransport;

import org.pirules.gcontactsync.android.model.Entry;
import org.pirules.gcontactsync.android.model.contact.ContactCursor;
import org.pirules.gcontactsync.android.model.contact.ContactEntry;

import android.database.Cursor;

import java.io.IOException;
import java.util.ArrayList;


/**
 * @author Josh Geenen
 */
public class GroupEntry extends Entry {

  public ArrayList<ContactEntry> contacts;
  
  public void addContact(ContactEntry contact) {
    if (contacts == null) {
      contacts = new ArrayList<ContactEntry>();
    }
    contacts.add(contact);
  }
  
  public Cursor getContactsCursor() {
    return new ContactCursor(contacts);
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

  @Override
  public GroupEntry executeInsert(HttpTransport transport, GoogleUrl url) throws IOException {
    return (GroupEntry) super.executeInsert(transport, url);
  }

  public GroupEntry executePatchRelativeToOriginal(
      HttpTransport transport, GroupEntry original) throws IOException {
    return (GroupEntry) super.executePatchRelativeToOriginal(transport, original);
  }
}
