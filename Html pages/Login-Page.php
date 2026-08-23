<?php
// filepath: c:\Users\Andrew\Documents\Iskol\WEB\Html pages\Login-Page.php
session_start();

$conn = new mysqli("127.0.0.1", "root", "", "rateanything", 3307);

if ($conn->connect_error) {
    die("Database connection failed.");
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    exit("Invalid request.");
}

$username = trim($_POST["username"] ?? "");
$password = $_POST["password"] ?? "";

$stmt = $conn->prepare(
    "SELECT username, password FROM `user` WHERE username = ?"
);
$stmt->bind_param("s", $username);
$stmt->execute();

$result = $stmt->get_result();
$user = $result->fetch_assoc();

$passwordIsValid = $user && password_verify($password, $user["password"]);
if ($user && !$passwordIsValid && $password === (string) $user["password"]) {
    $newHash = password_hash($password, PASSWORD_DEFAULT);
    $updateStmt = $conn->prepare("UPDATE `user` SET password = ? WHERE username = ?");
    $updateStmt->bind_param("ss", $newHash, $user["username"]);
    $updateStmt->execute();
    $passwordIsValid = true;
}

if ($passwordIsValid) {
    $_SESSION["username"] = $user["username"];
    header("Location:Landing-page.html");
    exit;
}

echo "Invalid username or password.";