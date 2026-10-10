<?php
// filepath: WEB/php/create-account.php
session_start();

// Import shared database connection
require_once __DIR__ . '/db.php';

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    exit("Invalid request.");
}

$usernameInput = $_POST["username"] ?? null;
$emailInput = $_POST["email"] ?? null;
$password = $_POST["password"] ?? null;
$confirmPassword = $_POST["confirm_password"] ?? null;

if (
    !is_string($usernameInput)
    || !is_string($emailInput)
    || !is_string($password)
    || !is_string($confirmPassword)
) {
    exit("All fields are required.");
}

$username = trim($usernameInput);
$email = trim($emailInput);

if (strlen($username) < 3 || strlen($username) > 20 || preg_match('/\A[A-Za-z0-9_]+\z/', $username) !== 1) {
    exit("Username must be 3–20 characters and contain only letters, numbers, or underscores.");
}

if (strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    exit("Enter a valid email address.");
}

if (
    strlen($password) < 8
    || strlen($password) > 128
    || preg_match('/[a-z]/', $password) !== 1
    || preg_match('/[A-Z]/', $password) !== 1
    || preg_match('/[0-9]/', $password) !== 1
    || preg_match('/[^A-Za-z0-9\s]/', $password) !== 1
) {
    exit("Password must be 8–128 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.");
}

if ($password !== $confirmPassword) {
    exit("Passwords do not match.");
}

$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conn->prepare(
    "INSERT INTO `user` (username, email, password) VALUES (?, ?, ?)"
);

$stmt->bind_param("sss", $username, $email, $hashedPassword);

if ($stmt->execute()) {
    header("Location: ../Html%20pages/Login-Page.html");
    exit;
}

echo "Account creation failed. Username or email may already exist.";
?>