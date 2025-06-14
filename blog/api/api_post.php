<?php
session_start();

// --- zakomentowane pobieranie tokena z .env ---
// $envPath = dirname(__DIR__, 2) . '/.env';
// if (file_exists($envPath)) {
//     $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
//     foreach ($lines as $line) {
//         $line = trim($line);
//         if ($line === '' || $line[0] === '#') continue;
//         $parts = explode('=', $line, 2);
//         if (count($parts) === 2) {
//             $_ENV[trim($parts[0])] = trim($parts[1]);
//         }
//     }
// }

ob_start(); // Buforuj wyjście – żeby uniknąć "invalid JSON" przez przypadkowe echo

header('Content-Type: application/json');
ini_set('display_errors', 0); // Ukryj warningi
error_reporting(0);           // Wyłącz ostrzeżenia

// Wczytaj .env
try {
    require_once __DIR__ . '/../../vendor/autoload.php';
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
    $dotenv->load();
} catch (Exception $e) {
    http_response_code(500);
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => 'Failed to load .env: ' . $e->getMessage()]);
    exit;
}

// Sprawdź token
$headers = [];
foreach (getallheaders() as $k => $v) {
    $headers[strtolower($k)] = $v;
}
$auth = $headers['authorization'] ?? '';

// --- statyczny token do testów ---
$apiToken = 'yb1pxxpdr*%4ihz3n6=$';

// Sprawdź czy Authorization jest w formacie "Bearer ..."
if (strpos($auth, 'Bearer ') === 0) {
    $providedToken = trim(substr($auth, 7));
} else {
    $providedToken = '';
}

// Tymczasowo wyłącz sprawdzanie tokena dla testów
// if ($providedToken !== $apiToken) {
//     http_response_code(401);
//     echo json_encode(['success' => false, 'message' => 'Unauthorized']);
//     exit;
// }

file_put_contents(__DIR__ . '/../debug_headers.json', json_encode($headers, JSON_PRETTY_PRINT));


// Parsowanie JSON body
$inputRaw = file_get_contents('php://input');
$input = json_decode($inputRaw, true);

if (!is_array($input)) {
    http_response_code(400);
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => 'Invalid JSON body']);
    exit;
}

// Pobierz dane posta
$title = $input['title'] ?? null;
$content = $input['content'] ?? null;
$author = $input['author'] ?? 'Anonymous';
$date = $input['date'] ?? date('Y-m-d');
$tag = $input['tag'] ?? '';

if (!$title || !$content) {
    http_response_code(400);
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => 'Title and content are required']);
    exit;
}

// --- Sprawdzenie uprawnień administratora lub n8n ---
$headers = [];
foreach (getallheaders() as $k => $v) {
    $headers[strtolower($k)] = $v;
}

// Pozwól na dodawanie postów z n8n jeśli jest specjalny nagłówek
$isN8N = false;
if (isset($headers['x-n8n-secret'])) {
    // Usuń ewentualne białe znaki
    $n8nSecret = trim($headers['x-n8n-secret']);
    if ($n8nSecret === 'yb1pxxpdr*%4ihz3n6=$') { // <- ustaw swój sekret
        $isN8N = true;
    }
}

if (
    !$isN8N &&
    (!isset($_SESSION['user_email']) || empty($_SESSION['user_email']) || empty($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true)
) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Tylko administrator może dodawać posty.']);
    exit;
}

// Zapisz do posts.json
$postsFile = __DIR__ . '/../posts.json';
$posts = [];
if (file_exists($postsFile)) {
    $json = file_get_contents($postsFile);
    $posts = json_decode($json, true) ?: [];
}
$newPost = [
    'title' => $title,
    'content' => $content,
    'author' => $author,
    'date' => $date,
    'tag' => $tag
];
array_unshift($posts, $newPost);
file_put_contents($postsFile, json_encode($posts, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// Odpowiedź
http_response_code(200);
ob_end_clean();
echo json_encode(['success' => true, 'message' => 'Post added', 'post' => $newPost]);
exit;
