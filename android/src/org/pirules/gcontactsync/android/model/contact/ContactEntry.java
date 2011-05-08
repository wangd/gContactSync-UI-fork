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

package org.pirules.gcontactsync.android.model.contact;

import com.google.api.client.googleapis.GoogleUrl;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.util.Key;

import org.pirules.gcontactsync.android.model.Entry;
import org.pirules.gcontactsync.android.model.contact.elements.GContactBirthday;
import org.pirules.gcontactsync.android.model.contact.elements.GContactWebsite;
import org.pirules.gcontactsync.android.model.contact.elements.GdEmail;
import org.pirules.gcontactsync.android.model.contact.elements.GContactGroupMembershipInfo;
import org.pirules.gcontactsync.android.model.contact.elements.GdIm;
import org.pirules.gcontactsync.android.model.contact.elements.GdName;
import org.pirules.gcontactsync.android.model.contact.elements.GdPhoneNumber;
import org.pirules.gcontactsync.android.model.elements.Element;
import org.pirules.gcontactsync.android.model.elements.Link;

import java.io.IOException;
import java.util.List;


/**
 * @author Josh Geenen
 */
public class ContactEntry extends Entry {

  @Key("gd:im")
  public List<GdIm> ims;
  
  @Key("gd:email")
  public List<GdEmail> email;
  
  @Key("gd:phoneNumber")
  public List<GdPhoneNumber> phoneNumber;
  
  @Key("gd:name")
  public GdName name;
  
  @Key("gContact:birthday")
  public GContactBirthday birthday;
  
  /**
   * The person's gender, either male or female.
   */
  @Key("gContact:gender")
  public Element gender;
  
  /**
   * Specifies hobbies or interests of the person specified by the contact. The element can be repeated.
   */
  @Key("gContact:hobby")
  public List<Element> hobbies;
  
  /**
   * Specifies the nickname of the person represented by the contact.
   * The element cannot be repeated.
   */
  @Key("gContact:nickname")
  public Element nickname;

  /**
   * Specifies the occupation/profession of the person specified by the contact.
   * The element cannot be repeated.
   */
  @Key("gContact:occupation")
  public Element occupation;
  
  /**
   * This element describe another entity (usually a person) that is in a
   * relation of some kind with the contact.
   * The gContact:relation element may be repeated.
   */
  @Key("gContact:relation")
  public List<Element> relations;
  
  @Key("gContact:website")
  public List<GContactWebsite> websites;
  
  @Key("gContact:groupMembershipInfo")
  public List<GContactGroupMembershipInfo> groupMembership;
  
  public String getEventFeedLink() {
    return Link.find(links, "http://schemas.google.com/contact/2008#contact");
  }
  
  @Override
  public String toString() {    
    String name = title != null ? title : "";
    if (name == "" && email != null && email.size() > 0) {
      name = email.get(0).address;
      if (name == null) {
        name = "";
      }
    }
    return name;
  }

  @Override
  public ContactEntry clone() {
    return (ContactEntry) super.clone();
  }

  @Override
  public ContactEntry executeInsert(HttpTransport transport, GoogleUrl url) throws IOException {
    return (ContactEntry) super.executeInsert(transport, url);
  }

  public ContactEntry executePatchRelativeToOriginal(
      HttpTransport transport, ContactEntry original) throws IOException {
    return (ContactEntry) super.executePatchRelativeToOriginal(transport, original);
  }
}
