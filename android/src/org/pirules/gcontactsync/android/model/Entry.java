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
  
  @Key("@gd:etag")
  public String etag;

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
  
  public boolean delete(HttpTransport transport) {
    try {
      executeDelete(transport);
      return true;
    } catch (IOException exception) {
      exception.printStackTrace();
      return false;
    }
  }
  
  public Entry update(HttpTransport transport) {
    try {
      return executeUpdate(transport);
    } catch (IOException exception) {
      exception.printStackTrace();
      return null;
    }
  }
  
  public Entry executeUpdate(HttpTransport transport) throws IOException {
    if (getEditLink() == null) {
      throw new IOException("Edit link is null...Entry is not editable");
    }
    GoogleUrl url = new GoogleUrl(getEditLink());
    AtomContent content = new AtomContent();
    content.namespaceDictionary = Util.DICTIONARY;
    HttpRequest request = HttpRequestWrapper.getFactory(transport).buildPutRequest(url, content);
    content.entry = this;
    return request.execute().parseAs(getClass());
  }

  public void executeDelete(HttpTransport transport) throws IOException {
    if (getEditLink() == null) {
      throw new IOException("Edit link is null...Entry is not editable");
    }
    GoogleUrl url = new GoogleUrl(getEditLink());
    HttpRequest request = HttpRequestWrapper.getFactory(transport).buildDeleteRequest(url);
    request.headers.ifMatch = etag;
    request.execute().ignore();
  }

  /**
   * Inserts this Entry to the given URL and returns the response
   * @param transport The HttpTransport to use.
   * @param url The URL to POST this Entry to.
   * @return The response parsed as the current Entry class.
   * @throws IOException
   */
  protected Entry executeInsert(HttpTransport transport, GoogleUrl url) throws IOException {
    AtomContent content = new AtomContent();
    content.namespaceDictionary = Util.DICTIONARY;
    content.entry = this;
    HttpRequest request = HttpRequestWrapper.getFactory(transport).buildPostRequest(url, content);
    return request.execute().parseAs(getClass());
  }

  /**
   * Performs a patch between this Entry and an original Entry and executes the
   * request, then returns the response from parsed as the current class.
   * @param transport The HttpTransport to use.
   * @param original The original Entry.
   * @return The response parsed as the current Entry class.
   * @throws IOException from HttpRequest.execute.
   */
  protected Entry executePatchRelativeToOriginal(HttpTransport transport, Entry original) throws IOException {
    AtomPatchRelativeToOriginalContent content = new AtomPatchRelativeToOriginalContent();
    content.namespaceDictionary = Util.DICTIONARY;
    content.originalEntry = original;
    content.patchedEntry = this;
    GoogleUrl url = new GoogleUrl(getEditLink());
    HttpRequest request = HttpRequestWrapper.getFactory(transport).buildPostRequest(url, content);
    return request.execute().parseAs(getClass());
  }

  /**
   * Returns the link to edit this Entry, if one exists, else null.
   * @return The link to edit this Entry, if one exists, else null.
   */
  public String getEditLink() {
    return Link.find(links, "edit");
  }
  
  /**
   * Returns the link to this Entry.
   * @return The link to this Entry for GET requests.
   */
  public String getSelfLink() {
    return Link.find(links, "self");
  }
}
