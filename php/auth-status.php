<?php
session_start();

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate");

$loggedIn = isset($_SESSION["user_id"]) && is_string($_SESSION["username"] ?? null);

echo json_encode([
    "logged_in" => $loggedIn,
    "username" => $loggedIn ? $_SESSION["username"] : null
], JSON_UNESCAPED_UNICODE);
