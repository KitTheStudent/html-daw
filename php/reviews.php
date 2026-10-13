<?php
session_start();
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    header("Allow: GET");
    echo json_encode(["success" => false, "message" => "Use GET to read reviews."]);
    exit;
}

$gameId = $_GET["game_id"] ?? null;
$sort = $_GET["sort"] ?? "latest";
// Only allow known sort orders; the selected SQL fragment is never user-supplied.
$allowedSorts = [
    "latest" => "r.created_at DESC, r.id DESC",
    "most_liked" => "likes.like_count DESC, r.created_at DESC, r.id DESC",
    "highest_xp" => "r.rating DESC, r.created_at DESC, r.id DESC"
];

if (!is_string($gameId) || trim($gameId) === "" || strlen($gameId) > 50 || !is_string($sort) || !isset($allowedSorts[$sort])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "A valid game and review sort are required."]);
    exit;
}

$gameId = trim($gameId);
$userId = isset($_SESSION["user_id"]) ? (int) $_SESSION["user_id"] : 0;
// Aggregate likes separately so reviews without likes still appear in the results.
$sql = "
    SELECT
        r.id,
        u.username,
        r.rating AS xp,
        r.comment,
        r.created_at,
        COALESCE(likes.like_count, 0) AS like_count,
        COALESCE(likes.liked_by_me, 0) AS liked_by_me
    FROM reviews r
    INNER JOIN `user` u ON u.id = r.user_id
    LEFT JOIN (
        SELECT
            review_id,
            COUNT(*) AS like_count,
            MAX(user_id = ?) AS liked_by_me
        FROM review_likes
        GROUP BY review_id
    ) likes ON likes.review_id = r.id
    WHERE r.game_id = ?
    ORDER BY " . $allowedSorts[$sort];

$stmt = $conn->prepare($sql);
$stmt->bind_param("is", $userId, $gameId);
$stmt->execute();
$result = $stmt->get_result();
$reviews = [];

while ($review = $result->fetch_assoc()) {
    $review["id"] = (int) $review["id"];
    $review["xp"] = (int) $review["xp"];
    $review["like_count"] = (int) $review["like_count"];
    $review["liked_by_me"] = (bool) $review["liked_by_me"];
    $reviews[] = $review;
}

echo json_encode([
    "success" => true,
    "logged_in" => isset($_SESSION["user_id"]),
    "reviews" => $reviews
]);
