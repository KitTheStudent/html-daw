<?php
session_start();

// Use the same database connection as the rest of the site.
require_once __DIR__ . '/db.php';

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    exit("Invalid request.");
}

$usernameInput = $_POST["username"] ?? null;
$password = $_POST["password"] ?? null;

if (!is_string($usernameInput) || !is_string($password)) {
    exit("Username and password are required.");
}

$username = trim($usernameInput);

if ($username === "" || $password === "") {
    exit("Username and password are required.");
}

$stmt = $conn->prepare(
    "SELECT id, username, password FROM `user` WHERE username = ?"
);
$stmt->bind_param("s", $username);
$stmt->execute();

$result = $stmt->get_result();
$user = $result->fetch_assoc();

$passwordIsValid = $user && password_verify($password, $user["password"]);

// Upgrade older plain-text passwords to a hash the next time their owner signs in.
if ($user && !$passwordIsValid && $password === (string)$user["password"]) {
    $newHash = password_hash($password, PASSWORD_DEFAULT);
    $updateStmt = $conn->prepare("UPDATE `user` SET password = ? WHERE id = ?");
    $updateStmt->bind_param("si", $newHash, $user["id"]);
    $updateStmt->execute();
    $passwordIsValid = true;
}

if ($passwordIsValid) {
    session_regenerate_id(true);

    // Keep the signed-in user's identity available to the rest of the site.
    $_SESSION["user_id"] = $user["id"];
    $_SESSION["username"] = $user["username"];
    
    // Send the newly signed-in user to the home page.
    header("Location: ../Html%20pages/Home.html");
    exit;
}

echo "Invalid username or password.";
?>