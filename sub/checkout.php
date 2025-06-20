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

// --- DODAJ: Wymuś pobranie planu i billing_type z POST, GET i sprawdź JS ---
// (jeśli Twój frontend wysyła przez JS, sprawdź czy na pewno wysyła plan=pro gdy wybierasz pro)

// --- DEBUG: Zapisz do loga co przychodzi ---
file_put_contents(__DIR__ . '/checkout_debug.log', date('c') . " plan=$plan billingType=$billingType email=$email\n", FILE_APPEND);

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

// Konfiguracja planów - podaj prawdziwe price_id z panelu Stripe!
$planConfig = [
    'basic' => [
        'name' => 'Plan Basic',
        'monthly_price_id' => 'price_1RbQ02FQCBNi0t61Gl869ydi',
        'yearly_price_id' => 'price_1RbV2BFQCBNi0t615CjJRRpM',
    ],
    'pro' => [
        'name' => 'Plan Pro',
        'monthly_price_id' => 'price_1RbQ0jFQCBNi0t61XPqAvRW6',
        'yearly_price_id' => 'price_1RbV3UFQCBNi0t618JCyqgzV',
    ]
];

// --- DODAJ: Sprawdź czy $plan jest dokładnie 'pro' lub 'basic' ---
if (!in_array($plan, ['basic', 'pro'])) {
    echo json_encode(['success' => false, 'message' => 'Nieprawidłowy plan przekazany do backendu: ' . htmlspecialchars($plan)]);
    exit;
}

// Upewnij się, że billingType jest ustawione poprawnie (tylko 'monthly' lub 'yearly')
$billingType = ($billingType === 'yearly') ? 'yearly' : 'monthly';

// --- DEBUG: Zapisz price_id do loga ---
$selectedPlan = $planConfig[$plan];
$price_id = $billingType === 'yearly' ? $selectedPlan['yearly_price_id'] : $selectedPlan['monthly_price_id'];
file_put_contents(__DIR__ . '/checkout_debug.log', date('c') . " price_id=$price_id\n", FILE_APPEND);

if (empty($price_id)) {
    echo json_encode(['success' => false, 'message' => 'Brak price_id dla wybranego planu. Skontaktuj się z administratorem.']);
    exit;
}

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
            'price' => $price_id,
            'quantity' => 1,
        ]],
        'mode' => 'subscription',
        'success_url' => 'http' . (isset($_SERVER['HTTPS']) ? 's' : '') . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/subskrypcja.html?success=1',
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
