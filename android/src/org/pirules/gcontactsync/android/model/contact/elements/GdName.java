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

/**
 * http://code.google.com/apis/gdata/docs/2.0/elements.html#gdName
 * TODO - yomi (phonetic)
 * @author Josh Geenen
 */
public class GdName {

  /**
   * Person's given name.
   */
  @Key("gd:givenName")
  public String givenName;
  
  /**
   * Additional name of the person, eg. middle name.
   */
  @Key("gd:additionalName")
  public String additionalName;
  
  /**
   * Person's family name.
   */
  @Key("gd:familyName")
  public String familyName;
  
  /**
   * Honorific prefix, eg. 'Mr' or 'Mrs'.
   */
  @Key("gd:namePrefix")
  public String namePrefix;
  
  /**
   * Honorific suffix, eg. 'san' or 'III'.
   */
  @Key("gd:nameSuffix")
  public String nameSuffix;
  
  /**
   * Unstructured representation of the name.
   */
  @Key("gd:fullName")
  public String fullName;
  
  @Override
  public String toString() {
    return fullName;
  }
  
}
