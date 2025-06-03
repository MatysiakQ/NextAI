
<?php
// auth.php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

$pdoErrorLogFile = __DIR__ . '/../pdo_errors.log';

$cookieLifetime = 30 * 24 * 60 * 60; // 30 dni
session_set_cookie_params([
    'lifetime' => $cookieLifetime,
    'path' => '/',
    'domain' => '', // Zostaw puste dla automatycznego wykrycia
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();

// Regeneruj ID sesji dla bezpieczeństwa (tylko raz na sesję)
if (!isset($_SESSION['session_regenerated'])) {
    session_regenerate_id(true);
    $_SESSION['session_regenerated'] = true;
}

header('Content-Type: application/json; charset=utf-8');

// --- Włącz autoloadery dla Stripe, Dotenv i PHPMailer ---
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use Stripe\Stripe;
use Stripe\Exception\ApiErrorException;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Załaduj zmienne środowiskowe
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Ustaw klucz Stripe
if (!empty($_ENV['STRIPE_SECRET_KEY'])) {
    Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
}

// Konfiguracja bazy danych
$db_host = $_ENV['DB_HOST'];
$db_name = $_ENV['DB_NAME'];
$db_user = $_ENV['DB_USER'];
$db_pass = $_ENV['DB_PASS'];
$db_port = $_ENV['DB_PORT'] ?? '3306'; // Domyślny port MySQL to 3306

if (!$db_host || !$db_name || !$db_user) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Błąd konfiguracji bazy danych: Brak danych w .env']);
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host=$db_host;port=$db_port;dbname=$db_name;charset=utf8mb4",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
} catch (PDOException $e) {
    error_log("PDO ERROR: " . $e->getMessage(), 3, $pdoErrorLogFile);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Błąd połączenia z bazą danych. Spróbuj ponownie później.']);
    exit;
}

// Globalny handler wyjątków
set_exception_handler(function($e) use ($pdoErrorLogFile) {
    error_log("UNCAUGHT ERROR: " . $e->getMessage() . " on line " . $e->getLine() . " in " . $e->getFile(), 3, $pdoErrorLogFile);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Wystąpił nieoczekiwany błąd serwera.']);
    exit();
});

// Pobierz akcję z GET lub POST
$action = $_GET['action'] ?? $_POST['action'] ?? null;

// Dla POST requestów, odczytaj dane z body, jeśli to JSON
$input = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
    $inputRaw = file_get_contents('php://input');
    $input = json_decode($inputRaw, true);
    if (is_array($input) && isset($input['action'])) {
        $action = $input['action'];
    }
}

if (!$action) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Brak akcji.']);
    exit;
}

switch ($action) {
    case 'register':
        $username = trim($_POST['username'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $password2 = $_POST['password2'] ?? '';

        if (empty($username) || empty($email) || empty($password) || empty($password2)) {
            echo json_encode(['success' => false, 'message' => 'Wszystkie pola są wymagane!']);
            exit;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Nieprawidłowy format adresu email.']);
            exit;
        }
        if ($password !== $password2) {
            echo json_encode(['success' => false, 'message' => 'Hasła nie są takie same!']);
            exit;
        }
        if (!preg_match('/^(?=.*[A-Z])(?=.*\d).{6,}$/', $password)) {
            echo json_encode(['success' => false, 'message' => 'Hasło musi mieć min. 6 znaków, zawierać co najmniej jedną dużą literę i jedną cyfrę.']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'message' => 'Ten email jest już zarejestrowany.']);
            exit;
        }

        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())");
        if ($stmt->execute([$username, $email, $hashed_password])) {
            $_SESSION['user_id'] = $pdo->lastInsertId();
            $_SESSION['user_email'] = $email;
            $_SESSION['username'] = $username;
            $_SESSION['login_time'] = time();
            
            // Ustaw dodatkowe cookie jako backup
            setcookie('nextai_session', 'active', time() + $cookieLifetime, '/', '', 
                     isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on', true);
            
            echo json_encode(['success' => true, 'message' => 'Rejestracja pomyślna!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Błąd rejestracji.']);
        }
        break;

    case 'login':
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';

        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Wszystkie pola są wymagane.']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id, email, username, password FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['login_time'] = time();
            
            // Ustaw dodatkowe cookie jako backup
            setcookie('nextai_session', 'active', time() + $cookieLifetime, '/', '', 
                     isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on', true);
            
            echo json_encode(['success' => true, 'message' => 'Zalogowano pomyślnie!']);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Błędny email lub hasło.']);
        }
        break;

    case 'logout':
        session_unset();
        session_destroy();
        
        // Usuń backup cookie
        setcookie('nextai_session', '', time() - 3600, '/', '', 
                 isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on', true);
        
        echo json_encode(['success' => true]);
        break;

    case 'verify':
        // Nowa akcja do weryfikacji statusu logowania
        if (isset($_SESSION['user_email']) && isset($_SESSION['login_time'])) {
            // Sprawdź czy sesja nie jest zbyt stara (opcjonalne)
            if (time() - $_SESSION['login_time'] < $cookieLifetime) {
                echo json_encode(['success' => true, 'logged_in' => true]);
            } else {
                session_unset();
                session_destroy();
                echo json_encode(['success' => false, 'logged_in' => false, 'message' => 'Sesja wygasła']);
            }
        } else {
            echo json_encode(['success' => false, 'logged_in' => false]);
        }
        break;

    // ... keep existing code (all other cases remain the same)
    case 'request_password_reset':
        $email = trim($_POST['email'] ?? '');
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Podaj poprawny adres email.']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id, username FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            echo json_encode(['success' => true, 'message' => 'Jeśli adres email istnieje w naszej bazie, link do resetowania hasła został wysłany.']);
            exit;
        }

        $resetCode = bin2hex(random_bytes(16));
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

        $stmt = $pdo->prepare("UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE id = ?");
        $stmt->execute([$resetCode, $expires, $user['id']]);

        // Email sending logic here (if configured)
        echo json_encode(['success' => true, 'message' => 'Jeśli adres email istnieje w naszej bazie, link do resetowania hasła został wysłany.']);
        break;

    case 'reset_password':
        $email = trim($_POST['email'] ?? '');
        $code = trim($_POST['code'] ?? '');
        $newPassword = $_POST['newPassword'] ?? '';
        $confirmNewPassword = $_POST['confirmNewPassword'] ?? '';

        if (empty($email) || empty($code) || empty($newPassword) || empty($confirmNewPassword)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Wszystkie pola są wymagane.']);
            exit;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nieprawidłowy format adresu email.']);
            exit;
        }
        if ($newPassword !== $confirmNewPassword) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nowe hasła nie są takie same.']);
            exit;
        }
        if (!preg_match('/^(?=.*[A-Z])(?=.*\d).{6,}$/', $newPassword)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nowe hasło musi mieć min. 6 znaków, zawierać co najmniej jedną dużą literę i jedną cyfrę.']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id, reset_code, reset_code_expires FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || $user['reset_code'] !== $code || strtotime($user['reset_code_expires']) < time()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nieprawidłowy lub wygasły kod resetowania hasła.']);
            exit;
        }

        $hashed_password = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("UPDATE users SET password = ?, reset_code = NULL, reset_code_expires = NULL WHERE id = ?");
        $stmt->execute([$hashed_password, $user['id']]);

        echo json_encode(['success' => true, 'message' => 'Hasło zostało pomyślnie zmienione!']);
        break;

    case 'change_password':
        if (!isset($_SESSION['user_email'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Nieautoryzowany dostęp. Zaloguj się.']);
            exit;
        }

        $oldPassword = $input['oldPassword'] ?? '';
        $newPassword = $input['newPassword'] ?? '';
        $confirmNewPassword = $input['confirmNewPassword'] ?? '';

        if (empty($oldPassword) || empty($newPassword) || empty($confirmNewPassword)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Wszystkie pola są wymagane.']);
            exit;
        }

        if ($newPassword !== $confirmNewPassword) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nowe hasła nie są takie same.']);
            exit;
        }

        if (!preg_match('/^(?=.*[A-Z])(?=.*\d).{6,}$/', $newPassword)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nowe hasło musi mieć min. 6 znaków, zawierać co najmniej jedną dużą literę i jedną cyfrę.']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id, password FROM users WHERE email = ?");
        $stmt->execute([$_SESSION['user_email']]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($oldPassword, $user['password'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Stare hasło jest nieprawidłowe.']);
            exit;
        }

        $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$newPasswordHash, $user['id']]);

        echo json_encode(['success' => true, 'message' => 'Hasło zostało pomyślnie zmienione.']);
        break;

    case 'user_data':
        if (!isset($_SESSION['user_email'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Nieautoryzowany dostęp. Zaloguj się ponownie.']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT username, email FROM users WHERE email = ?");
        $stmt->execute([$_SESSION['user_email']]);
        $user = $stmt->fetch();

        if ($user) {
            echo json_encode(['success' => true, 'user' => $user]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Użytkownik nie znaleziony w bazie danych.']);
        }
        break;

    case 'subscriptions':
        if (!isset($_SESSION['user_email'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Nieautoryzowany dostęp. Zaloguj się, aby wyświetlić subskrypcje.']);
            exit;
        }

        $userEmail = $_SESSION['user_email'];

        // Sprawdź czy tabela subscriptions istnieje, jeśli nie - zwróć pustą listę
        try {
            $stmt = $pdo->prepare("SHOW TABLES LIKE 'subscriptions'");
            $stmt->execute();
            $tableExists = $stmt->fetch();
            
            if (!$tableExists) {
                echo json_encode(['success' => true, 'subscriptions' => []]);
                exit;
            }

            $stmt = $pdo->prepare("SELECT plan, status, created_at, current_period_end, stripe_subscription_id FROM subscriptions WHERE email = ? ORDER BY created_at DESC");
            $stmt->execute([$userEmail]);
            $subscriptions = $stmt->fetchAll();

            echo json_encode(['success' => true, 'subscriptions' => $subscriptions]);
        } catch (PDOException $e) {
            error_log("Subscriptions query error: " . $e->getMessage(), 3, $pdoErrorLogFile);
            echo json_encode(['success' => true, 'subscriptions' => []]);
        }
        break;

    case 'cancel_subscription':
        if (!isset($_SESSION['user_email'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Nieautoryzowany dostęp.']);
            exit;
        }

        $subscriptionId = $input['subscriptionId'] ?? null;

        if (!$subscriptionId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Brak ID subskrypcji do anulowania.']);
            exit;
        }

        if (empty($_ENV['STRIPE_SECRET_KEY'])) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Stripe nie jest skonfigurowany.']);
            exit;
        }

        try {
            $stripeSubscription = \Stripe\Subscription::retrieve($subscriptionId);
            $stripeCustomer = \Stripe\Customer::retrieve($stripeSubscription->customer);
            
            if ($stripeCustomer->email !== $_SESSION['user_email']) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Nie masz uprawnień do anulowania tej subskrypcji.']);
                exit;
            }

            $stripeSubscription->cancel();

            // Sprawdź czy tabela subscriptions istnieje przed aktualizacją
            $stmt = $pdo->prepare("SHOW TABLES LIKE 'subscriptions'");
            $stmt->execute();
            $tableExists = $stmt->fetch();
            
            if ($tableExists) {
                $stmt = $pdo->prepare("UPDATE subscriptions SET status = 'canceled' WHERE stripe_subscription_id = ? AND email = ?");
                $stmt->execute([$subscriptionId, $_SESSION['user_email']]);
            }

            echo json_encode(['success' => true, 'message' => 'Anulowanie subskrypcji zostało pomyślnie zainicjowane.']);

        } catch (ApiErrorException $e) {
            http_response_code(500);
            error_log("Stripe API Error during cancellation: " . $e->getMessage(), 3, $pdoErrorLogFile);
            echo json_encode(['success' => false, 'message' => 'Błąd Stripe API: ' . $e->getMessage()]);
        } catch (Exception $e) {
            http_response_code(500);
            error_log("Server Error during cancellation: " . $e->getMessage(), 3, $pdoErrorLogFile);
            echo json_encode(['success' => false, 'message' => 'Błąd serwera podczas anulowania subskrypcji.']);
        }
        break;

    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Nieznana akcja.']);
        break;
}
?>
