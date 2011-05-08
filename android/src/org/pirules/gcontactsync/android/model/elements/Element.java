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

package org.pirules.gcontactsync.android.model.elements;

import com.google.api.client.util.Key;

import java.util.Map;

/**
 * Generic element with a rel and label attribute and text value.
 * Contains a method for getting a label for this element using the label
 * first and rel second and a generic toString using the calculated label
 * and text value.
 * @author joshgeenen@gmail.com (Josh Geenen)
 */
public class Element {
  /**
   * A simple string value used to name this element.
   * It allows UIs to display a label such as "Work", "Personal", "Preferred", etc.
   */
  @Key("@label")
  public String label;
  
  /**
   * A programmatic value that identifies the type of element, such as home,other,work}
   */
  @Key("@rel")
  public String rel;
  
  /**
   * The textual value of this element.
   */
  @Key("text()")
  public String value;
  
  /**
   * Default toString method is to prepend the label (or rel) to the text value of the element.
   * Override this if this behavior is undesirable.
   * @return The labeled value.
   */
  @Override
  public String toString() {
    return getLabel(null) + value;
  }

  /**
   * Gets the label (or rel, with values mapped from rel -> custom label if no
   * label) with a suffix ": " if non-empty.
   * 
   * @param relMap Optional.  A map from rel values to custom labels.  If null then
   *               the "label" for a rel will be the capitalized value that comes in
   *               the rel attribute after the text "http://schemas.google.com/g/2005#".
   * @return A label for this value followed by ": " or "" if no label could be found.
   */
  public String getLabel(Map<String, String> relMap) {
    if (label != null) {
      return label + ": ";
    }
    if (rel != null) {
      if (relMap != null) {
        return relMap.get(rel) + ": ";
      }
      return capitalize(rel.replaceFirst("^http://schemas.google.com/g/2005#", "")) + ": ";
    }
    return "";
  }
  
  /**
   * Capitalizes the first character in the given string.
   * @param in The input string.
   * @return A copy of the input string with its first character capitalized.
   */
  private String capitalize(String in) {
    // TODO - is there an existing, or better way to do this?
    String out = ""; 
    for (int i = 0; i < in.length(); ++i) {
      out += in.substring(i, i + 1);
      if (i == 0) {
        out = out.toUpperCase();
      }
    }
    return out;
  }

}
