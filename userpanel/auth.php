<?php
// Dodaj to na samym początku pliku:
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

session_start();

header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$db_host = $_ENV['DB_HOST'];
$db_name = $_ENV['DB_NAME'];
$db_user = $_ENV['DB_USER'];
$db_pass = $_ENV['DB_PASS'];


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

$action = $_POST['action'] ?? $_GET['action'] ?? null;
if (!$action) {
    echo json_encode(['success' => false, 'message' => 'Brak parametru akcji.']);
    exit;
}

if ($action === 'register') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $password2 = $_POST['password2'] ?? '';
    $username = trim($_POST['username'] ?? ''); // Dodaj pobieranie nicku
    if (!$email || !$password || !$username) {
        echo json_encode(['success' => false, 'message' => 'Podaj email, nazwę użytkownika i hasło']);
        exit;
    }
    if (!preg_match('/^[a-zA-Z0-9_\-\.]{3,32}$/', $username)) {
        echo json_encode(['success' => false, 'message' => 'Nieprawidłowa nazwa użytkownika']);
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Nieprawidłowy email']);
        exit;
    }
    // Wymagania: min. 6 znaków, 1 wielka litera, 1 cyfra
    if (!preg_match('/^(?=.*[A-Z])(?=.*\d).{6,}$/', $password)) {
        echo json_encode(['success' => false, 'message' => 'Hasło musi mieć min. 6 znaków, 1 wielką literę i 1 cyfrę']);
        exit;
    }
    if ($password !== $password2) {
        echo json_encode(['success' => false, 'message' => 'Hasła nie są takie same!']);
        exit;
    }
    // Sprawdź czy email lub nick już istnieje
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? OR NazwaUzytkownika = ?");
    $stmt->execute([$email, $username]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Email lub nazwa użytkownika już istnieje']);
        exit;
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (email, password, NazwaUzytkownika) VALUES (?, ?, ?)");
    $stmt->execute([$email, $hash, $username]);
    $_SESSION['user_id'] = $pdo->lastInsertId();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'login') {
    $login = trim($_POST['email'] ?? ''); // może być email lub nick
    $password = $_POST['password'] ?? '';
    if (!$login || !$password) {
        echo json_encode(['success' => false, 'message' => 'Podaj login/email i hasło']);
        exit;
    }
    try {
        // Szukaj po email lub NazwaUzytkownika
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? OR NazwaUzytkownika = ?");
        $stmt->execute([$login, $login]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user && !empty($user['password']) && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Nieprawidłowe dane logowania']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Błąd logowania']);
    }
    exit;
}

if ($action === 'logout') {
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'update_profile') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Brak dostępu']);
        exit;
    }
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $password2 = $_POST['password2'] ?? '';
    $oldPassword = $_POST['old_password'] ?? '';
    $avatarPath = null;

    if (!$username || !$email) {
        echo json_encode(['success' => false, 'message' => 'Podaj nazwę użytkownika i email']);
        exit;
    }
    if (!preg_match('/^[a-zA-Z0-9_\-\.]{3,32}$/', $username)) {
        echo json_encode(['success' => false, 'message' => 'Nieprawidłowa nazwa użytkownika']);
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Nieprawidłowy email']);
        exit;
    }
    // Sprawdź czy nick lub email nie jest już zajęty przez innego użytkownika
    $stmt = $pdo->prepare("SELECT id FROM users WHERE (email = ? OR NazwaUzytkownika = ?) AND id != ?");
    $stmt->execute([$email, $username, $_SESSION['user_id']]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Email lub nazwa użytkownika już istnieje']);
        exit;
    }

    // Obsługa uploadu avatara
    if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
        $fileTmp = $_FILES['avatar']['tmp_name'];
        $fileName = $_FILES['avatar']['name'];
        $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!in_array($fileExt, $allowed)) {
            echo json_encode(['success' => false, 'message' => 'Nieprawidłowy format avatara']);
            exit;
        }
        $avatarDir = __DIR__ . '/avatary/';
        if (!is_dir($avatarDir)) mkdir($avatarDir, 0777, true);
        $newName = 'avatar_' . $_SESSION['user_id'] . '_' . time() . '.' . $fileExt;
        $destPath = $avatarDir . $newName;
        if (!move_uploaded_file($fileTmp, $destPath)) {
            echo json_encode(['success' => false, 'message' => 'Błąd zapisu avatara']);
            exit;
        }
        $avatarPath = 'avatary/' . $newName;
    }

    // Aktualizuj dane
    if ($password) {
        // Wymagania: min. 6 znaków, 1 wielka litera, 1 cyfra
        if (!preg_match('/^(?=.*[A-Z])(?=.*\d).{6,}$/', $password)) {
            echo json_encode(['success' => false, 'message' => 'Hasło musi mieć min. 6 znaków, 1 wielką literę i 1 cyfrę']);
            exit;
        }
        if ($password !== $password2) {
            echo json_encode(['success' => false, 'message' => 'Hasła nie są takie same!']);
            exit;
        }
        // Sprawdź stare hasło
        $stmt = $pdo->prepare("SELECT password FROM users WHERE id=?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$oldPassword || !$user || !password_verify($oldPassword, $user['password'])) {
            echo json_encode(['success' => false, 'message' => 'Stare hasło niepoprawne']);
            exit;
        }
        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($avatarPath) {
            $stmt = $pdo->prepare("UPDATE users SET NazwaUzytkownika=?, email=?, password=?, Avatar=? WHERE id=?");
            $stmt->execute([$username, $email, $hash, $avatarPath, $_SESSION['user_id']]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET NazwaUzytkownika=?, email=?, password=? WHERE id=?");
            $stmt->execute([$username, $email, $hash, $_SESSION['user_id']]);
        }
    } else {
        if ($avatarPath) {
            $stmt = $pdo->prepare("UPDATE users SET NazwaUzytkownika=?, email=?, Avatar=? WHERE id=?");
            $stmt->execute([$username, $email, $avatarPath, $_SESSION['user_id']]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET NazwaUzytkownika=?, email=? WHERE id=?");
            $stmt->execute([$username, $email, $_SESSION['user_id']]);
        }
    }
    echo json_encode(['success' => true, 'avatar' => $avatarPath]);
    exit;
}

if ($action === 'subscriptions') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Brak dostępu']);
        exit;
    }
    try {
        $stmt = $pdo->prepare("SELECT email, NazwaUzytkownika, Avatar FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            echo json_encode(['success' => false, 'subscriptions' => [], 'message' => 'Nie znaleziono użytkownika']);
            exit;
        }
        $stmt = $pdo->prepare("SELECT * FROM subscriptions WHERE email = ?");
        $stmt->execute([$user['email']]);
        $subs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode([
            'success' => true,
            'subscriptions' => $subs,
            'user' => [
                'email' => $user['email'],
                'username' => $user['NazwaUzytkownika'] ?? (explode('@', $user['email'])[0]),
                'avatar' => $user['Avatar'] ?? null
            ]
        ]);
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
    $oldPassword = $_POST['old_password'] ?? '';
    if (!$token || !$password || !$password2 || !$oldPassword) {
        echo json_encode(['success' => false, 'message' => 'Brak wymaganych danych']);
        exit;
    }
    if ($password !== $password2) {
        echo json_encode(['success' => false, 'message' => 'Hasła nie są takie same!']);
        exit;
    }
    // Wymagania: min. 6 znaków, 1 wielka litera, 1 cyfra
    if (!preg_match('/^(?=.*[A-Z])(?=.*\d).{6,}$/', $password)) {
        echo json_encode(['success' => false, 'message' => 'Hasło musi mieć min. 6 znaków, 1 wielką literę i 1 cyfrę']);
        exit;
    }
    $stmt = $pdo->prepare("SELECT id, reset_token_expires, password FROM users WHERE reset_token=?");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || strtotime($user['reset_token_expires']) < time()) {
        echo json_encode(['success' => false, 'message' => 'Token wygasł lub jest nieprawidłowy']);
        exit;
    }
    // Sprawdź stare hasło
    if (!$oldPassword || !password_verify($oldPassword, $user['password'])) {
        echo json_encode(['success' => false, 'message' => 'Stare hasło niepoprawne']);
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
    $oldPassword = $_POST['old_password'] ?? '';
    if (!$email || !$code || !$password || !$password2 || !$oldPassword) {
        echo json_encode(['success' => false, 'message' => 'Brak wymaganych danych']);
        exit;
    }
    if ($password !== $password2) {
        echo json_encode(['success' => false, 'message' => 'Hasła nie są takie same!']);
        exit;
    }
    // Wymagania: min. 6 znaków, 1 wielka litera, 1 cyfra
    if (!preg_match('/^(?=.*[A-Z])(?=.*\d).{6,}$/', $password)) {
        echo json_encode(['success' => false, 'message' => 'Hasło musi mieć min. 6 znaków, 1 wielką literę i 1 cyfrę']);
        exit;
    }
    $stmt = $pdo->prepare("SELECT id, reset_code, reset_code_expires, password FROM users WHERE email = ?");
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
    // Sprawdź stare hasło
    if (!$oldPassword || !password_verify($oldPassword, $user['password'])) {
        echo json_encode(['success' => false, 'message' => 'Stare hasło niepoprawne']);
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