<?php
session_start();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    header("Allow: POST");
    exit("Use POST to log out.");
}

$_SESSION = [];

if (ini_get("session.use_cookies")) {
    $cookie = session_get_cookie_params();
    setcookie(
        session_name(),
        "",
        time() - 42000,
        $cookie["path"],
        $cookie["domain"],
        $cookie["secure"],
        $cookie["httponly"]
    );
}

session_destroy();

header("Location: ../Html%20pages/Home.html");
exit;
