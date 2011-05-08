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

/**
 * http://code.google.com/apis/gdata/docs/2.0/elements.html#gdPhoneNumber
 * @author joshgeenen@gmail.com (Josh Geenen)
 */
public class GdPhoneNumber extends Element {
  
  /**
   * An optional "tel URI" used to represent the number in a formal way,
   * useful for programmatic access, such as a VoIP/PSTN bridge.
   * See RFC 3966 for more information on tel URIs.
   */
  @Key("@uri")
  public String uri;

  // Note - the text() value is already in Element as is an acceptable toString method
}
