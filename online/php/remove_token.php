<?php
  echo $_SESSION['token'];
  if (isset($_SESSION['token'])) {
    unset($_SESSION['token']);
    echo "Unset token";
  }
?>
