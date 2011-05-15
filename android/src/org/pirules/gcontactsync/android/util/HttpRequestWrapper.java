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
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.http.HttpResponse;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.HttpUnsuccessfulResponseHandler;
import com.google.api.client.http.xml.atom.AtomParser;

import org.pirules.gcontactsync.android.ContactListActivity;

/**
 * @author Josh Geenen
 */
public class HttpRequestWrapper {
 
  private static HttpRequestFactory mFactory = null;
  public static AtomParser mParser = null;
  static String mApplicationName = "";
  public static String mAuthToken = ""; // TODO - this could be persisted through a pref...
  
  public static void init(String packageName, String appVersion) {

    mApplicationName = packageName + "/" + appVersion;
    AtomParser parser = new AtomParser();
    parser.namespaceDictionary = Util.DICTIONARY;
    HttpRequestWrapper.mParser = parser;
  }
  
  /**
   * Returns an HttpRequestFactory with the given HttpTransport.
   * @param transport The HttpTransport to use for requests.
   * @param url
   * @return
   */
  public static HttpRequestFactory getFactory(HttpTransport transport, GoogleUrl url) {
    if (mFactory == null) {
      mFactory = createRequestFactory(transport);
    }
    return mFactory;
  }
  
  public static HttpRequestFactory createRequestFactory(HttpTransport transport) {
    final HttpUnsuccessfulResponseHandler unsuccessfulHandler = new HttpUnsuccessfulResponseHandler() {

      public boolean handleResponse(HttpRequest request, HttpResponse response, boolean retrySupported) {
        switch (response.statusCode) {
          case 401:
            // TODO invalidate auth token in the AccountManager...
            mAuthToken = null;
            return false; // do not retry
        }
        return false;
      }
    };
    return transport.createRequestFactory(new HttpRequestInitializer() {
      public void initialize(HttpRequest request) {
        
        GoogleHeaders headers = new GoogleHeaders();
        headers.setApplicationName(mApplicationName);
        headers.gdataVersion = ContactListActivity.GDATA_VERSION;
        headers.setGoogleLogin(mAuthToken);

        request.headers = headers;
        request.enableGZipContent = true;
        request.addParser(mParser);
        request.unsuccessfulResponseHandler = unsuccessfulHandler;
      }
    });
  }
}
