<?php
// Handles front-end registration: invoice creation + P24 transaction registration
require __DIR__ . '/lib/fakturownia.php';

// Load P24 envs
env_load(); // assume you load envs globally

header('Content-Type: application/json');
$input = json_decode(file_get_contents('php://input'), true);

// Validate input
$email        = $input['email'] ?? '';
$plan         = $input['plan']  ?? '';
wantsInvoice = $input['wantsInvoice'] ?? false;
$invoiceData  = $input['invoiceData'] ?? [];
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !$plan) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Invalid email or plan']);
    exit;
}

// Determine price
$prices = ['basic'=>9900,'pro'=>19900];
if (!isset($prices[$plan])) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Unknown plan']);
    exit;
}
$amount = $prices[$plan];

// 1) Create invoice (optional)
$invoiceId = null;
if ($wantsInvoice) {
    $invoiceId = createInvoiceFakturownia($invoiceData, $plan, $amount);
}

// 2) Register P24 transaction
timezone_set('Europe/Warsaw');
$sessionId = uniqid('p24_');
// persist sessionId->invoiceId
if ($invoiceId) save_mapping($sessionId, $invoiceId);

// P24 payload
env_vars(['P24_MERCHANT_ID','P24_POS_ID','P24_CRC_KEY']);
$p24 = [
    'merchantId' => P24_MERCHANT_ID,
    'posId'      => P24_POS_ID,
    'sessionId'  => $sessionId,
    'amount'     => $amount,
    'currency'   => 'PLN',
    'description'=> "Subscription: {$plan}",
    'email'      => $email,
    'urlReturn'  => 'https://yourdomain.com/thank-you',
    'urlStatus'  => 'https://yourdomain.com/webhook.php'
];
$p24['sign'] = sign_p24($p24);

// Call P24
echo json_encode(['success'=>true,'token'=> register_p24($p24) ]);
exit;