<?php
// filepath: c:\Users\Andrew\Documents\Iskol\WEB\Html pages\create-account.php

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    exit("Invalid request.");
}

$conn = new mysqli("127.0.0.1", "root", "", "rateanything", 3307);

if ($conn->connect_error) {
    die("Database connection failed.");
}

$username = trim($_POST["username"] ?? "");
$email = trim($_POST["email"] ?? "");
$password = $_POST["password"] ?? "";
$confirmPassword = $_POST["confirm_password"] ?? "";

if ($password !== $confirmPassword) {
    exit("Passwords do not match.");
}

$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conn->prepare(
    "INSERT INTO `user` (username, email, password) VALUES (?, ?, ?)"
);

$stmt->bind_param("sss", $username, $email, $hashedPassword);

if ($stmt->execute()) {
    header("Location: Login-Page.html");
    exit;
}

echo "Account creation failed. Username or email may already exist.";