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
import com.google.api.client.util.Key;

import org.pirules.gcontactsync.android.util.Util;

/**
 * The base class for URLs to use with contact groups.
 * @author Josh Geenen
 */
public class GroupUrl extends GoogleUrl {

  /** The base URL for contact groups. */
  public static final String ROOT_URL = "https://www.google.com/m8/feeds/groups";

  /** The max number of groups to return. */
  @Key("max-results")
  public Integer maxResults;

  /**
   * Creates a new GroupUrl.
   * @param url The URL.
   */
  public GroupUrl(String url) {
    super(url);
    if (Util.DEBUG) {
      this.prettyprint = true;
    }
  }

  /**
   * Returns a new GroupUrl with the root URL only.
   * @return A new GroupUrl with only the root URL.
   */
  private static GroupUrl forRoot() {
    return new GroupUrl(ROOT_URL);
  }

  /**
   * Returns a new GroupUrl for the default/authenticated user with all groups.
   * @return A new GroupUrl for the default/authenticated user with all groups.
   */
  public static GroupUrl forAllGroupsFeed() {
    GroupUrl result = forFeed("default", "full");
    return result;
  }

  /**
   * Returns a new GroupUrl for the given user and projection.
   * 
   * @param userId The User ID to obtain groups for ("default" for the authenticated user).
   * @param projection The projection ("full" for everything).
   * @return A new GroupUrl for the given user and projection.
   */
  public static GroupUrl forFeed(String userId, String projection) {
    GroupUrl result = forRoot();
    result.pathParts.add(userId);
    result.pathParts.add(projection);
    return result;
  }
}
