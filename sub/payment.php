<?php
ini_set('display_errors', 1); // Wyłączyć w produkcji
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use Stripe\Stripe;
use Stripe\Customer;
use Stripe\Subscription;

// Wczytaj dane z .env
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Dane do bazy
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

// Sprawdź czy POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Tylko POST']);
    exit;
}

// Dane z formularza
$email = trim($_POST['email'] ?? '');
$plan = trim($_POST['plan'] ?? '');

if (!$email || !$plan) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Brakuje danych']);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nieprawidłowy email']);
    exit;
}

// ID pakietu Stripe
$priceMap = [
    'basic' => $_ENV['STRIPE_PRICE_BASIC'],
    'pro' => $_ENV['STRIPE_PRICE_PRO']
];

if (!isset($priceMap[$plan])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nieznany pakiet']);
    exit;
}

Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

try {
    // Stwórz klienta
    $customer = Customer::create([
        'email' => $email
    ]);

    // Utwórz subskrypcję
    $subscription = Subscription::create([
        'customer' => $customer->id,
        'items' => [[
            'price' => $priceMap[$plan]
        ]],
        'payment_behavior' => 'default_incomplete',
        'expand' => ['latest_invoice.payment_intent']
    ]);

    // Zapis do bazy
    $stmt = $pdo->prepare("INSERT INTO subscriptions (email, stripe_customer_id, stripe_subscription_id, plan, created_at) VALUES (?, ?, ?, ?, NOW())");
    $stmt->execute([$email, $customer->id, $subscription->id, $plan]);

    echo json_encode([
        'success' => true,
        'clientSecret' => $subscription->latest_invoice->payment_intent->client_secret
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
