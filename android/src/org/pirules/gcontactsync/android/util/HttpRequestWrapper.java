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

package org.pirules.gcontactsync.android.util;

import com.google.api.client.googleapis.GoogleHeaders;
import com.google.api.client.googleapis.GoogleUrl;
import com.google.api.client.http.HttpExecuteInterceptor;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.http.HttpResponse;
import com.google.api.client.http.HttpResponseException;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.xml.atom.AtomParser;

import org.pirules.gcontactsync.android.ContactListActivity;

import java.io.IOException;

/**
 * @author Josh Geenen
 */
public class HttpRequestWrapper {
 
  private static HttpRequestFactory mFactory = null;
  public static AtomParser mParser = null;
  static String mApplicationName = "";
  public static String mAuthToken = "";
  
  public static void init(String packageName, String appVersion) {

    mApplicationName = packageName + "/" + appVersion;
    AtomParser parser = new AtomParser();
    parser.namespaceDictionary = Util.DICTIONARY;
    HttpRequestWrapper.mParser = parser;
  }
  
  /**
   * Returns an HttpRequestFactory with the given HttpTransport and GoogleUrl.
   * @param transport
   * @param url
   * @return
   */
  public static HttpRequestFactory getFactory(HttpTransport transport, GoogleUrl url) {
    if (mFactory == null) {
      mFactory = createRequestFactory(transport, url);
    }
    return mFactory;
  }
  
  /**
   * See <a href="http://code.google.com/apis/calendar/faq.html#redirect_handling">How do I handle
   * redirects...?</a>.
   */
  static class SessionInterceptor implements HttpExecuteInterceptor {

    private String gsessionid;

    SessionInterceptor(HttpTransport transport, GoogleUrl locationUrl) {
      this.gsessionid = (String) locationUrl.getFirst("gsessionid");
    }

    public void intercept(HttpRequest request) {
      request.url.set("gsessionid", this.gsessionid);
    }
  }

  public static HttpResponse execute(HttpRequest request) throws IOException {
    try {
      return request.execute();
    } catch (HttpResponseException e) {
      if (e.response.statusCode == 302) {
        GoogleUrl url = new GoogleUrl(e.response.headers.location);
        request.url = url;
        mFactory = createRequestFactory(request.transport, url);
        e.response.ignore(); // close the connection
        return request.execute(); // re-execute the request
      }
      throw e;
    }
  }
  
  public static HttpRequestFactory createRequestFactory(HttpTransport transport, GoogleUrl locationUrl) {
    final SessionInterceptor interceptor = new SessionInterceptor(transport, locationUrl);
    return transport.createRequestFactory(new HttpRequestInitializer() {
      public void initialize(HttpRequest request) {
        
        GoogleHeaders headers = new GoogleHeaders();
        headers.setApplicationName(mApplicationName);
        headers.gdataVersion = ContactListActivity.GDATA_VERSION;
        headers.setGoogleLogin(mAuthToken);
        
        request.interceptor = interceptor;
        request.headers = headers;
        request.enableGZipContent = true;
        request.addParser(mParser);
      }
    });
  }
}
