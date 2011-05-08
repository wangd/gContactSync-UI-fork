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
 * http://code.google.com/apis/contacts/docs/3.0/reference.html#gcWebsite
 * @author joshgeenen@gmail.com (Josh Geenen)
 */
public class GContactWebsite extends Element {
  
  /**
   * A link to the website.
   */
  @Key("@href")
  public String address;
  
  /***
   * When multiple websites appear in an entry, indicates which is primary.
   * At most one website may be primary. Default value is false.
   */
  @Key("@primary")
  public boolean primary;
  
  /**
   * Prints this website address
   */
  @Override
  public String toString() {
    return getLabel(null) + address;
  }
}
