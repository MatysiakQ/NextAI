<?php
session_start();
header("Content-Type: application/json");

require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;

// 🔐 Załaduj zmienne z .env
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

try {
    $db_host = $_ENV['DB_HOST'];
    $db_name = $_ENV['DB_NAME'];
    $db_user = $_ENV['DB_USER'];
    $db_pass = $_ENV['DB_PASS'];
    $db_port = $_ENV['DB_PORT'] ?? '3306';

    // ✅ Połącz z MySQL
    $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_name;charset=utf8mb4";
    $db = new PDO($dsn, $db_user, $db_pass);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Błąd bazy danych: " . $e->getMessage()]);
    exit;
}

$token = $_POST['token'] ?? '';
if (!$token) {
    echo json_encode(["success" => false, "message" => "Brak tokenu"]);
    exit;
}

// 🛡️ Weryfikacja tokenu Google
$ch = curl_init("https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($token));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
$data = json_decode($response, true);

if (!$data || !isset($data['email'])) {
    echo json_encode(["success" => false, "message" => "Token niepoprawny"]);
    exit;
}

// ✅ Opcjonalna weryfikacja client_id
if ($data['aud'] !== $_ENV['GOOGLE_CLIENT_ID']) {
    echo json_encode(["success" => false, "message" => "Nieprawidłowy klient Google"]);
    exit;
}

$email = $data['email'];
$username = $data['name'] ?? explode('@', $email)[0];

// 🔍 Sprawdź, czy użytkownik już istnieje
$stmt = $db->prepare("SELECT id, username FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    // 🆕 Rejestracja użytkownika z losowym hasłem
    $fakePassword = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
    $stmt = $db->prepare("INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())");
    $stmt->execute([$username, $email, $fakePassword]);
    $userId = $db->lastInsertId();
} else {
    $userId = $user['id'];
    $username = $user['username'];
}

// ✅ Zaloguj użytkownika (ustaw zgodnie z auth.php)
$_SESSION['user'] = [
    'id' => $userId,
    'email' => $email,
    'name' => $username
];
$_SESSION['user_id'] = $userId;
$_SESSION['user_email'] = $email;
$_SESSION['username'] = $username;
$_SESSION['login_time'] = time();

echo json_encode(["success" => true, "redirect" => "user_panel.html"]);
