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
import com.google.api.client.googleapis.xml.atom.AtomPatchRelativeToOriginalContent;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.util.Data;
import com.google.api.client.util.Key;
import com.google.api.client.http.xml.atom.AtomContent;

import org.pirules.gcontactsync.android.model.elements.Link;
import org.pirules.gcontactsync.android.util.HttpRequestWrapper;
import org.pirules.gcontactsync.android.util.Util;

import java.io.IOException;
import java.util.List;

/**
 * @author Yaniv Inbar, Josh Geenen
 */
public class Entry implements Cloneable {

  @Key
  public String id;

  @Key
  public String updated;

  @Key
  public String title;

  @Key("link")
  public List<Link> links;
  
  @Override
  public String toString() {
    return title != null ? title : "";
  }

  @Override
  protected Entry clone() {
    return Data.clone(this);
  }

  public void executeDelete(HttpTransport transport, GoogleUrl url) throws IOException {
    HttpRequest request = HttpRequestWrapper.getFactory(transport, url).buildDeleteRequest(url);
    HttpRequestWrapper.execute(request).ignore();
  }

  protected Entry executeInsert(HttpTransport transport, GoogleUrl url) throws IOException {
    AtomContent content = new AtomContent();
    content.namespaceDictionary = Util.DICTIONARY;
    HttpRequest request = HttpRequestWrapper.getFactory(transport, url).buildPostRequest(url, content);
    content.entry = this;
    return HttpRequestWrapper.execute(request).parseAs(getClass());
  }

  protected Entry executePatchRelativeToOriginal(HttpTransport transport, Entry original) throws IOException {
    AtomPatchRelativeToOriginalContent content = new AtomPatchRelativeToOriginalContent();
    content.namespaceDictionary = Util.DICTIONARY;
    content.originalEntry = original;
    content.patchedEntry = this;
    GoogleUrl url = new GoogleUrl(getEditLink());
    HttpRequest request = HttpRequestWrapper.getFactory(transport, url).buildPostRequest(url, content);
    return HttpRequestWrapper.execute(request).parseAs(getClass());
  }

  public String getEditLink() {
    return Link.find(links, "edit");
  }
  
  public String getSelfLink() {
    return Link.find(links, "self");
  }
}
