<?php
// checkout.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use Stripe\Stripe;
use Stripe\Checkout\Session;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

$email = $_POST['email'] ?? '';
$plan = $_POST['plan'] ?? '';
$billingType = $_POST['billing_type'] ?? 'monthly';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nieprawidłowy adres email']);
    exit;
}

$priceMap = [
    'basic' => [
        'monthly' => $_ENV['STRIPE_PRICE_BASIC_MONTHLY'],
        'yearly' => $_ENV['STRIPE_PRICE_BASIC_YEARLY'],
    ],
    'pro' => [
        'monthly' => $_ENV['STRIPE_PRICE_PRO_MONTHLY'],
        'yearly' => $_ENV['STRIPE_PRICE_PRO_YEARLY'],
    ]
];

if (!isset($priceMap[$plan][$billingType])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nieznany pakiet']);
    exit;
}

$priceId = $priceMap[$plan][$billingType];

try {
    $session = Session::create([
        'payment_method_types' => ['card'],
        'mode' => 'subscription',
        'customer_email' => $email,
        'line_items' => [[
            'price' => $priceId,
            'quantity' => 1,
        ]],
        'subscription_data' => [
            'metadata' => [
                'plan' => $plan
            ]
        ],
        'success_url' => 'https://twojastrona.pl/sukces?session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => 'https://twojastrona.pl/anulowano',
    ]);

    echo json_encode(['success' => true, 'url' => $session->url]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Blad Stripe: ' . $e->getMessage()]);
}
