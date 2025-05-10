<?php
ini_set('display_errors', 1); // Wyłączyć w produkcji
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use Stripe\Stripe;
use Stripe\Customer;
use Stripe\Subscription;

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
    error_log("[DB ERROR] " . $e->getMessage(), 3, __DIR__ . '/logs/payment_errors.log');
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Błąd połączenia z bazą danych']);
    exit;
}

// Tylko POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Tylko metoda POST jest dozwolona']);
    exit;
}

// Dane z formularza
$email = trim($_POST['email'] ?? '');
$plan = trim($_POST['plan'] ?? '');

$companyName = trim($_POST['company_name'] ?? '');
$companyNip = trim($_POST['company_nip'] ?? '');
$companyAddress = trim($_POST['company_address'] ?? '');
$companyZip = trim($_POST['company_zip'] ?? '');
$companyCity = trim($_POST['company_city'] ?? '');

// Walidacja
if (!$email || !$plan) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Brakuje wymaganych danych']);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nieprawidłowy adres e-mail']);
    exit;
}

// Mapowanie pakietów
$priceMap = [
    'basic' => $_ENV['STRIPE_PRICE_BASIC'],
    'pro' => $_ENV['STRIPE_PRICE_PRO']
];

if (!isset($priceMap[$plan])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nieznany pakiet subskrypcji']);
    exit;
}

Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

try {
    $customer = Customer::create([
        'email' => $email,
        'metadata' => [
            'plan' => $plan,
            'invoice_requested' => $companyName ? 'yes' : 'no'
        ]
    ]);

    \Stripe\Customer::update($customer->id, [
        'name'       => $companyName,
        'address'    => [
            'line1'       => $companyAddress,
            'postal_code' => $companyZip,
            'city'        => $companyCity,
            'country'     => 'PL',
        ],
    ]);

    \Stripe\TaxId::create([
        'customer' => $customer->id,
        'type'     => 'eu_vat',
        'value'    => $companyNip,
    ]);


    $subscription = Subscription::create([
        'customer' => $customer->id,
        'items' => [[ 'price' => $priceMap[$plan] ]],
        'payment_behavior' => 'default_incomplete',
        'expand' => ['latest_invoice.payment_intent']
    ]);

    // Zapis do bazy
    $stmt = $pdo->prepare("
        INSERT INTO subscriptions 
        (email, stripe_customer_id, stripe_subscription_id, plan, status, created_at) 
        VALUES (?, ?, ?, ?, 'pending', NOW())
    ");
    $stmt->execute([$email, $customer->id, $subscription->id, $plan]);

    // Zapis faktury (jeśli podano)
    if ($companyName) {
        $stmt2 = $pdo->prepare("
            INSERT INTO invoices 
            (stripe_customer_id, company_name, company_nip, company_address, company_zip, company_city, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt2->execute([
            $customer->id,
            $companyName,
            $companyNip,
            $companyAddress,
            $companyZip,
            $companyCity
        ]);
    }

    echo json_encode([
        'success' => true,
        'clientSecret' => $subscription->latest_invoice->payment_intent->client_secret
    ]);
} catch (Exception $e) {
    error_log("[STRIPE ERROR] " . $e->getMessage(), 3, __DIR__ . '/logs/payment_errors.log');
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Błąd podczas tworzenia subskrypcji']);
}
