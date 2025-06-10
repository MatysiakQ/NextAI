<?php

use Dotenv\Dotenv;
use Stripe\Stripe;
use Stripe\Exception\ApiErrorException;


require __DIR__ . '/../vendor/autoload.php';

$cookieLifetime = 30 * 24 * 60 * 60; // 30 dni

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => $cookieLifetime,
        'path' => '/',
        'domain' => '',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}
header('Content-Type: application/json');




ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');
error_reporting(E_ALL);

$pdoErrorLogFile = __DIR__ . '/../pdo_errors.log';


$sessionLogFile = __DIR__ . '/../session_debug.log';
file_put_contents($sessionLogFile, "[".date("Y-m-d H:i:s")."] SESSION: ".print_r($_SESSION, true)."\n", FILE_APPEND);
file_put_contents($sessionLogFile, "[".date("Y-m-d H:i:s")."] COOKIE: ".print_r($_COOKIE, true)."\n", FILE_APPEND);




function verify_recaptcha($token) {
    $secret = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"; // testowy sekret
    $response = file_get_contents("https://www.google.com/recaptcha/api/siteverify?secret={$secret}&response={$token}");
    $result = json_decode($response, true);
    return $result["success"] ?? false;
}


$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

if (!empty($_ENV['STRIPE_SECRET_KEY'])) {
    Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
}

$db_host = $_ENV['DB_HOST'];
$db_name = $_ENV['DB_NAME'];
$db_user = $_ENV['DB_USER'];
$db_pass = $_ENV['DB_PASS'];
$db_port = $_ENV['DB_PORT'] ?? '3306';

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

set_exception_handler(function($e) use ($pdoErrorLogFile) {
    error_log("UNCAUGHT ERROR: " . $e->getMessage() . " on line " . $e->getLine() . " in " . $e->getFile(), 3, $pdoErrorLogFile);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Wystąpił nieoczekiwany błąd serwera.']);
    exit();
});

$action = $_GET['action'] ?? $_POST['action'] ?? null;

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
    if (!verify_recaptcha($_POST['g-recaptcha-response'] ?? '')) {
        echo json_encode(['success' => false, 'message' => 'Błąd reCAPTCHA.']);
        exit;
    }

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

    // Sprawdź czy email już istnieje
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetchColumn() > 0) {
        echo json_encode(['success' => false, 'message' => 'Istnieje już użytkownik o takim e-mailu.']);
        exit;
    }
    // Sprawdź czy login już istnieje
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetchColumn() > 0) {
        echo json_encode(['success' => false, 'message' => 'Istnieje już użytkownik o takim loginie.']);
        exit;
    }

    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())");
    $stmt->execute([$username, $email, $hashed_password]);

    // Po udanej rejestracji automatyczny login:
    $user_id = $pdo->lastInsertId();
    $_SESSION['user_id'] = $user_id;
    $_SESSION['user_email'] = $email;
    $_SESSION['username'] = $username;
    $_SESSION['login_time'] = time();

    setcookie('nextai_session', 'active', time() + $cookieLifetime, '/', '', 
     isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on', true);

    echo json_encode(['success' => true, 'message' => 'Zarejestrowano pomyślnie!']);
    exit;


   case 'login':
    if (!verify_recaptcha($_POST['g-recaptcha-response'] ?? '')) {
        echo json_encode(['success' => false, 'message' => 'Błąd reCAPTCHA.']);
        exit;
    }
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Wszystkie pola są wymagane.']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id, email, username, password FROM users WHERE email = ? OR username = ?");
    $stmt->execute([$email, $email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['login_time'] = time();

        setcookie('nextai_session', 'active', time() + $cookieLifetime, '/', '', 
                 isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on', true);

        echo json_encode(['success' => true, 'message' => 'Zalogowano pomyślnie!']);
        exit;
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Błędny email lub hasło.']);
        exit;
    }
    break;

    

    case 'logout':
        session_unset();
        session_destroy();
        
        setcookie('nextai_session', '', time() - 3600, '/', '', 
                 isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on', true);
        
        echo json_encode(['success' => true]);
        break;

    case 'verify':
        if (isset($_SESSION['user_email']) && isset($_SESSION['login_time'])) {
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
        if ($user && !password_verify($password, $user['password'])) {
            error_log("[LOGIN] Niepoprawne hasło dla: $email\n", 3, __DIR__.'/../session_debug.log');
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
        // Pobierz email z sesji
        $email = $_SESSION['user_email'] ?? null;
        if (!$email) {
            echo json_encode(['success' => false, 'message' => 'Nie jesteś zalogowany.']);
            exit;
        }

        try {
            // Pobierz najnowszą aktywną subskrypcję
            $stmt = $pdo->prepare("SELECT * FROM subscriptions WHERE email = ? AND (status = 'active' OR status = 'trialing') ORDER BY current_period_end DESC LIMIT 1");
            $stmt->execute([$email]);
            $sub = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($sub) {
                $plan = $sub['plan'];
                $subscription = ($plan === 'pro') ? 'pro' : (($plan === 'basic') ? 'basic' : 'free');
                echo json_encode([
                    'success' => true,
                    'subscription' => $subscription,
                    'plan' => $plan,
                    'status' => $sub['status'],
                    'current_period_end' => $sub['current_period_end'],
                    'cancel_at_period_end' => $sub['cancel_at_period_end'],
                ]);
            } else {
                echo json_encode(['success' => true, 'subscription' => 'free']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Błąd bazy danych.']);
        }
        exit;

    case 'check_active_subscription':
        if (!isset($_SESSION['user_email'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Nieautoryzowany dostęp.']);
            exit;
        }

        $userEmail = $_SESSION['user_email'];

        try {
            $stmt = $pdo->prepare("SHOW TABLES LIKE 'subscriptions'");
            $stmt->execute();
            $tableExists = $stmt->fetch();
            
            if (!$tableExists) {
                echo json_encode(['success' => true, 'subscription' => null]);
                exit;
            }

            $stmt = $pdo->prepare("
                SELECT plan, status, created_at, current_period_end, stripe_subscription_id, cancel_at_period_end 
                FROM subscriptions 
                WHERE email = ? AND (status = 'active' OR status = 'trialing') 
                ORDER BY created_at DESC 
                LIMIT 1
            ");
            $stmt->execute([$userEmail]);
            $subscription = $stmt->fetch();

            if ($subscription) {
                if (!empty($_ENV['STRIPE_SECRET_KEY']) && $subscription['stripe_subscription_id']) {
                    try {
                        $stripeSubscription = \Stripe\Subscription::retrieve($subscription['stripe_subscription_id']);
                        
                        if ($stripeSubscription->status !== $subscription['status'] || 
                            $stripeSubscription->cancel_at_period_end != $subscription['cancel_at_period_end']) {
                            
                            $stmt = $pdo->prepare("
                                UPDATE subscriptions 
                                SET status = ?, cancel_at_period_end = ?, current_period_end = ?, updated_at = NOW() 
                                WHERE stripe_subscription_id = ?
                            ");
                            $stmt->execute([
                                $stripeSubscription->status,
                                $stripeSubscription->cancel_at_period_end ? 1 : 0,
                                date('Y-m-d H:i:s', $stripeSubscription->current_period_end),
                                $subscription['stripe_subscription_id']
                            ]);
                            
                            $subscription['status'] = $stripeSubscription->status;
                            $subscription['cancel_at_period_end'] = $stripeSubscription->cancel_at_period_end;
                            $subscription['current_period_end'] = date('Y-m-d H:i:s', $stripeSubscription->current_period_end);
                        }
                    } catch (Exception $e) {
                        error_log("Stripe API Error in check_active_subscription: " . $e->getMessage(), 3, $pdoErrorLogFile);
                    }
                }
                
                echo json_encode(['success' => true, 'subscription' => $subscription]);
            } else {
                echo json_encode(['success' => true, 'subscription' => null]);
            }
            
        } catch (PDOException $e) {
            error_log("Database error in check_active_subscription: " . $e->getMessage(), 3, $pdoErrorLogFile);
            echo json_encode(['success' => false, 'message' => 'Błąd bazy danych']);
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
            // Pobierz subskrypcję ze Stripe
            $stripeSubscription = \Stripe\Subscription::retrieve($subscriptionId);
            $stripeCustomer = \Stripe\Customer::retrieve($stripeSubscription->customer);
            
            // Sprawdź czy użytkownik ma prawo anulować tę subskrypcję
            if ($stripeCustomer->email !== $_SESSION['user_email']) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Nie masz uprawnień do anulowania tej subskrypcji.']);
                exit;
            }

            // Anuluj subskrypcję na końcu okresu rozliczeniowego (nie natychmiast)
            $stripeSubscription = \Stripe\Subscription::update($subscriptionId, [
                'cancel_at_period_end' => true
            ]);

            // Zaktualizuj status w bazie danych
            $stmt = $pdo->prepare("SHOW TABLES LIKE 'subscriptions'");
            $stmt->execute();
            $tableExists = $stmt->fetch();
            
            if ($tableExists) {
                $stmt = $pdo->prepare("UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = NOW() WHERE stripe_subscription_id = ? AND email = ?");
                $stmt->execute([$subscriptionId, $_SESSION['user_email']]);
            }

            echo json_encode(['success' => true, 'message' => 'Subskrypcja zostanie anulowana na koniec okresu rozliczeniowego.']);

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
        case 'reset_password_code':
    $email = trim($_POST['email'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Nieprawidłowy email.']);
        exit;
    }
    $code = strtoupper(bin2hex(random_bytes(3)));
    $expires = date('Y-m-d H:i:s', time() + 600);
    
    $stmt = $pdo->prepare("UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE email = ?");
    $stmt->execute([$code, $expires, $email]);

    mail($email, "Kod resetu hasła - NextAI", "Twój kod resetu hasła to: $code", "From: no-reply@nextai.pl");
    echo json_encode(['success' => true]);
    break;

case 'verify_reset_code':
    $email = trim($_POST['email'] ?? '');
    $code = trim($_POST['code'] ?? '');

    $stmt = $pdo->prepare("SELECT reset_code, reset_code_expires FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || $user['reset_code'] !== strtoupper($code) || strtotime($user['reset_code_expires']) < time()) {
        echo json_encode(['success' => false, 'message' => 'Kod niepoprawny lub wygasły.']);
        exit;
    }
    echo json_encode(['success' => true]);
    break;

case 'set_new_password_code':
    $email = trim($_POST['email'] ?? '');
    $code = trim($_POST['code'] ?? '');
    $pass1 = $_POST['password'] ?? '';
    $pass2 = $_POST['password2'] ?? '';

    if ($pass1 !== $pass2 || !preg_match('/^(?=.*[A-Z])(?=.*\\d).{6,}$/', $pass1)) {
        echo json_encode(['success' => false, 'message' => 'Hasła niepoprawne.']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id, reset_code, reset_code_expires FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || $user['reset_code'] !== strtoupper($code) || strtotime($user['reset_code_expires']) < time()) {
        echo json_encode(['success' => false, 'message' => 'Nieprawidłowy kod lub wygasł.']);
        exit;
    }

    $hash = password_hash($pass1, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("UPDATE users SET password = ?, reset_code = NULL, reset_code_expires = NULL WHERE email = ?");
    $stmt->execute([$hash, $email]);

    echo json_encode(['success' => true]);
    break;

    case 'change_username':
        if (!isset($_SESSION['user_email'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Nieautoryzowany dostęp.']);
            exit;
        }
        $username = trim($_POST['username'] ?? '');
        if (!preg_match('/^[a-zA-Z0-9_\-\.]{3,32}$/', $username)) {
            echo json_encode(['success' => false, 'message' => 'Nieprawidłowa nazwa użytkownika (3-32 znaki, tylko litery, cyfry, _, -, .)']);
            exit;
        }
        // Sprawdź czy login już istnieje (nie pozwól na powielenie)
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ? AND email != ?");
        $stmt->execute([$username, $_SESSION['user_email']]);
        if ($stmt->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'message' => 'Istnieje już użytkownik o takim loginie.']);
            exit;
        }
        $stmt = $pdo->prepare("UPDATE users SET username = ?, updated_at = NOW() WHERE email = ?");
        $stmt->execute([$username, $_SESSION['user_email']]);
        $_SESSION['username'] = $username;
        echo json_encode(['success' => true]);
        exit;

    case 'change_email':
        if (!isset($_SESSION['user_email'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Nieautoryzowany dostęp.']);
            exit;
        }
        $email = trim($_POST['email'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Nieprawidłowy adres e-mail.']);
            exit;
        }
        // Sprawdź czy email już istnieje (nie pozwól na powielenie)
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ? AND email != ?");
        $stmt->execute([$email, $_SESSION['user_email']]);
        if ($stmt->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'message' => 'Istnieje już użytkownik o takim e-mailu.']);
            exit;
        }
        $stmt = $pdo->prepare("UPDATE users SET email = ?, updated_at = NOW() WHERE email = ?");
        $stmt->execute([$email, $_SESSION['user_email']]);
        $_SESSION['user_email'] = $email;
        echo json_encode(['success' => true]);
        exit;

    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Nieznana akcja.']);
        break;
}
?>
