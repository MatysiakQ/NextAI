<?php
// Handles P24 callbacks: verifies payment and sends invoice email
require __DIR__ . '/lib/fakturownia.php';
env_load();

$input = json_decode(file_get_contents('php://input'), true);
// Verify signature and status
if (!verify_p24($input)) {
    http_response_code(400); echo 'SIGN_ERROR'; exit;
}
if ($input['status'] === 'success' && verify_status_p24($input)) {
    $sessionId = $input['sessionId'];
    $mapping = load_mapping($sessionId);
    if ($mapping && isset($mapping['invoiceId'])) {
        sendInvoiceEmail($mapping['invoiceId']);
    }
    echo 'OK'; exit;
}
echo 'FAIL'; exit;
