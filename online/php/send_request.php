<?php
include_once 'common.php';
require_once 'HttpRetriever.php';
session_start();
if (!isset($_SESSION['token'])) {
  echo "Error - A session token is required";
  return;
}
$url  = $_REQUEST['url'];
if (stripos($url, "google.com") === FALSE) {
  echo "Error - $url is invalid";
  return;
}
if (!$url) {
  echo "Error - url is a required parameter";
  return;
}
$type = isset($_REQUEST['type']) ? $_REQUEST['type'] : "get";
$http = &new HttpRetriever();
$http->headers = array(
  "Referrer"      => "",
  "User-Agent"    => "gContactSync/0.2",
  "Authorization" => "AuthSub token=\"{$_SESSION['token']}\"",
  "GData-Version" => "2",
  "Accept"        => "text/html, image/gif, image/jpeg, *; q=.2, */*; q=.2",
  "Connection"    => "keep-alive");
if (isset($_REQUEST['content_type'])) {
  $http->headers['Content-Type'] = $_REQUEST['content_type'];
}
if (isset($_REQUEST['debug'])) {
  echo "Error - debug parameter set";
  echo "\nUrl: $url";
  echo "\nType: $type";
  echo "\nHeaders:\n";
  var_dump($http->headers);
}
if ($type == "get" || $type == "GET") {
  if (!$http->get($url)) {
    echo "Error - {$http->result_code}: {$http->result_text}<br>\n";
    echo "URL: $url<br>\nHeaders:<br>\n";
    var_dump($http->headers);
    return;
  }
}
else if ($type == "post" || $type == "POST") {
  if (!$http->post($url)) {
    echo "Error - {$http->result_code}: {$http->result_text}<br>\n";
    echo "URL: $url<br>\nHeaders:<br>\n";
    var_dump($http->headers);
    return;
  }
}
else {
  echo "Error - Unrecognized type - $type";
  return;
}

if (!$http->response) {
  echo "No response, here's a vardump of the headers:<br>";
  echo var_dump($http->headers);
  return;
}
header("Content-Type:text/xml");
echo $http->response;
?>
