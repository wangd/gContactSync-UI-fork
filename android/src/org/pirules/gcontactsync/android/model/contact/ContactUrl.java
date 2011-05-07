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
import com.google.api.client.util.Key;

import org.pirules.gcontactsync.android.util.Util;

/**
 * @author Josh Geenen
 */
public class ContactUrl extends GoogleUrl {

  public static final String ROOT_URL = "https://www.google.com/m8/feeds/contacts";

  @Key("max-results")
  public Integer maxResults;
  
  @Key("group")
  public String group;

  public ContactUrl(String url) {
    super(url);
    if (Util.DEBUG) {
      this.prettyprint = true;
    }
  }

  private static ContactUrl forRoot() {
    return new ContactUrl(ROOT_URL);
  }

  public static ContactUrl forContactsMetafeed() {
    ContactUrl result = forRoot();
    result.pathParts.add("default");
    return result;
  }

  public static ContactUrl forAllContactsFeed() {
    ContactUrl result = forEventFeed("default", "full");
    return result;
  }

  public static ContactUrl forEventFeed(String userId, String projection) {
    ContactUrl result = forRoot();
    result.pathParts.add(userId);
    result.pathParts.add(projection);
    return result;
  }
}
