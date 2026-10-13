<?php
$host = "127.0.0.1";
$user = "root";
$password = "";
$database = "tj_db";
$port = 3307;

// Share one MySQL connection across the site's PHP endpoints.
$conn = new mysqli($host, $user, $password, $database, $port);

if ($conn->connect_error) {
    die("Database Connection Error: " . $conn->connect_error);
}
?>