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

package org.pirules.gcontactsync.android.model.contact.elements;

import com.google.api.client.util.Key;

import org.pirules.gcontactsync.android.model.Element;

/**
 * http://code.google.com/apis/gdata/docs/2.0/elements.html#gdEmail
 * @author Josh Geenen
 */
public class GdEmail extends Element {
  
  /**
   * A display name of the entity (e.g. a person) the email address belongs
   * to. (new in gdata 2.0)
   */
  @Key("@displayName")
  public String displayName;
  
  /**
   * The actual email address.
   */
  @Key("@address")
  public String address;
  
  /**
   * When multiple email extensions appear in a contact kind, indicates which is primary.
   * At most one email may be primary. Default value is "false".
   */
  @Key("@primary")
  public boolean primary;
  
  @Override
  public String toString() {
    String label = getLabel(null);
    if (displayName != null) {
      return label + displayName + "<" + address + ">";
    }
    return label + address;
  }
}
