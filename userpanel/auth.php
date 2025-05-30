<?php
// auth.php
ini_set('display_errors', 0); // Ustaw na 1 tylko na etapie dewelopmentu, w produkcji 0
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Plik do logowania błędów PDO (możesz zmienić ścieżkę)
$pdoErrorLogFile = __DIR__ . '/../pdo_errors.log';

session_start();

header('Content-Type: application/json; charset=utf-8');

// --- Włącz autoloadery dla Stripe, Dotenv i PHPMailer ---
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use Stripe\Stripe;
use Stripe\Exception\ApiErrorException;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Załaduj zmienne środowiskowe
// Zakładam, że plik .env jest w katalogu nadrzędnym do auth.php
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Ustaw klucz Stripe
Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

// Konfiguracja bazy danych
$db_host = $_ENV['DB_HOST'];
$db_name = $_ENV['DB_NAME'];
$db_user = $_ENV['DB_USER'];
$db_pass = $_ENV['DB_PASS'];

if (!$db_host || !$db_name || !$db_user) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Błąd konfiguracji bazy danych: Brak danych w .env']);
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host=$db_host;dbname=$db_name;charset=utf8mb4",
        $db_user,
        $db_pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    error_log("PDO ERROR: " . $e->getMessage(), 3, $pdoErrorLogFile);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Błąd połączenia z bazą danych. Spróbuj ponownie później.']);
    exit;
}

// Globalny handler wyjątków dla lepszego debugowania i odpowiedzi JSON
set_exception_handler(function($e) use ($pdoErrorLogFile) {
    error_log("UNCAUGHT ERROR: " . $e->getMessage() . " on line " . $e->getLine() . " in " . $e->getFile(), 3, $pdoErrorLogFile);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Wystąpił nieoczekiwany błąd serwera.']);
    exit();
});

// Pobierz akcję z GET lub POST
$action = $_GET['action'] ?? $_POST['action'] ?? null;

// Dla POST requestów, odczytaj dane z body, jeśli to JSON
if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (is_array($input) && isset($input['action'])) {
        $action = $input['action'];
    }
}

// Jeśli akcja nie została ustawiona, to nieznane żądanie
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
        // Walidacja hasła: min. 6 znaków, co najmniej jedna duża litera, co najmniej jedna cyfra
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
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
        if ($stmt->execute([$username, $email, $hashed_password])) {
            $_SESSION['user_email'] = $email;
            $_SESSION['username'] = $username;
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
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['username'] = $user['username'];
            echo json_encode(['success' => true, 'message' => 'Zalogowano pomyślnie!']);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Błędny email lub hasło.']);
        }
        break;

    case 'logout':
        session_unset();
        session_destroy();
        echo json_encode(['success' => true]);
        break;

    case 'request_password_reset':
        $email = trim($_POST['email'] ?? '');
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Podaj poprawny adres email.']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id, username FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            // W celu bezpieczeństwa, nie informuj, czy email istnieje
            echo json_encode(['success' => true, 'message' => 'Jeśli adres email istnieje w naszej bazie, link do resetowania hasła został wysłany.']);
            exit;
        }

        $resetCode = bin2hex(random_bytes(16)); // 32 znaki heksadecymalne
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

        $stmt = $pdo->prepare("UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE id = ?");
        $stmt->execute([$resetCode, $expires, $user['id']]);

        $mail = new PHPMailer(true);
        try {
            // Konfiguracja serwera SMTP (użyj zmiennych środowiskowych)
            $mail->isSMTP();
            $mail->Host       = $_ENV['MAIL_HOST'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $_ENV['MAIL_USERNAME'];
            $mail->Password   = $_ENV['MAIL_PASSWORD'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; // lub ENCRYPTION_SMTPS
            $mail->Port       = $_ENV['MAIL_PORT'];

            $mail->setFrom($_ENV['MAIL_FROM_EMAIL'], $_ENV['MAIL_FROM_NAME']);
            $mail->addAddress($email, $user['username']);
            $mail->isHTML(true);
            $mail->Subject = 'Resetowanie hasła do konta NextAI';
            $resetLink = $_ENV['APP_URL'] . '/reset_password.html?email=' . urlencode($email) . '&code=' . urlencode($resetCode);
            $mail->Body    = "Cześć {$user['username']},<br><br>"
                           . "Otrzymaliśmy prośbę o zresetowanie hasła dla Twojego konta NextAI.<br>"
                           . "Aby zresetować hasło, kliknij w poniższy link:<br>"
                           . "<a href=\"{$resetLink}\">{$resetLink}</a><br><br>"
                           . "Link jest ważny przez 1 godzinę. Jeśli nie prosiłeś o resetowanie hasła, zignoruj tę wiadomość.<br><br>"
                           . "Pozdrawiamy,<br>Zespół NextAI";
            $mail->AltBody = "Cześć {$user['username']},\n\n"
                           . "Otrzymaliśmy prośbę o zresetowanie hasła dla Twojego konta NextAI.\n"
                           . "Aby zresetować hasło, skopiuj i wklej poniższy link do przeglądarki:\n"
                           . "{$resetLink}\n\n"
                           . "Link jest ważny przez 1 godzinę. Jeśli nie prosiłeś o resetowanie hasła, zignoruj tę wiadomość.\n\n"
                           . "Pozdrawiamy,\nZespół NextAI";

            $mail->send();
            echo json_encode(['success' => true, 'message' => 'Jeśli adres email istnieje w naszej bazie, link do resetowania hasła został wysłany.']);
        } catch (Exception $e) {
            error_log("Mailer Error: " . $e->getMessage(), 3, $pdoErrorLogFile);
            http_response_code(500); // Błąd serwera, ale dla użytkownika wiadomość ogólna
            echo json_encode(['success' => true, 'message' => 'Jeśli adres email istnieje w naszej bazie, link do resetowania hasła został wysłany.']);
        }
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
        // Walidacja siły hasła
        if (!preg_match('/^(?=.*[A-Z])(?=.*\d).{6,}$/', $newPassword)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nowe hasło musi mieć min. 6 znaków, zawierać co najmniej jedną dużą literę i jedną cyfrę.']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id, reset_code, reset_code_expires FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

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
        // Ta akcja jest wywoływana z panelu użytkownika dla ZALOGOWANEGO użytkownika
        if (!isset($_SESSION['user_email'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Nieautoryzowany dostęp. Zaloguj się.']);
            exit;
        }

        // Dane z body POST, używamy $input, bo user_panel.js wysyła JSON
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
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($oldPassword, $user['password'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Stare hasło jest nieprawidłowe.']);
            exit;
        }

        $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->execute([$newPasswordHash, $user['id']]);

        echo json_encode(['success' => true, 'message' => 'Hasło zostało pomyślnie zmienione.']);
        break;


    case 'user_data':
        if (!isset($_SESSION['user_email'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Nieautoryzowany dostęp. Zaloguj się ponownie.']);
            exit;
        }

        // Pobierz dane użytkownika z bazy danych
        $stmt = $pdo->prepare("SELECT username, email FROM users WHERE email = ?");
        $stmt->execute([$_SESSION['user_email']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

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

        // Upewnij się, że nazwy kolumn odpowiadają Twojej tabeli `subscriptions`
        // Zwracamy stripe_subscription_id, aby móc anulować subskrypcję z frontend
        $stmt = $pdo->prepare("SELECT plan, status, created_at, current_period_end, stripe_subscription_id FROM subscriptions WHERE email = ? ORDER BY created_at DESC");
        $stmt->execute([$userEmail]);
        $subscriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'subscriptions' => $subscriptions]);
        break;

    case 'cancel_subscription':
        if (!isset($_SESSION['user_email'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Nieautoryzowany dostęp.']);
            exit;
        }

        // Dane z body POST, używamy $input
        $subscriptionId = $input['subscriptionId'] ?? null;

        if (!$subscriptionId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Brak ID subskrypcji do anulowania.']);
            exit;
        }

        try {
            // Pobierz subskrypcję ze Stripe
            $stripeSubscription = \Stripe\Subscription::retrieve($subscriptionId);

            // Bardzo ważna weryfikacja: Sprawdź, czy subskrypcja należy do zalogowanego użytkownika
            // Najlepsza metoda: Sprawdzić, czy Stripe Customer ID w subskrypcji pasuje do Customer ID użytkownika w Twojej bazie danych.
            // Obecnie zakładamy, że email w Stripe Customer pasuje do emaila w sesji.
            $stripeCustomer = \Stripe\Customer::retrieve($stripeSubscription->customer);
            if ($stripeCustomer->email !== $_SESSION['user_email']) {
                http_response_code(403); // Forbidden
                echo json_encode(['success' => false, 'message' => 'Nie masz uprawnień do anulowania tej subskrypcji.']);
                exit;
            }

            // Anuluj subskrypcję w Stripe
            $stripeSubscription->cancel();

            // Ważne: Oczekujemy, że Twój webhook (customer.subscription.deleted) zaktualizuje bazę danych.
            // Można też od razu zaktualizować status w bazie danych tutaj, aby panel użytkownika
            // pokazał zmianę szybciej, zanim webhook zdąży zadziałać.
            $stmt = $pdo->prepare("UPDATE subscriptions SET status = 'canceled' WHERE stripe_subscription_id = ? AND email = ?");
            $stmt->execute([$subscriptionId, $_SESSION['user_email']]);

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