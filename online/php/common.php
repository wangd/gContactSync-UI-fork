<?php
  // add the useful stripos function for PHP if it isn't present in the version on the server
  if (!function_exists("stripos")) {
      function stripos($haystack, $needle, $offset=0) {
          return strpos(strtolower($haystack), strtolower($needle), $offset);
      }
  }
?>
