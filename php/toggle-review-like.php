<?php
session_start();
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Log in to like a review."]);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    header("Allow: POST");
    echo json_encode(["success" => false, "message" => "Use POST to like a review."]);
    exit;
}

$reviewId = filter_var($_POST["review_id"] ?? null, FILTER_VALIDATE_INT);
if ($reviewId === false || $reviewId === null || $reviewId < 1) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "A valid review is required."]);
    exit;
}

$userId = (int) $_SESSION["user_id"];
$conn->begin_transaction();

try {
    $find = $conn->prepare("SELECT 1 FROM review_likes WHERE review_id = ? AND user_id = ?");
    $find->bind_param("ii", $reviewId, $userId);
    $find->execute();
    $alreadyLiked = $find->get_result()->num_rows > 0;

    if ($alreadyLiked) {
        $change = $conn->prepare("DELETE FROM review_likes WHERE review_id = ? AND user_id = ?");
    } else {
        $change = $conn->prepare("INSERT IGNORE INTO review_likes (review_id, user_id) VALUES (?, ?)");
    }
    $change->bind_param("ii", $reviewId, $userId);
    $change->execute();

    $count = $conn->prepare("SELECT COUNT(*) AS total FROM review_likes WHERE review_id = ?");
    $count->bind_param("i", $reviewId);
    $count->execute();
    $likeCount = (int) $count->get_result()->fetch_assoc()["total"];

    $conn->commit();
    echo json_encode([
        "success" => true,
        "liked" => !$alreadyLiked,
        "like_count" => $likeCount
    ]);
} catch (Throwable $error) {
    $conn->rollback();
    error_log("Review like update failed: " . $error->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Could not update the review like."]);
}
