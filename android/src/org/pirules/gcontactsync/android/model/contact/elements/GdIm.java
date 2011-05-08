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

package org.pirules.gcontactsync.android.model.contact.elements;

import com.google.api.client.util.Key;

import org.pirules.gcontactsync.android.model.elements.Element;

import java.util.Hashtable;

/**
 * http://code.google.com/apis/gdata/docs/2.0/elements.html#gdIm
 * @author joshgeenen@gmail.com (Josh Geenen)
 */
public class GdIm extends Element {
  
  /**
   * Identifies the IM network
   * The value may be either one of the standard values or a URI identifying a
   * proprietary IM network.
   */
  @Key("@protocol")
  public String protocol;
  
  /**
   * IM address.
   */
  @Key("@address")
  public String address;
  
  /**
   * Prints this IM address with the label, protocol, and IM address.
   * @return The IM address as a string.
   */
  @Override
  public String toString() {
    String ret = getLabel(null);
    if (protocol != null) {
      String protString = imProtocolMap.get(protocol);
      if (protString == null) {
        protString = protocol.replaceFirst("^http://schemas.google.com/g/2005#", "");
      }
      ret += "(" + protString + ") ";
    }
    return ret + address; 
  }
  
  /**
   * Maps possible IM protocols to more friendly represenations.
   */
  private final Hashtable<String, String> imProtocolMap = new Hashtable<String, String>() {
    /**
     * Required to prevent a warning
     */
    private static final long serialVersionUID = -5202149418215481500L;

    {
      put("http://schemas.google.com/g/2005#AIM",         "AIM");
      put("http://schemas.google.com/g/2005#MSN",         "MSN");
      put("http://schemas.google.com/g/2005#YAHOO",       "Yahoo");
      put("http://schemas.google.com/g/2005#SKYPE",       "Skype");
      put("http://schemas.google.com/g/2005#QQ",          "QQ");
      put("http://schemas.google.com/g/2005#GOOGLE_TALK", "Google Talk");
      put("http://schemas.google.com/g/2005#ICQ",         "ICQ");
      put("http://schemas.google.com/g/2005#JABBER",      "Jabber");
    }
  };
}
