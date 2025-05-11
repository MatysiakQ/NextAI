<?php
ini_set('display_errors', 1); // Wyłączyć w produkcji
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');

require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Wczytanie zmiennych środowiskowych
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Funkcja logująca błędy do pliku
function log_error($message) {
    $logFile = __DIR__ . '/logs/form_errors.log';
    file_put_contents($logFile, "[" . date("Y-m-d H:i:s") . "] $message\n", FILE_APPEND);
}

// Połączenie z bazą danych
try {
    $pdo = new PDO(
        "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_NAME']};charset=utf8mb4",
        $_ENV['DB_USER'],
        $_ENV['DB_PASS'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    log_error("Błąd połączenia z bazą: " . $e->getMessage());
    http_response_code(500);
    exit("Błąd połączenia z bazą danych.");
}

// Obsługa formularza (POST)
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    // Sanityzacja danych wejściowych
    $name    = htmlspecialchars(trim($_POST['name'] ?? ''));
    $email   = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
    $phone   = htmlspecialchars(trim($_POST['phone'] ?? ''));
    $message = htmlspecialchars(trim($_POST['message'] ?? ''));

    // Walidacja danych
    if (!$name || !$email || !$phone || !$message) {
        http_response_code(400);
        exit("Wszystkie pola są wymagane.");
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        exit("Nieprawidłowy adres email.");
    }

    // Zapis do bazy danych
    try {
        $stmt = $pdo->prepare("
            INSERT INTO orders (name, email, phone, message, created_at)
            VALUES (:name, :email, :phone, :message, NOW())
        ");
        $stmt->execute([
            ':name'    => $name,
            ':email'   => $email,
            ':phone'   => $phone,
            ':message' => $message
        ]);
    } catch (PDOException $e) {
        log_error("Błąd zapisu do bazy: " . $e->getMessage());
        http_response_code(500);
        exit("Błąd zapisu do bazy danych.");
    }

    // Wysyłka e-maila
    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = $_ENV['SMTP_HOST'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $_ENV['SMTP_USER'];
        $mail->Password   = $_ENV['SMTP_PASS'];
        $mail->SMTPSecure = 'tls';
        $mail->Port       = $_ENV['SMTP_PORT'];

        $mail->setFrom($_ENV['SMTP_FROM'], 'Formularz Kontaktowy');
        $mail->addAddress($_ENV['SMTP_TO']);
        $mail->addReplyTo($email, $name);

        $mail->isHTML(false);
        $mail->Subject = 'Nowa wiadomość z formularza kontaktowego';
        $mail->Body    = "Imię i nazwisko: $name\n"
                       . "Email: $email\n"
                       . "Telefon: $phone\n"
                       . "Wiadomość: $message\n";

        $mail->send();
        echo "OK";
    } catch (Exception $e) {
        log_error("Błąd wysyłki maila: " . $mail->ErrorInfo);
        http_response_code(500);
        exit("Błąd wysyłki maila.");
    }

    exit;
}

// Wyświetlanie zamówień (GET)
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    try {
        $stmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC");
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($orders) {
            echo "Zamówienia:\n";
            foreach ($orders as $order) {
                echo "ID: " . htmlspecialchars($order['id']) . "\n";
                echo "Imię i nazwisko: " . htmlspecialchars($order['name']) . "\n";
                echo "Email: " . htmlspecialchars($order['email']) . "\n";
                echo "Telefon: " . htmlspecialchars($order['phone']) . "\n";
                echo "Wiadomość: " . htmlspecialchars($order['message']) . "\n";
                echo "Data: " . $order['created_at'] . "\n";
                echo "--------------------------\n";
            }
        } else {
            echo "Brak zamówień w bazie.";
        }
    } catch (PDOException $e) {
        log_error("Błąd pobierania zamówień: " . $e->getMessage());
        http_response_code(500);
        echo "Błąd pobierania zamówień.";
    }
}
