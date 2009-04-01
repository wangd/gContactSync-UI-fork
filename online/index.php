<?php
  session_start();
  include_once '../../php/include.php';
  include_once 'php/common.php';
  require_once 'php/HttpRetriever.php';
  echo get_header("gContactSync Online Version", null, "View your Google Contacts online with full support for gContactSync's customizations");
?>
  <!-- import some of the scripts from gContactSync -->
  <script type="text/javascript" src="js/synonyms.js"></script>
  <script type="text/javascript" src="js/Property.js"></script>
  <script type="text/javascript" src="js/Namespace.js"></script>
  <script type="text/javascript" src="js/GElement.js"></script>
  <script type="text/javascript" src="js/HttpRequest.js"></script>
  <script type="text/javascript" src="js/GHttpRequest.js"></script>
  <script type="text/javascript" src="js/Group.js"></script>
  <script type="text/javascript" src="js/gdata.js"></script>
  <script type="text/javascript" src="js/GContact.js"></script>
  <script type="text/javascript" src="js/main.js"></script>
  <style>
    tr.transOFF {
      width: 100%;
      background-color: white;
      color: black;
      /*border:1px solid black;*/
    }
    tr.transON {
      width: 100%;
      background-color: #0000FF;
      color: white;
      /*opacity:.50;
      filter: alpha(opacity=50);*/
      /*border:1px solid black;*/
    }
/*
    tr.trans25 {
      width: 100%;
      background-color: silver;
      opacity:.25;
      filter: alpha(opacity=25);
      border:1px solid black;
    }
    tr.trans75 {
      width: 100%;
      background-color: silver;
      opacity:.75;
      filter: alpha(opacity=75);
      border:1px solid black;
    }
*/
  </style>
<?php
  if (isset($_REQUEST['logout'])) {
    if (isset($_SESSION['token'])) {
      unset($_SESSION['token']);
      echo "<font size=4><b>Token successfully removed</b></font><br>\n";
    }
    else {
      echo "You have not logged in...<br>\n";
    }
  }
  if (!isset($_SESSION['token']) && isset($_REQUEST['token'])) {
    echo "Found one-time-use token - {$_REQUEST['token']}<br>\n";
    echo "Exchanging for a session token...this may take a minute<br>\n";
    // add an extra minute
    set_time_limit(60);
    $http    = &new HttpRetriever();
    $http->headers = array(
      "Referrer"      => "",
      "User-Agent"    => "gContactSync/0.2",
      "Authorization" => "AuthSub token=\"{$_REQUEST['token']}\"",
      "Accept"        => "text/html, image/gif, image/jpeg, *; q=.2, */*; q=.2",
      "Connection"    => "keep-alive");
    if (!$http->get('https://www.google.com/accounts/AuthSubSessionToken')) {
      echo "Error - #{$http->result_code}: {$http->result_text}";
    }
    else {
      $token = str_replace("\n", "", substr($http->response, stripos($http->response, "token=") + 6));
      echo "Got a session token: $token<br>\n";
      session_register("token");
    }
  }
  if (isset($_SESSION['token'])) {
    if (isset($_REQUEST['token'])) {
      unset($_REQUEST['token']);
      //header("location: " . $_SERVER['PHP_SELF']);
    }
    echo "Congrats, you have a session token - {$_SESSION['token']}\n";
    echo "<input type=button onclick='Main.revokeToken();' value=Logout></input>\n";
?>
  <table id=results>
    <tr>
      <td valign=top>
        <table id=groups>
          <tr>
            <td><font size=4><b>Groups</b></font></td>
          </tr>
        </table>
      </td>
      <td valign=top>
        <table id=contacts>
          <tr>
            <td><font size=4><b>Contacts</b></font></td>
          </tr>
       </table>
    </td>
    <td valign=top>
      <table id=contact_details>
      </table>
    <td>
  </tr>
</table>
  <script type=text/javascript>
    gdata.contacts.init();
    Main.mCurrentAuthToken = "<?php echo $_SESSION['token'];?>";
    Main.getGroups();
    Main.getContacts();
  </script>
<?php
  }
  else {
?>
  <script>
    gdata.contacts.init();
  </script>
  <p>You do not have a token yet. Click the login button below to be redirected to a site from Google to login.  You will have to grant access to pirules.org to be able to use this tool</p>
  <input type=button value="Login" onclick="Main.login();"></input>

<?php
  }
?>
<!--  <font color=red>-->
    <div id=error></div>
<!--  </font>-->

<?php echo get_footer();?>
