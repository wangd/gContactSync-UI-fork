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
 * http://code.google.com/apis/contacts/docs/2.0/reference.html#gContactNamespace
 * @author Josh Geenen
 */
public class GContactGroupMembershipInfo extends Element {
  
  /**
   * Identifies the group to which the contact belongs or belonged.
   */
  @Key("@href")
  public String href;
  
  /**
   * If 'true' means that the group membership was removed for the contact.
   * This attribute will only be included if showdeleted is specified as query parameter,
   * otherwise groupMembershipInfo for groups in which a contact is no longer
   * contained is simply not returned.
   */
  @Key("@deleted")
  public boolean deleted;
}
