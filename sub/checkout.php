
<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use Stripe\Stripe;
use Stripe\Checkout\Session;

// Załaduj zmienne środowiskowe
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Sprawdź czy Stripe jest skonfigurowany
if (empty($_ENV['STRIPE_SECRET_KEY'])) {
    echo json_encode(['success' => false, 'message' => 'Stripe nie jest skonfigurowany.']);
    exit;
}

Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

// Sprawdź czy użytkownik jest zalogowany
if (!isset($_SESSION['user_email'])) {
    echo json_encode(['success' => false, 'message' => 'Musisz być zalogowany aby dokonać zakupu.']);
    exit;
}

// Pobierz dane z formularza
$email = $_POST['email'] ?? '';
$plan = $_POST['plan'] ?? '';
$billingType = $_POST['billing_type'] ?? 'monthly';

if (empty($email) || empty($plan)) {
    echo json_encode(['success' => false, 'message' => 'Wszystkie pola są wymagane.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Nieprawidłowy format adresu email.']);
    exit;
}

// Sprawdź czy email z formularza zgadza się z zalogowanym użytkownikiem
if ($email !== $_SESSION['user_email']) {
    echo json_encode(['success' => false, 'message' => 'Email musi być taki sam jak w zalogowanym koncie.']);
    exit;
}

// Konfiguracja planów
$planConfig = [
    'basic' => [
        'name' => 'NextAI Basic',
        'monthly_price' => 59900, // 599 zł w groszach
        'yearly_price' => 48000,  // 480 zł w groszach
    ],
    'pro' => [
        'name' => 'NextAI Pro',
        'monthly_price' => 119900, // 1199 zł w groszach
        'yearly_price' => 91000,   // 910 zł w groszach
    ]
];

if (!isset($planConfig[$plan])) {
    echo json_encode(['success' => false, 'message' => 'Nieprawidłowy plan.']);
    exit;
}

$selectedPlan = $planConfig[$plan];
$price = $billingType === 'yearly' ? $selectedPlan['yearly_price'] : $selectedPlan['monthly_price'];
$interval = $billingType === 'yearly' ? 'year' : 'month';

try {
    // Sprawdź czy klient już istnieje
    $customers = \Stripe\Customer::all(['email' => $email, 'limit' => 1]);
    $customerId = null;
    
    if (!empty($customers->data)) {
        $customerId = $customers->data[0]->id;
    }

    // Utwórz sesję checkout
    $checkoutSession = Session::create([
        'customer' => $customerId,
        'customer_email' => $customerId ? null : $email,
        'payment_method_types' => ['card'],
        'line_items' => [[
            'price_data' => [
                'currency' => 'pln',
                'product_data' => [
                    'name' => $selectedPlan['name'],
                ],
                'unit_amount' => $price,
                'recurring' => [
                    'interval' => $interval,
                ],
            ],
            'quantity' => 1,
        ]],
        'mode' => 'subscription',
        'success_url' => 'http' . (isset($_SERVER['HTTPS']) ? 's' : '') . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/../user_panel.html?success=1',
        'cancel_url' => 'http' . (isset($_SERVER['HTTPS']) ? 's' : '') . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/subskrypcja.html?canceled=1',
        'metadata' => [
            'plan' => $plan,
            'billing_type' => $billingType,
            'user_email' => $email
        ],
    ]);

    echo json_encode(['success' => true, 'url' => $checkoutSession->url]);

} catch (Exception $e) {
    error_log("Stripe checkout error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Błąd podczas tworzenia sesji płatności: ' . $e->getMessage()]);
}
?>
