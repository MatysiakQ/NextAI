<?php
// Dodaj to na samym początku pliku:
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

session_start();
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../vendor/autoload.php';

// Dodaj ładowanie .env:
if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
}

$db_host = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? null);
$db_name = getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? null);
$db_user = getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? null);
$db_pass = getenv('DB_PASS') ?: ($_ENV['DB_PASS'] ?? null);

if (!$db_host || !$db_name || !$db_user) {
    echo json_encode(['success' => false, 'message' => 'Błąd konfiguracji bazy danych']);
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host=$db_host;dbname=$db_name;charset=utf8mb4",
        $db_user,
        $db_pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (Exception $e) {
    error_log("PDO ERROR: " . $e->getMessage(), 3, __DIR__ . '/../pdo_errors.log');
    echo json_encode(['success' => false, 'message' => 'Błąd połączenia z bazą danych']);
    exit;
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action === 'register') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $password2 = $_POST['password2'] ?? '';
    if (!$email || !$password) {
        echo json_encode(['success' => false, 'message' => 'Podaj email i hasło']);
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Nieprawidłowy email']);
        exit;
    }
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'message' => 'Hasło za krótkie']);
        exit;
    }
    if ($password !== $password2) {
        echo json_encode(['success' => false, 'message' => 'Hasła nie są takie same!']);
        exit;
    }
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Email już istnieje']);
        exit;
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (email, password) VALUES (?, ?)");
    $stmt->execute([$email, $hash]);
    $_SESSION['user_id'] = $pdo->lastInsertId();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'login') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    if (!$email || !$password) {
        echo json_encode(['success' => false, 'message' => 'Podaj email i hasło']);
        exit;
    }
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Nieprawidłowe dane logowania']);
    }
    exit;
}

if ($action === 'logout') {
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'subscriptions') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Brak dostępu']);
        exit;
    }
    try {
        // Najpierw pobierz email użytkownika
        $stmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            echo json_encode(['success' => false, 'subscriptions' => [], 'message' => 'Nie znaleziono użytkownika']);
            exit;
        }
        // Teraz pobierz subskrypcje po emailu
        $stmt = $pdo->prepare("SELECT * FROM subscriptions WHERE email = ?");
        $stmt->execute([$user['email']]);
        $subs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'subscriptions' => $subs]);
    } catch (Exception $e) {
        error_log("SUBSCRIPTIONS SQL ERROR: " . $e->getMessage(), 3, __DIR__ . '/../pdo_errors.log');
        echo json_encode(['success' => false, 'subscriptions' => [], 'message' => 'Błąd pobierania subskrypcji']);
    }
    exit;
}

if ($action === 'reset_password') {
    $email = trim($_POST['email'] ?? '');
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Podaj poprawny adres e-mail']);
        exit;
    }
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Nie znaleziono użytkownika o tym adresie email']);
        exit;
    }
    // Wygeneruj token resetu
    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', time() + 3600); // 1h ważności
    $stmt = $pdo->prepare("UPDATE users SET reset_token=?, reset_token_expires=? WHERE id=?");
    $stmt->execute([$token, $expires, $user['id']]);
    // Wyślij email z linkiem resetującym (prosty mail, produkcyjnie użyj SMTP)
    $resetLink = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http")
        . "://{$_SERVER['HTTP_HOST']}" . dirname($_SERVER['REQUEST_URI']) . "/reset_password.html?token=$token";
    $subject = "Resetowanie hasła NextAI";
    $message = "Kliknij w link, aby ustawić nowe hasło:\n$resetLink\n\nLink ważny 1 godzinę.";
    @mail($email, $subject, $message, "From: NextAI <no-reply@nextai.pl>");
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'set_new_password') {
    $token = $_POST['token'] ?? '';
    $password = $_POST['password'] ?? '';
    $password2 = $_POST['password2'] ?? '';
    if (!$token || !$password || !$password2) {
        echo json_encode(['success' => false, 'message' => 'Brak wymaganych danych']);
        exit;
    }
    if ($password !== $password2) {
        echo json_encode(['success' => false, 'message' => 'Hasła nie są takie same!']);
        exit;
    }
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'message' => 'Hasło za krótkie']);
        exit;
    }
    $stmt = $pdo->prepare("SELECT id, reset_token_expires FROM users WHERE reset_token=?");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || strtotime($user['reset_token_expires']) < time()) {
        echo json_encode(['success' => false, 'message' => 'Token wygasł lub jest nieprawidłowy']);
        exit;
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("UPDATE users SET password=?, reset_token=NULL, reset_token_expires=NULL WHERE id=?");
    $stmt->execute([$hash, $user['id']]);
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'reset_password_code') {
    $email = trim($_POST['email'] ?? '');
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Podaj poprawny adres e-mail']);
        exit;
    }
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Nie znaleziono użytkownika o tym adresie email']);
        exit;
    }
    // Wygeneruj kod (np. 6-8 cyfr)
    $code = str_pad(random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
    $expires = date('Y-m-d H:i:s', time() + 900); // 15 min ważności
    $stmt = $pdo->prepare("UPDATE users SET reset_code=?, reset_code_expires=? WHERE id=?");
    $stmt->execute([$code, $expires, $user['id']]);
    // Wyślij email z kodem
    $subject = "Kod resetowania hasła NextAI";
    $message = "Twój kod resetowania hasła: $code\nKod ważny 15 minut.";
    @mail($email, $subject, $message, "From: NextAI <no-reply@nextai.pl>");
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'verify_reset_code') {
    $email = trim($_POST['email'] ?? '');
    $code = trim($_POST['code'] ?? '');
    if (!$email || !$code) {
        echo json_encode(['success' => false, 'message' => 'Brak danych']);
        exit;
    }
    $stmt = $pdo->prepare("SELECT reset_code, reset_code_expires FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || !$user['reset_code'] || !$user['reset_code_expires']) {
        echo json_encode(['success' => false, 'message' => 'Kod nie został wysłany lub wygasł']);
        exit;
    }
    if ($user['reset_code'] !== $code) {
        echo json_encode(['success' => false, 'message' => 'Kod niepoprawny']);
        exit;
    }
    if (strtotime($user['reset_code_expires']) < time()) {
        echo json_encode(['success' => false, 'message' => 'Kod wygasł']);
        exit;
    }
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'set_new_password_code') {
    $email = trim($_POST['email'] ?? '');
    $code = trim($_POST['code'] ?? '');
    $password = $_POST['password'] ?? '';
    $password2 = $_POST['password2'] ?? '';
    if (!$email || !$code || !$password || !$password2) {
        echo json_encode(['success' => false, 'message' => 'Brak wymaganych danych']);
        exit;
    }
    if ($password !== $password2) {
        echo json_encode(['success' => false, 'message' => 'Hasła nie są takie same!']);
        exit;
    }
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'message' => 'Hasło za krótkie']);
        exit;
    }
    $stmt = $pdo->prepare("SELECT id, reset_code, reset_code_expires FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || !$user['reset_code'] || !$user['reset_code_expires']) {
        echo json_encode(['success' => false, 'message' => 'Kod nie został wysłany lub wygasł']);
        exit;
    }
    if ($user['reset_code'] !== $code) {
        echo json_encode(['success' => false, 'message' => 'Kod niepoprawny']);
        exit;
    }
    if (strtotime($user['reset_code_expires']) < time()) {
        echo json_encode(['success' => false, 'message' => 'Kod wygasł']);
        exit;
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("UPDATE users SET password=?, reset_code=NULL, reset_code_expires=NULL WHERE id=?");
    $stmt->execute([$hash, $user['id']]);
    echo json_encode(['success' => true]);
    exit;
}

// Dodaj globalny handler na końcu pliku, aby zawsze zwracać JSON nawet przy nieprzechwyconym błędzie:
set_exception_handler(function($e) {
    error_log("UNCAUGHT ERROR: " . $e->getMessage(), 3, __DIR__ . '/../php_errors.log');
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Wewnętrzny błąd serwera']);
    exit;
});

echo json_encode(['success' => false, 'message' => 'Nieznana akcja']);

?>