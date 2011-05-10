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

package org.pirules.gcontactsync.android.model.contact;

import java.util.ArrayList;
import java.util.Collections;

import android.database.MatrixCursor;

/**
 * 
 * @author Josh Geenen (joshgeenen@gmail.com)
 */
public class ContactCursor extends MatrixCursor {
  
  private ArrayList<ContactEntry> contacts = new ArrayList<ContactEntry>();
  private static final String [] CONTACTS_CURSOR_PROJECTION = new String [] {
    "_id",
    "DisplayName",
    "GivenName",
    "FamilyName"
  };
  public ContactCursor(ArrayList<ContactEntry> contacts) {
    super(CONTACTS_CURSOR_PROJECTION, contacts == null ? 0 : contacts.size());
    if (contacts != null) {
      Collections.sort(contacts, new ContactComparator());
      for (ContactEntry contact : contacts) {
        addContact(contact);
      }
    }
  }
  private void addContact(ContactEntry contact) {
    String givenName = contact.name != null ? contact.name.givenName : null;
    String familyName = contact.name != null ? contact.name.familyName : null;
    addRow(new Object [] {contacts.size(), contact.toString(), givenName, familyName});
    contacts.add(contact);
  }
}
