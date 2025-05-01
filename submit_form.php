<?php
// Ustawienia błędów (włączone tylko na etapie testów)
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/plain; charset=utf-8');

// Autoload + .env
require __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Dane do bazy danych
$host     = $_ENV['DB_HOST'];
$dbname   = $_ENV['DB_NAME'];
$username = $_ENV['DB_USER'];
$password = $_ENV['DB_PASS'];

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    die("Błąd połączenia z bazą danych: " . $e->getMessage());
}

// Obsługa formularza kontaktowego (POST)
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $name    = trim($_POST['name'] ?? '');
    $email   = trim($_POST['email'] ?? '');
    $phone   = trim($_POST['phone'] ?? '');
    $message = trim($_POST['message'] ?? '');

    // Walidacja
    if (empty($name) || empty($email) || empty($phone) || empty($message)) {
        http_response_code(400);
        exit("Wszystkie pola są wymagane.");
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        exit("Nieprawidłowy adres email.");
    }

    // Zapis do bazy danych
    try {
        $stmt = $pdo->prepare("INSERT INTO orders (name, email, phone, message, created_at) VALUES (:name, :email, :phone, :message, NOW())");
        $stmt->execute([
            ':name' => $name,
            ':email' => $email,
            ':phone' => $phone,
            ':message' => $message
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        exit("Błąd zapisu do bazy danych: " . $e->getMessage());
    }

    // Wysyłka maila
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
        $mail->Body    = "Imię i nazwisko: $name\nEmail: $email\nTelefon: $phone\nWiadomość: $message\n";

        $mail->send();
        echo "OK";
    } catch (Exception $e) {
        http_response_code(500);
        exit("Błąd wysyłki maila: {$mail->ErrorInfo}");
    }

    exit;
}

// (opcjonalnie) Pobieranie listy zamówień - tylko jeśli ktoś otwiera plik bez POST (np. GET)
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    try {
        $stmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC");
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($orders) {
            echo "Zamówienia:\n";
            foreach ($orders as $order) {
                echo "ID: " . $order['id'] . "\n";
                echo "Imię i nazwisko: " . $order['name'] . "\n";
                echo "Email: " . $order['email'] . "\n";
                echo "Telefon: " . $order['phone'] . "\n";
                echo "Wiadomość: " . $order['message'] . "\n";
                echo "Data: " . $order['created_at'] . "\n";
                echo "--------------------------\n";
            }
        } else {
            echo "Brak zamówień w bazie.";
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo "Błąd pobierania zamówień: " . $e->getMessage();
    }
}
