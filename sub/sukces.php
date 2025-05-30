<?php
// sukces.php
require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use Stripe\Stripe;
use Stripe\Checkout\Session;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

$sessionId = $_GET['session_id'] ?? null;
if (!$sessionId) {
    echo "Brak ID sesji.";
    exit;
}

try {
    $session = Session::retrieve($sessionId, [
        'expand' => ['subscription', 'customer']
    ]);

    $email = $session->customer_email;
    $subscription = $session->subscription;

    echo "<h2>Dziękujemy za subskrypcję!</h2>";
    echo "<p>Email: $email</p>";
    echo "<p>Subskrypcja ID: {$subscription->id}</p>";
    echo "<p>Status: {$subscription->status}</p>";
    echo "<p>Wygasa: " . date('Y-m-d H:i', $subscription->current_period_end) . "</p>";
} catch (Exception $e) {
    echo "Błąd podczas pobierania danych: " . $e->getMessage();
}