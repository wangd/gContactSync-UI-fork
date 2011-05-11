/*
 * Copyright (c) 2010 Google Inc., 2011 Josh Geenen
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

import com.google.api.client.xml.XmlNamespaceDictionary;

import org.pirules.gcontactsync.android.R;

import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.view.View;

/**
 * @author Yaniv Inbar, Josh Geenen
 */
public class Util {
  public static final boolean DEBUG = false;

  public static final XmlNamespaceDictionary DICTIONARY =
    new XmlNamespaceDictionary().set("", "http://www.w3.org/2005/Atom");

  public static void showYesNoDialog(final Context context,
                                     final String title,
                                     final String message,
                                     final DialogInterface.OnClickListener yesListener,
                                     final DialogInterface.OnClickListener noListener) {
    new AlertDialog.Builder(context)
    .setIcon(android.R.drawable.ic_dialog_alert)
    .setTitle(title)
    .setMessage(message)
    .setPositiveButton(context.getString(R.string.yes), yesListener)
    .setNegativeButton(context.getString(R.string.no), noListener)
    .show();
  }
  
  public static void showMessage(final Context context,
                                 final String title,
                                 final String message,
                                 DialogInterface.OnClickListener okListener) {
    new AlertDialog.Builder(context)
    .setTitle(title)
    .setMessage(message)
    .setNeutralButton(context.getString(R.string.ok), okListener)
    .show();
  }

  public static void showInputDialog(final Context context,
                                     final String title,
                                     final String message,
                                     final View input,
                                     final DialogInterface.OnClickListener okListener,
                                     final DialogInterface.OnClickListener cancelListener) {
    new AlertDialog.Builder(context)
    .setIcon(android.R.drawable.ic_dialog_alert)
    .setTitle(title)
    .setMessage(message).setView(input)
    .setPositiveButton(context.getString(R.string.ok), okListener)
    .setNegativeButton(context.getString(R.string.cancel), cancelListener)
    .show();
  }
}
