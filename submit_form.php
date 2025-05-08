<?php
// Wersja produkcyjna z .env, PHPMailer i PDO

ini_set('display_errors', 1); // Wyłączyć w produkcji!
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use Dotenv\Dotenv;

// Wczytanie .env
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Połączenie z bazą danych
try {
    $pdo = new PDO(
        "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_NAME']};charset=utf8mb4",
        $_ENV['DB_USER'],
        $_ENV['DB_PASS'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Błąd bazy danych']);
    exit;
}

// Obsługa tylko POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Metoda niedozwolona']);
    exit;
}

// Dane z formularza
$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$message = trim($_POST['message'] ?? '');

// Walidacja danych
if (!$name || !$email || !$message || !$phone) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Wszystkie pola są wymagane']);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nieprawidłowy adres e-mail']);
    exit;
}

// Zapis do bazy danych
try {
    $stmt = $pdo->prepare("INSERT INTO contact_messages (name, email, phone, message, created_at) VALUES (?, ?, ?, ?, NOW())");
    $stmt->execute([$name, $email, $phone, $message]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Nie udało się zapisać do bazy']);
    exit;
}

// Wysyłka maila przez PHPMailera
try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = $_ENV['SMTP_HOST'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $_ENV['SMTP_USER'];
    $mail->Password   = $_ENV['SMTP_PASS'];
    $mail->SMTPSecure = 'tls';
    $mail->Port       = $_ENV['SMTP_PORT'];

    $mail->setFrom($_ENV['SMTP_FROM'], 'NextAI Formularz');
    $mail->addAddress($_ENV['SMTP_TO']);
    $mail->addReplyTo($email, $name);

    $mail->isHTML(false);
    $mail->Subject = 'Nowa wiadomość kontaktowa';
    $mail->Body    = "Imię: $name\nEmail: $email\nTelefon: $phone\n\nWiadomość:\n$message";

    $mail->send();

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Błąd wysyłki maila']);
}
