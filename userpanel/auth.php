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
file_put_contents($sessionLogFile, "[" . date("Y-m-d H:i:s") . "] SESSION: " . print_r($_SESSION, true) . "\n", FILE_APPEND);
file_put_contents($sessionLogFile, "[" . date("Y-m-d H:i:s") . "] COOKIE: " . print_r($_COOKIE, true) . "\n", FILE_APPEND);




function verify_recaptcha($token)
{
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

set_exception_handler(function ($e) use ($pdoErrorLogFile) {
    error_log("UNCAUGHT ERROR: " . $e->getMessage() . " on line " . $e->getLine() . " in " . $e->getFile(), 3, $pdoErrorLogFile);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Wystąpił nieoczekiwany błąd serwera.']);
    exit();
});

$action = $_GET['action'] ?? $_POST['action'] ?? null;

// Dodaj obsługę JSON dla wszystkich akcji
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
        $username = trim($_POST['username'] ?? $input['username'] ?? '');
        $email = trim($_POST['email'] ?? $input['email'] ?? '');
        $recaptcha = $_POST['g-recaptcha-response'] ?? $input['g-recaptcha-response'] ?? '';
        if (!$recaptcha) {
            echo json_encode(['success' => false, 'message' => 'Potwierdź, że nie jesteś robotem.']);
            exit;
        }
        if (!verify_recaptcha($recaptcha)) {
            echo json_encode(['success' => false, 'message' => 'Błąd reCAPTCHA.']);
            exit;
        }
        $password = $_POST['password'] ?? $input['password'] ?? '';
        $password2 = $_POST['password2'] ?? $input['password2'] ?? '';

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
            echo json_encode(['success' => false, 'message' => 'Hasło musi mieć min. 6 znaków, zawierać co najmniej jedną wielką literę i jedną cyfrę.']);
            exit;
        }

        // Sprawdź czy login już istnieje
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'message' => 'Taki login jest już zajęty.']);
            exit;
        }

        // Sprawdź czy email już istnieje
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'message' => 'Ten email jest już zajęty.']);
            exit;
        }

        // Dodaj sprawdzenie czy kolumny is_verified, verify_code, verify_code_expires istnieją
        try {
            $checkCols = $pdo->query("SHOW COLUMNS FROM users LIKE 'is_verified'")->fetch();
            if (!$checkCols) {
                echo json_encode(['success' => false, 'message' => 'Błąd konfiguracji bazy danych: Brak kolumny is_verified w tabeli users. Skontaktuj się z administratorem.']);
                exit;
            }
            $checkCols = $pdo->query("SHOW COLUMNS FROM users LIKE 'verify_code'")->fetch();
            if (!$checkCols) {
                echo json_encode(['success' => false, 'message' => 'Błąd konfiguracji bazy danych: Brak kolumny verify_code w tabeli users. Skontaktuj się z administratorem.']);
                exit;
            }
            $checkCols = $pdo->query("SHOW COLUMNS FROM users LIKE 'verify_code_expires'")->fetch();
            if (!$checkCols) {
                echo json_encode(['success' => false, 'message' => 'Błąd konfiguracji bazy danych: Brak kolumny verify_code_expires w tabeli users. Skontaktuj się z administratorem.']);
                exit;
            }
        } catch (Exception $e) {
            error_log("[REGISTER COLUMN CHECK ERROR] " . $e->getMessage(), 3, __DIR__ . '/../php-error.log');
            echo json_encode(['success' => false, 'message' => 'Błąd bazy danych podczas sprawdzania kolumn. Skontaktuj się z administratorem.']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'message' => 'Ten email jest już zarejestrowany.']);
            exit;
        }

        // Wygeneruj kod weryfikacyjny
        $verify_code = strtoupper(bin2hex(random_bytes(3)));
        $verify_expires = date('Y-m-d H:i:s', time() + 1800); // 30 minut

        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        try {
            $stmt = $pdo->prepare("INSERT INTO users (username, email, password, created_at, updated_at, is_verified, verify_code, verify_code_expires) VALUES (?, ?, ?, NOW(), NOW(), 0, ?, ?)");
            $stmt->execute([$username, $email, $hashed_password, $verify_code, $verify_expires]);
        } catch (Exception $e) {
            error_log("[REGISTER INSERT ERROR] " . $e->getMessage(), 3, __DIR__ . '/../php-error.log');
            echo json_encode(['success' => false, 'message' => 'Błąd bazy danych podczas rejestracji. Skontaktuj się z administratorem.']);
            exit;
        }

        // Wyślij kod na email
        require_once __DIR__ . '/../vendor/autoload.php';
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = $_ENV['SMTP_HOST'] ?? '';
            $mail->SMTPAuth = true;
            $mail->Username = $_ENV['SMTP_USER'] ?? '';
            $mail->Password = $_ENV['SMTP_PASS'] ?? '';
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $_ENV['SMTP_PORT'] ?? 587;

            $mail->setFrom($_ENV['SMTP_FROM'] ?? 'no-reply@nextai.pl', $_ENV['MAIL_FROM_NAME'] ?? 'NextAI');
            $mail->addAddress($email);
            $mail->isHTML(true);
            $mail->Subject = "Kod weryfikacyjny rejestracji - NextAI";
            $mail->Body = '<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Kod weryfikacyjny</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f6f8fa; margin: 0; padding: 0; }
    .container { background-color: #ffffff; max-width: 600px; margin: 40px auto; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
    .header { text-align: center; padding-bottom: 20px; }
    .header h1 { color: #333; }
    .content { font-size: 16px; color: #444; line-height: 1.6; }
    .code-box { background-color: #f0f0f0; border-radius: 8px; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; color: #2a7ae2; }
    .footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Potwierdzenie rejestracji</h1>
    </div>
    <div class="content">
      <p>Dziękujemy za rejestrację w serwisie <strong>NextAI</strong>.</p>
      <p>Aby dokończyć proces rejestracji, prosimy o wpisanie poniższego kodu weryfikacyjnego:</p>
      <div class="code-box">' . htmlspecialchars($verify_code) . '</div>
      <p>Jeśli nie rejestrowałeś się na naszej stronie, po prostu zignoruj tę wiadomość.</p>
    </div>
    <div class="footer">
      &copy; 2025 NextAI. Wszelkie prawa zastrzeżone.
    </div>
  </div>
</body>
</html>';

            $mail->send();
            echo json_encode(['success' => true, 'verify_required' => true, 'message' => 'Na Twój email wysłaliśmy kod weryfikacyjny. Sprawdź skrzynkę i wpisz kod na stronie.']);
        } catch (\Exception $e) {
            error_log("[REGISTER VERIFY MAIL ERROR] " . $mail->ErrorInfo, 3, __DIR__ . '/../php-error.log');
            echo json_encode(['success' => false, 'message' => 'Nie udało się wysłać maila z kodem weryfikacyjnym. Skontaktuj się z obsługą.']);
        }
        exit;


    case 'login':
        $recaptcha = $_POST['g-recaptcha-response'] ?? $input['g-recaptcha-response'] ?? '';
        if (!$recaptcha) {
            echo json_encode(['success' => false, 'message' => 'Potwierdź, że nie jesteś robotem.']);
            exit;
        }
        if (!verify_recaptcha($recaptcha)) {
            echo json_encode(['success' => false, 'message' => 'Błąd reCAPTCHA.']);
            exit;
        }
        $email = trim($_POST['email'] ?? $input['email'] ?? '');
        $password = $_POST['password'] ?? $input['password'] ?? '';

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

            setcookie(
                'nextai_session',
                'active',
                time() + $cookieLifetime,
                '/',
                '',
                isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
                true
            );

            echo json_encode(['success' => true, 'message' => 'Zalogowano pomyślnie!']);
            exit;
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Błędny email lub hasło.']);
            exit;
        }


    case 'logout':
        session_unset();
        session_destroy();

        setcookie(
            'nextai_session',
            '',
            time() - 3600,
            '/',
            '',
            isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
            true
        );

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
            error_log("[LOGIN] Niepoprawne hasło dla: $email\n", 3, __DIR__ . '/../session_debug.log');
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

        $stmt = $pdo->prepare("SELECT username, email, is_admin FROM users WHERE email = ?");
        $stmt->execute([$_SESSION['user_email']]);
        $user = $stmt->fetch();

        // Dodaj ścieżkę do avatara jeśli plik istnieje
        $avatar = null;
        if ($user && $user['email']) {
            $avatarDir = realpath(__DIR__ . '/../uploads/avatars/');
            $emailHash = md5(strtolower(trim($user['email'])));
            $found = false;
            foreach (['jpg', 'png', 'webp'] as $ext) {
                $path = $avatarDir . DIRECTORY_SEPARATOR . $emailHash . '.' . $ext;
                if (file_exists($path)) {
                    $avatar = '/uploads/avatars/' . $emailHash . '.' . $ext;
                    $found = true;
                    break;
                }
            }
        }
        if ($user) {
            $user['avatar'] = $avatar;
            // Dodaj do sesji is_admin, jeśli nie ma
            $_SESSION['is_admin'] = !empty($user['is_admin']) && $user['is_admin'] == 1;
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
            echo json_encode(['success' => false, 'message' => 'Nie jesteś zalogowany.', 'subscriptions' => []]);
            exit;
        }

        try {
            // Pobierz WSZYSTKIE subskrypcje użytkownika (nie tylko jedną)
            $stmt = $pdo->prepare("SELECT * FROM subscriptions WHERE email = ? ORDER BY created_at DESC");
            $stmt->execute([$email]);
            $subs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($subs && count($subs) > 0) {
                echo json_encode([
                    'success' => true,
                    'subscriptions' => $subs
                ]);
            } else {
                echo json_encode(['success' => true, 'subscriptions' => []]);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Błąd bazy danych.', 'subscriptions' => []]);
        }
        exit;

    case 'check_active_subscription':
        if (!isset($_SESSION['user_email'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Nieautoryzowany dostęp.']);
            exit;
        }

        $userEmail = $_SESSION['user_email'];

        // MAPOWANIE price_id na nazwę planu
        function mapPriceIdToPlanNameAndPeriod($priceIdOrPlan)
        {
            $map = [
                // price_id => [plan_name, period]
                'price_1RQpnDFQBh6Vdz2pKIXTtsV4' => ['basic', 'monthly'],
                'price_1RRFwiFQBh6Vdz2pXy7d20TI' => ['pro', 'monthly'],
                'price_1RW3LMFQBh6Vdz2pOsrR6BQ9' => ['basic', 'yearly'],
                'price_1RW3M4FQBh6Vdz2pQKmpJGmW' => ['pro', 'yearly'],
                'price_1RZcpVFQBh6Vdz2pWJambttr' => ['basic', 'monthly'],
            ];
            if (in_array(strtolower($priceIdOrPlan), ['basic', 'pro', 'enterprise'])) {
                return [strtolower($priceIdOrPlan), 'monthly'];
            }
            if (isset($map[$priceIdOrPlan])) {
                return $map[$priceIdOrPlan];
            }
            return [$priceIdOrPlan, 'unknown'];
        }

        try {
            $stmt = $pdo->prepare("SHOW TABLES LIKE 'subscriptions'");
            $stmt->execute();
            $tableExists = $stmt->fetch();

            if (!$tableExists) {
                echo json_encode(['success' => true, 'subscription' => null]);
                exit;
            }

            // Pobierz NAJNOWSZĄ aktywną subskrypcję (po current_period_end, potem created_at)
            $stmt = $pdo->prepare("
                SELECT plan, status, created_at, current_period_end, stripe_subscription_id, cancel_at_period_end, price_id
                FROM subscriptions
                WHERE email = ? AND (status = 'active' OR status = 'trialing')
                ORDER BY current_period_end DESC, created_at DESC
                LIMIT 1
            ");
            $stmt->execute([$userEmail]);
            $subscription = $stmt->fetch();

            if ($subscription) {
                // Uzupełnij brakujące pola, aby frontend zawsze miał komplet
                $planRaw = $subscription['plan'] ?? '';
                $priceId = $subscription['price_id'] ?? '';
                list($planName, $planPeriod) = mapPriceIdToPlanNameAndPeriod($priceId ?: $planRaw);

                $subscription['plan_name'] = $planName;
                $subscription['plan_period'] = $planPeriod;
                $subscription['price_id'] = $priceId;
                $subscription['plan'] = $planRaw;

                // Upewnij się, że current_period_end i created_at są w formacie ISO (dla JS Date)
                if (!empty($subscription['current_period_end']) && strtotime($subscription['current_period_end'])) {
                    $subscription['current_period_end'] = date('Y-m-d\TH:i:s', strtotime($subscription['current_period_end']));
                }
                if (!empty($subscription['created_at']) && strtotime($subscription['created_at'])) {
                    $subscription['created_at'] = date('Y-m-d\TH:i:s', strtotime($subscription['created_at']));
                }

                // ...istniejący kod Stripe API sync...
                if (!empty($_ENV['STRIPE_SECRET_KEY']) && $subscription['stripe_subscription_id']) {
                    try {
                        $stripeSubscription = \Stripe\Subscription::retrieve($subscription['stripe_subscription_id']);

                        if (
                            $stripeSubscription->status !== $subscription['status'] ||
                            $stripeSubscription->cancel_at_period_end != $subscription['cancel_at_period_end']
                        ) {

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
                            $subscription['current_period_end'] = date('Y-m-d\TH:i:s', $stripeSubscription->current_period_end);
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

        // Wyślij kod przez PHPMailer (SMTP)
        require_once __DIR__ . '/../vendor/autoload.php';
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = $_ENV['SMTP_HOST'];
            $mail->SMTPAuth = true;
            $mail->Username = $_ENV['SMTP_USER'];
            $mail->Password = $_ENV['SMTP_PASS'];
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $_ENV['SMTP_PORT'];

            $mail->setFrom($_ENV['SMTP_FROM'], $_ENV['MAIL_FROM_NAME'] ?? 'NextAI');
            $mail->addAddress($email);
            $mail->isHTML(true);
            $mail->Subject = "Kod resetu hasła - NextAI";
            $mail->Body = file_get_contents( '<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Odzyskiwanie hasła</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      background: #f4f6fa;
      font-family: \'Segoe UI\', Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 410px;
      margin: 60px auto 0 auto;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 4px 28px #23294618;
      padding: 36px 28px 28px 28px;
      border: 1px solid #d4af37;
      text-align: center;
    }
    .logo img {
      max-height: 44px;
      margin-bottom: 18px;
      filter: grayscale(0.2) contrast(1.1) brightness(0.93);
    }
    h2 {
      color: #232946;
      margin-bottom: 12px;
      font-size: 1.35em;
      letter-spacing: 0.3px;
      font-weight: 700;
    }
    .desc {
      color: #232946;
      font-size: 1.06em;
      margin-bottom: 24px;
    }
    .recovery-code {
      display: inline-block;
      letter-spacing: 0.14em;
      font-size: 1.43em;
      font-weight: bold;
      color: #232946;
      background: #f7f6ef;
      border: 1.5px dashed #d4af37;
      border-radius: 9px;
      padding: 13px 34px;
      margin-bottom: 22px;
      box-shadow: 0 1px 10px #d4af3733;
      user-select: all;
    }
    .info {
      color: #7c86a3;
      font-size: 0.97em;
      margin-bottom: 10px;
    }
    .footer {
      color: #b3b3bc;
      font-size: 0.96em;
      border-top: 1px solid #ececec;
      padding-top: 14px;
      margin-top: 28px;
      letter-spacing: 0.5px;
    }
    @media (max-width: 500px) {
      .container {
        padding: 18px 7vw 18px 7vw;
      }
      .recovery-code {
        font-size: 1.13em;
        padding: 10px 12vw;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <!-- Możesz podmienić na swoje logo -->
      <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f916.svg" alt="Logo firmy">
    </div>
    <h2>Kod do odzyskiwania hasła</h2>
    <div class="desc">
      Skopiuj poniższy kod i wklej go w formularzu na stronie, aby ustawić nowe hasło.
    </div>
    <div class="recovery-code">
      <!-- Podmień na swój dynamiczny kod -->
      <span id="code">AB12-CD34</span>
    </div>
    <div class="info">
      Kod jest ważny przez 10 minut.<br>
      Jeśli nie prosiłeś o zmianę hasła, zignoruj tę wiadomość.
    </div>
    <div class="footer">
      © 2025 NextAi &bull; Wszelkie prawa zastrzeżone
    </div>
  </div>
</body>
</html>
');

            $mail->send();
            echo json_encode(['success' => true]);
        } catch (\Exception $e) {
            error_log("[RESET PASSWORD MAIL ERROR] " . $mail->ErrorInfo, 3, __DIR__ . '/../php-error.log');
            echo json_encode(['success' => false, 'message' => 'Nie udało się wysłać maila z kodem. Skontaktuj się z obsługą.']);
        }
        exit;

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
        // Pobierz dane z POST lub JSON
        $email = trim($_POST['email'] ?? $input['email'] ?? '');
        $code = trim($_POST['code'] ?? $input['code'] ?? '');
        $pass1 = $_POST['password'] ?? $input['password'] ?? '';
        $pass2 = $_POST['password2'] ?? $input['password2'] ?? '';

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
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ? AND email != ?");
        $stmt->execute([$username, $_SESSION['user_email']]);
        if ($stmt->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'message' => 'Taka nazwa użytkownika już istnieje.']);
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
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ? AND email != ?");
        $stmt->execute([$email, $_SESSION['user_email']]);
        if ($stmt->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'message' => 'Ten email jest już zajęty.']);
            exit;
        }
        $stmt = $pdo->prepare("UPDATE users SET email = ?, updated_at = NOW() WHERE email = ?");
        $stmt->execute([$email, $_SESSION['user_email']]);
        $_SESSION['user_email'] = $email;
        echo json_encode(['success' => true]);
        exit;

    case 'verify_email_code':
        // Pobierz dane z POST lub JSON
        $email = trim($_POST['email'] ?? $input['email'] ?? '');
        $code = trim($_POST['code'] ?? $input['code'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !$code) {
            echo json_encode(['success' => false, 'message' => 'Nieprawidłowy email lub kod.']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id, verify_code, verify_code_expires, is_verified FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'Nie znaleziono użytkownika.']);
            exit;
        }
        if ($user['is_verified']) {
            echo json_encode(['success' => true, 'already_verified' => true, 'message' => 'Email już został potwierdzony.']);
            exit;
        }
        if ($user['verify_code'] !== strtoupper($code) || strtotime($user['verify_code_expires']) < time()) {
            echo json_encode(['success' => false, 'message' => 'Kod niepoprawny lub wygasły.']);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE users SET is_verified = 1, verify_code = NULL, verify_code_expires = NULL WHERE id = ?");
        $stmt->execute([$user['id']]);

        echo json_encode(['success' => true, 'message' => 'Adres email został potwierdzony. Możesz się teraz zalogować.']);
        exit;

    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Nieznana akcja.']);
        break;
}
?>