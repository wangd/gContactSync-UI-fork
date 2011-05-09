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
 * http://code.google.com/apis/contacts/docs/3.0/reference.html#gcBirthday
 * @author joshgeenen@gmail.com (Josh Geenen)
 */
public class GContactBirthday extends Element {
  
  /**
   * Birthday date, given in format YYYY-MM-DD (with the year), or --MM-DD
   * (without the year).
   */
  @Key("@when")
  public String birthday;
  
  /**
   * Prints the birthday as a string.
   * @return The birthday string.
   */
  @Override
  public String toString() {
    return birthday;
  }
}