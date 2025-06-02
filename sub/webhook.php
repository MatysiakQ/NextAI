<?php
// webhook.php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use Stripe\Stripe;
use Stripe\Webhook;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
$endpointSecret = $_ENV['STRIPE_WEBHOOK_SECRET'];

$payload = @file_get_contents("php://input");
$sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
$event = null;

try {
    $event = Webhook::constructEvent(
        $payload, $sigHeader, $endpointSecret
    );
} catch (\UnexpectedValueException $e) {
    http_response_code(400);
    exit();
} catch (\Stripe\Exception\SignatureVerificationException $e) {
    http_response_code(400);
    exit();
}

$type = $event->type;
$data = $event->data->object;

try {
    $pdo = new PDO(
        "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_NAME']};charset=utf8mb4",
        $_ENV['DB_USER'], $_ENV['DB_PASS'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    if ($type === 'checkout.session.completed') {
        $customerId = $data->customer;
        $subscriptionId = $data->subscription;
        $email = $data->customer_email;
        $plan = $data->metadata->plan ?? 'unknown';

        $stmt = $pdo->prepare("INSERT INTO subscriptions (email, stripe_customer_id, stripe_subscription_id, plan, status, created_at) VALUES (?, ?, ?, ?, 'active', NOW())");
        $stmt->execute([$email, $customerId, $subscriptionId, $plan]);
    }

    if ($type === 'customer.subscription.updated') {
        $subId = $data->id;
        $status = $data->status;
        $currentEnd = date('Y-m-d H:i:s', $data->current_period_end);

        $stmt = $pdo->prepare("UPDATE subscriptions SET status = ?, current_period_end = ? WHERE stripe_subscription_id = ?");
        $stmt->execute([$status, $currentEnd, $subId]);
    }

    if ($type === 'customer.subscription.deleted') {
        $subId = $data->id;

        $stmt = $pdo->prepare("UPDATE subscriptions SET status = 'canceled' WHERE stripe_subscription_id = ?");
        $stmt->execute([$subId]);
    }

    http_response_code(200);
} catch (Exception $e) {
    error_log("[STRIPE WEBHOOK ERROR] " . $e->getMessage(), 3, __DIR__ . '/logs/stripe_webhook.log');
    http_response_code(500);
    exit();
}