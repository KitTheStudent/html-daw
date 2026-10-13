<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    header("Allow: GET");
    echo json_encode(["success" => false, "message" => "Use GET to load a trailer."]);
    exit;
}

$appId = $_GET["app_id"] ?? null;
// Accept only numeric Steam app IDs before building the upstream request.
if (!is_string($appId) || preg_match('/\A[0-9]{1,10}\z/', $appId) !== 1) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "A valid Steam app ID is required."]);
    exit;
}

if (!function_exists("curl_init")) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "The server cannot connect to the game archive."]);
    exit;
}

$request = curl_init("https://store.steampowered.com/api/appdetails?appids=" . rawurlencode($appId));
curl_setopt_array($request, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 12,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_USERAGENT => "TravelersJourney/1.0"
]);
$responseBody = curl_exec($request);
$statusCode = (int) curl_getinfo($request, CURLINFO_HTTP_CODE);

if ($responseBody === false || $statusCode < 200 || $statusCode >= 300) {
    error_log("Steam trailer lookup failed with HTTP status " . $statusCode . ".");
    curl_close($request);
    http_response_code(502);
    echo json_encode(["success" => false, "message" => "The trailer archive is temporarily unavailable."]);
    exit;
}

curl_close($request);
$response = json_decode($responseBody, true);
$app = $response[$appId]["data"] ?? null;
// Steam can return several trailer formats; use a secure HLS stream when available.
$movie = is_array($app["movies"] ?? null)
    ? current(array_filter($app["movies"], static function ($item) {
        return is_string($item["hls_h264"] ?? null) && str_starts_with($item["hls_h264"], "https://");
    }))
    : false;

if (!is_array($movie)) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "No playable trailer is available for this game."]);
    exit;
}

echo json_encode([
    "success" => true,
    "name" => is_string($movie["name"] ?? null) ? $movie["name"] : "Game trailer",
    "stream" => $movie["hls_h264"]
]);
