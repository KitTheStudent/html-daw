<?php
session_start();
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

// Only signed-in adventurers can publish a review.
if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Please log in to submit a review."]);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    header("Allow: POST");
    echo json_encode(["success" => false, "message" => "Use POST to submit a review."]);
    exit;
}

$gameIdInput = $_POST["game_id"] ?? null;
$ratingInput = $_POST["rating"] ?? null;
$commentInput = $_POST["comment"] ?? null;

if (!is_string($gameIdInput) || !is_string($ratingInput) || !is_string($commentInput)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Game, rating, and comment are required."]);
    exit;
}

$gameId = trim($gameIdInput);
$rating = filter_var($ratingInput, FILTER_VALIDATE_INT);
$comment = trim($commentInput);

if ($gameId === "" || strlen($gameId) > 100 || $rating === false || $rating < 1 || $rating > 5 || $comment === "") {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Enter a game, a rating from 1 to 5, and a comment."]);
    exit;
}

$userId = (int) $_SESSION["user_id"];
$stmt = $conn->prepare("INSERT INTO `reviews` (user_id, game_id, rating, comment) VALUES (?, ?, ?, ?)");
$stmt->bind_param("isis", $userId, $gameId, $rating, $comment);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Review published to the scroll!"]);
    exit;
}

http_response_code(500);
echo json_encode(["success" => false, "message" => "Failed to save review."]);
?>