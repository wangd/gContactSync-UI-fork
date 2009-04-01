var LOGGER = {
  LOG_ERROR: function LOGGER_LOG_ERROR(aMsg, aError) {
    document.getElementById("error").innerHTML += "Error - " + aMsg + "\n<br>" + aError;
  },
  LOG_WARNING: function LOGGER_LOG_WARNING(aMsg, aWarning) {
    //document.getElementById("error").innerHTML += "Warning - " + aMsg + "\n<br>" + aWarning;
  },
  VERBOSE_LOG: function LOGGER_VERBOSE_LOG(aMsg) {},
  LOG: function LOGGER_LOG(aMsg) {}
}

var Main = {
  mCurrentAuthToken: null,
  mCurrentUsername: null,
  mGroups: {},
  mContacts: {},
  mOffset: 0,
  mLastGroupID: null,
  mOnOffline: ["alert('Connection error during HTTP request');"],
  MAX_RESULTS: 25,
  login: function Main_login() {
    window.location = gdata.O_AUTH_URL; 
  },
  revokeToken: function Main_revokeToken() {
    var httpReq = new HttpRequest();
    httpReq.mType = "GET";
    httpReq.mUrl = "php/send_request.php?url=" + escape(gdata.AUTH_SUB_REVOKE_URL) + "&type=" + 
                   escape(gdata.AUTH_SUB_REVOKE_TYPE);
    httpReq.mOnSuccess = ["Main.finishRevocation(httpReq);"];
    httpReq.mOnError = ["document.getElementById('error').innerHTML = 'Could not delete token:\n' + httpReq.responseText;"];
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  finishRevocation: function Main_finishRevocation(aRequest) {
    if (aRequest.responseText && aRequest.responseText.indexOf("Error") == 0) {
      document.getElementById('error').innerHTML = 'Could not delete token:\n' + httpReq.responseText;
      return;
    }
    window.location = "http://pirules.org/tools/gcs/index.php?logout=true";
  },
  getGroups: function Main_getGroups() {
    var httpReq = new HttpRequest();
    httpReq.mType = "GET";
    httpReq.mUrl = "php/send_request.php?url=" + escape(gdata.contacts.GROUPS_URL) + "&type=GET" +
                   "&content_type=" + httpReq.CONTENT_TYPES.ATOM;
    httpReq.mOnSuccess = ["Main.showGroups(httpReq);"],
    httpReq.mOnError = ["document.getElementById('error').innerHTML = httpReq.status + ' - ' + httpReq.responseText;"];
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  showGroups: function Main_showGroups(aRequest) {
    if (!aRequest || !aRequest.responseText || aRequest.responseText.indexOf("Error") == 0) {
      cument.getElementById("error").innerHTML = aRequest ? aRequest.responseText : null;
      return;
    }
    var aAtom = aRequest.responseXML;
    // reset the groups object
    this.mGroups = {};
    // if there wasn't an error, setup groups
    if (aAtom) {
      var ns = gdata.namespaces.ATOM;
      var arr = aAtom.getElementsByTagNameNS(ns.url, "entry");
      for (var i = 0; i < arr.length; i++) {
        try {
          var group = new Group(arr[i]);
          // add the ID to mGroups by making a new property with the ID as the
          // name and the title as the value for easy lookup for contacts
          var id = group.getID();
          var title = group.getTitle();
          var modifiedDate = group.getLastModifiedDate();
          this.mGroups[id] = group;
        }
        catch(e) { LOGGER.LOG_ERROR("Error while getting groups: " + e); }
      }
      var table = document.getElementById("groups");
      var row = table.insertRow(-1);
      this.setupRow(row);
      var cell = document.createElement("td");
      cell.innerHTML = "All Contacts";
      cell.onclick = Main.handleGroupClick;
      row.appendChild(cell);
      for (var i in this.mGroups) {
        var row = table.insertRow(-1);
        this.setupRow(row);
        var cell1 = document.createElement("td");
        cell1.innerHTML = this.mGroups[i].getTitle();
        cell1.id = this.mGroups[i].getID();
        cell1.onclick = Main.handleGroupClick;
        row.appendChild(cell1);
      }
    }
  },
  handleGroupClick: function Main_handleGroupClick(e) {
    if (!e)
      e = window.event;
    try {
      Main.getContacts(e['target'] ? e['target'] : e['srcElement']);
    }
    catch(e) { alert(e); }
  },
  setupRow: function Main_setupRow(aRow) {
    aRow.className = "transOFF";
    aRow.addEventListener("mouseover", function() { this.className='transON'; },  false);
    aRow.addEventListener("mouseout",  function() { this.className='transOFF'; }, false);
    return aRow;
  },
  getContacts: function Main_getContacts(aGroup) {
    if (document.getElementById("error"))
      document.getElementById("error").innerHTML = null;
    if (aGroup) {
      this.mGetLastGroup = null;
      this.mOffset = 0;
      this.mGetLastGroup = null;
    }
    var httpReq = new HttpRequest();
    httpReq.mType = "GET";
    httpReq.mUrl = "php/send_request.php?url=" + escape(gdata.contacts.GET_ALL_THIN_URL + this.MAX_RESULTS); 
    if (this.mOffset) {
      if (this.mOffset < 1) this.mOffset = 1;
      httpReq.mUrl += escape("&start-index=" + this.mOffset);
    }
    if (aGroup && aGroup.id) {
      httpReq.mUrl += escape("&group=" + aGroup.id);
    }
    httpReq.mUrl += "&type=GET&content_type=" + httpReq.CONTENT_TYPES.ATOM;
    httpReq.mOnSuccess = ["Main.showContacts(httpReq" + (aGroup && aGroup.id ? ", '" + aGroup.id + "'" : "") + ");"];
    httpReq.mOnError = ["document.getElementById('error').innerHTML = httpReq.responseText;"];
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  showContacts: function Main_showContacts(aRequest, aGroupID) {
    if (!aRequest || !aRequest.responseText || aRequest.responseText.indexOf("Error") == 0) {
      document.getElementById("error").innerHTML = aRequest ? aRequest.responseText : null;
      return;
    }
    var aAtom = aRequest.responseXML;
    this.mContacts = [];
    if (aAtom) {
      if (this.mGetLastGroup) {
        aGroupID = this.mLastGroupID;
        this.mGetLastGroup = false;
      }
      this.mLastGroupID = aGroupID;
      var ns = gdata.namespaces.ATOM;
      var arr = aAtom.getElementsByTagNameNS(ns.url, "entry");
      for (var i = 0; i < arr.length; i++) {
        try {
          var contact = new GContact(arr[i]);
          if (!contact) {
            alert("error contact is null in " + aRequest.responseText);
            return;
          }
          this.mContacts.push(contact);
        }
        catch(e) { LOGGER.LOG_ERROR("Error while getting groups: " + e); }
      }
      var table = document.getElementById("contacts");
      // clear the existing contacts
      while (table.rows.length > 1) {
        table.deleteRow(1);
      }
      // clear the contact details
      document.getElementById("contact_details").innerHTML = null;
      // set the title for the table
      var num = this.mOffset || this.mContacts.length == this.MAX_RESULTS ? (this.mOffset + " - " + (this.mOffset + this.mContacts.length)) : this.mContacts.length
      table.rows[0].innerHTML = "<td><font size=4><b>" + (aGroupID ? document.getElementById(aGroupID).innerHTML : "All Contacts") + " (" + num + ")</b></font></td>";
      for (var i in this.mContacts) {
        var contact   = this.mContacts[i];
        var row       = table.insertRow(-1);
        row.id        = contact.getValue("id").value;
        row.onclick   = Main.getContactDetails;
        row.className = "transOFF";
        row.addEventListener("mouseover", function() { this.className='transON'; },  false);
        row.addEventListener("mouseout",  function() { this.className='transOFF'; }, false);
        var cell1 = document.createElement("td");
        var title = contact.getValue("title");
        if (!title)
          title = contact.getValue("email");
        cell1.innerHTML = title ? title.value : null;
        row.appendChild(cell1);
      }
      var html = null;
      if (this.mOffset) {
        html = "<td><a href='javascript:Main.mOffset -= Main.MAX_RESULTS; Main.mGetLastGroup = true; Main.getContacts();'>Previous " + this.MAX_RESULTS + "</a>";
      }
      if (this.mContacts.length == this.MAX_RESULTS) {
        if (html)
          html += "&nbsp;";
        else
          html = "<td>";
        html += "<a href='javascript:Main.mOffset += Main.MAX_RESULTS; Main.mGetLastGroup = true; Main.getContacts();'>Next " + this.MAX_RESULTS + "</a>";
      }
      if (html) {
        table.insertRow(-1).innerHTML = html + "</td>";
      }
    }
  },
  getContactDetails: function Main_getContactDetails(e) {
    if (!e) {
      var e = window.event;
    }
    if (!e) {
      throw "event is a required parameter for getContactDetails";
    }
    var cell = e['target'] ? e['target'] : e['srcElement'];
    var row = cell.parentNode;
    if (!row || !row.id) {
      throw "Invalid row passed to Main.showContactDetails";
    }
    var httpReq = new HttpRequest();
    httpReq.mType = "GET";
    var url = row.id.replace("/base/", "/full/");
    httpReq.mUrl = "php/send_request.php?url=" + escape(url) + "&type=GET" +
                   "&content_type=" + httpReq.CONTENT_TYPES.ATOM;
    httpReq.mOnSuccess = ["Main.showContactDetails(httpReq);"],
    httpReq.mOnError = ["document.getElementById('error').innerHTML = httpReq.responseText;"];
    httpReq.mOnOffline = this.mOfflineCommand;
    httpReq.send();
  },
  showContactDetails: function Main_showContactDetails(aRequest) {
    if (!aRequest || !aRequest.responseText || aRequest.responseText.indexOf("Error") == 0) {
      document.getElementById("error").innerHTML = aRequest ? aRequest.responseText : null;
      return;
    }
    var aAtom = aRequest.responseXML;
    var table = document.getElementById("contact_details");
    while (table.rows && table.rows.length) {
      table.deleteRow(0);
    }
    if (aAtom && table) {
      var ns = gdata.namespaces.GD.url;
      var contact = new GContact(aAtom);
      var title   = "";
      // try to find a title for this contact
      var titleAttrs   = ['title', 'email', 'im', 'phone'];
      for (var i = 0; (!title || !title.value) && i < titleAttrs.length; i++) {
        title = contact.getValue(titleAttrs[i]);
      }
      if (!title || !title.value) {
        title = { value: "Contact" };
      }
      table.insertRow(-1).innerHTML = "<td colspan=2><h3>" + title.value + "</h3></td>";

      var attrs  = ['email',  'im',          'phoneNumber'];
      var labels = ['E-mail', 'Screennames', 'Phone'];
      for (var i = 0; i < attrs.length; i++) {
        var vals = contact.xml.getElementsByTagNameNS(ns, attrs[i]);
        if (!vals || !vals.length) { continue; }
        table.insertRow(-1).innerHTML = "<td><b>" + labels[i] + "</b></td><td><b>Type</b></td>";
        for (var j = 0; j < vals.length; j++) {
          var property  = contact.getValue(attrs[i], j);
          var type = gdata.contacts.TYPES[property.type] ? gdata.contacts.TYPES[property.type] : property.type;
          this.addRow(table, property.value, type, this.cellTypes.textbox, this.cellTypes.html, attrs[i] + "_0");
        }
      }
      var types = ['home', 'work', 'other'];
      var addrTable = document.createElement("table");
 
      var hasAddress = false;
      for (var i = 0; i < types.length; i++) {
        var address = null;
        var j = 0;
        for (var j = 0; address = contact.getValue("postalAddress", j, types[i]); j++) {
          if (!hasAddress)
            table.insertRow(-1).innerHTML = "<td><b>Address</b></td><td><b>Type</b></td>";
          var type = gdata.contacts.TYPES[address.type] ? gdata.contacts.TYPES[address.type] : address.type;
          var row = this.addRow(table, address.value, type, this.cellTypes.multiline, this.cellTypes.html);
          if (row && row.firstChild && row.firstChild.firstChild) {
            var textarea = row.firstChild.firstChild;
            textarea.rows = 4;
            textarea.cols = 25;
          }
          hasAddress = true;
        }
      }
      // there should only be one of these and they don't have types that matter
      var untyped = ["orgTitle", "orgName", "notes"];
      var uLabels = ["Title:", "Organization:", "Notes"];
      var uTable  = document.createElement("table");
      var row = table.insertRow(-1);
      var cell = document.createElement("td");
      cell.setAttribute("colspan", 2);
      cell.appendChild(uTable);
      row.appendChild(cell);
      for (var i = 0; i < untyped.length; i++) {
        var property = contact.getValue(untyped[i]);
        if (property && property.value) {
          var label = "<b>" + uLabels[i] + "</b>";
          if (untyped[i] != "notes") {
            this.addRow(uTable, label, property.value, this.cellTypes.html, this.cellTypes.textbox);
          }
          else {
            this.addRow(table, label, null, this.cellTypes.html);
            var row = this.addRow(table, property.value, null, this.cellTypes.multiline);
            if (row && row.firstChild) {
              var cell = row.firstChild;
              cell.setAttribute("colspan", 2);
              var textarea  = cell.firstChild;
              textarea.rows = 10;
              textarea.cols = 40;
            }
          }
        }
      }
      // get the extended attributes
      var extended = ['Department', 'WebPage1', 'WebPage2', 'BirthDay', 'BirthMonth',
                      'BirthYear', 'AnniversaryDay', 'AnniversaryMonth',
                      'AnniversaryYear', 'Custom1', 'Custom2', 'Custom3', 'Custom4'];
      var eLabels  = ['Department:', 'Work Website:', 'Home Website:', 'Birth Day:',
                      'Birth Month:', 'Birth Year:', 'Anniversary Day:', 'Anniversary Month:',
                      'Anniversary Year:', 'Custom 1:', 'Custom 2:', 'Custom 3:', 'Custom 4:'];
      for (var i = 0; i < extended.length; i++) {
        var property = contact.getExtendedProperty(extended[i]);
        if (property && property.value) {
          var label = "<b>" + eLabels[i] + "</b>";
          this.addRow(uTable, label, property.value, this.cellTypes.html, this.cellTypes.textbox, extended[i] + "_1");
        }
      }
    }
  },
  cellTypes: {
    html: null,
    textbox: 1,
    multiline: 2
  },
  addRow: function Main_addRow(table, cell0Text, cell1Text, cell0Type, cell1Type, attr) {
    if (cell0Text) {
      var row   = table.insertRow(-1);
      var cell0 = document.createElement("td");
      var value = cell0Text.replace(/\n/g, "<br>");
      switch (attr) {
        case "email_0":
          value = "<a href='mailto:" + value + "'>" + value + "</a>";
          break;
        case "WebPage1_0":
        case "WebPage2_0":
          value = "<a target='_blank' href='" + (value.indexOf("http://") == -1 ? "http://" + value : value) + "'>" + value + "</a>";
          break;
      }
      //if (cell0Type == this.cellTypes.html) {
        cell0.innerHTML = value;
      //}
      /*
      else if (cell0Type == this.cellTypes.textbox) {
        var textbox = document.createElement("input");
        textbox.type     = "text";
        textbox.setAttribute("readonly", "1");
        textbox.value    = cell0Text;
        cell0.appendChild(textbox);
      }
      else if (cell0Type == this.cellTypes.multiline) {
        var textbox = document.createElement("textarea");
        textbox.setAttribute("readonly", "1");
        textbox.value    = cell0Text;
        cell0.appendChild(textbox);
      }
      else {
        LOGGER.LOG_ERROR("Unrecognized type sent to Main.addRow: " + cell0Type);
        return null;
      }
      */
      row.appendChild(cell0);
    }
    if (cell1Text) {
      if (!row) { var row = table.insertRow(-1); }
      var cell1 = document.createElement("td");
      var value = cell1Text.replace(/\n/g, "<br>");
      switch (attr) {
        case "email_1":
          value = "<a href='mailto:" + value + "'>" + value + "</a>";
          break;
        case "WebPage1_1":
        case "WebPage2_1":
          value = "<a target='_blank' href='" + (value.indexOf("http://") == -1 ? "http://" + value : value) + "'>" + value + "</a>";
          break;
      }
      //if (cell1Type == this.cellTypes.html) {
        cell1.innerHTML = value;
      //}
      /*
      else if (cell1Type == this.cellTypes.textbox) {
        var textbox = document.createElement("input");
        textbox.type     = "text";
        textbox.setAttribute("readonly", "1");
        textbox.value = cell1Text;
        cell1.appendChild(textbox);
      }
      else if (cell1Type == this.cellTypes.multiline) {
        var textbox = document.createElement("textarea");
        textbox.setAttribute("readonly", "1");
        textbox.value    = cell1Text;
        cell1.appendChild(textbox);
      }
      else {
        LOGGER.LOG_ERROR("Unrecognized type sent to Main.addRow: " + cell1Type);
        return null;
      }
      */
      row.appendChild(cell1);
    }
    return row;
  }
};
