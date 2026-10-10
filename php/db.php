<?php
// php/db.php
$host = "127.0.0.1";
$user = "root";
$password = "";
$database = "tj_db"; // Updated to tj_db
$port = 3307;        // Port from your phpMyAdmin header

$conn = new mysqli($host, $user, $password, $database, $port);

if ($conn->connect_error) {
    die("Database Connection Error: " . $conn->connect_error);
}
?>