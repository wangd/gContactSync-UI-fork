/*
 * Copyright (c) 2010 Google Inc., 2011 Josh Geenen
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

package org.pirules.gcontactsync.android.model;

import com.google.api.client.googleapis.GoogleUrl;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.util.Key;

import org.pirules.gcontactsync.android.util.HttpRequestWrapper;

import java.io.IOException;
import java.util.List;

/**
 * @author Yaniv Inbar, Josh Geenen
 */
public class Feed {

  @Key("link")
  public List<Link> links;
  
  @Key("openSearch:totalResults")
  public int totalResults;

  public String getBatchLink() {
    return Link.find(links, "http://schemas.google.com/g/2005#batch");
  }

  protected static Feed executeGet(HttpTransport transport, GoogleUrl url, Class<? extends Feed> feedClass)
      throws IOException {
    HttpRequest request = HttpRequestWrapper.getFactory(transport, url).buildGetRequest(url);
    return HttpRequestWrapper.execute(request).parseAs(feedClass);
  }
}
