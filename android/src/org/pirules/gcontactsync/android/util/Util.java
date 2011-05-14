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
 * Provides some commonly used methods and a default XML namespace dictionary.
 * @author Yaniv Inbar, Josh Geenen
 */
public class Util {
  
  /**
   * Whether to enable certain debugging features (logging by default,
   * prettyprint of HTML, etc.
   * TODO turn off
   */
  public static final boolean DEBUG = true;

  /**
   * The default XML namespace dictionary from namespace to URI.
   */
  public static final XmlNamespaceDictionary DICTIONARY =
    new XmlNamespaceDictionary().set("", "http://www.w3.org/2005/Atom")
                                .set("app", "http://www.w3.org/2007/app") // this is the problem
                                .set("openSearch", "http://a9.com/-/spec/opensearch/1.1/")
                                .set("gContact", "http://schemas.google.com/contact/2008")
                                .set("batch", "http://schemas.google.com/gdata/batch")
                                .set("gd", "http://schemas.google.com/g/2005");

  /**
   * Shows a dialog with yes and no buttons.
   * @param context The Context of the dialog.
   * @param title The title for the dialog.
   * @param message The message to display in the dialog.
   * @param yesListener The listener for when Yes (positive button) is clicked.
   * @param noListener The listener for when No (negative button) is clicked. 
   */
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
  
  /**
   * Shows a dialog with a single OK button.
   * @param context The Context of the dialog.
   * @param title The title for the dialog.
   * @param message The message to display in the dialog.
   * @param yesListener The listener for when OK (neutral button) is clicked. 
   */
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

  /**
   * Shows a dialog with OK and Cancel buttons with an input View of some kind.
   * @param context The Context of the dialog.
   * @param title The title for the dialog.
   * @param input The View that requests input.
   * @param message The message to display in the dialog.
   * @param okListener The listener for when OK (positive button) is clicked.
   * @param cancelListener The listener for when Cancel (negative button) is clicked. 
   */
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
