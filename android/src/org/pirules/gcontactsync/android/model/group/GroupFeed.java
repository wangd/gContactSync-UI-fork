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
import com.google.common.collect.Lists;

import org.pirules.gcontactsync.android.model.Feed;

import java.io.IOException;
import java.util.List;


/**
 * Stores a list of GroupEntries.
 * @author Josh Geenen
 */
public class GroupFeed extends Feed {

  /** A list of the groups. */
  @Key("entry")
  public List<GroupEntry> groups = Lists.newArrayList();

  /**
   * Sends a GET request for a group feed and parses the groups into a List of
   * GroupEntries.
   * 
   * @param transport The HttpTransport to use.
   * @param url The URL of the group feed.
   * @return The GroupFeed from the given URL.
   * @throws IOException from HttpRequest.execute()
   */
  public static GroupFeed executeGet(HttpTransport transport, GroupUrl url)
      throws IOException {
    return (GroupFeed) Feed.executeGet(transport, url, GroupFeed.class);
  }
}
