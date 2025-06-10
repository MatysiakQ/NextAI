<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use Stripe\Stripe;
use Stripe\Webhook;

$logFile = __DIR__ . '/logs/stripe_webhook.log';
if (!file_exists(dirname($logFile))) {
    mkdir(dirname($logFile), 0755, true);
}

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
$endpointSecret = $_ENV['STRIPE_WEBHOOK_SECRET'];

$payload = @file_get_contents("php://input");
$sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
$event = null;

try {
    $event = Webhook::constructEvent(
        $payload,
        $sigHeader,
        $endpointSecret
    );
} catch (\UnexpectedValueException $e) {
    error_log("[WEBHOOK] Invalid payload: " . $e->getMessage(), 3, $logFile);
    http_response_code(400);
    exit();
} catch (\Stripe\Exception\SignatureVerificationException $e) {
    error_log("[WEBHOOK] Invalid signature: " . $e->getMessage(), 3, $logFile);
    http_response_code(400);
    exit();
}

$type = $event->type;
$data = $event->data->object;

try {
    $pdo = new PDO(
        "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_NAME']};charset=utf8mb4",
        $_ENV['DB_USER'],
        $_ENV['DB_PASS'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Sprawdź czy event już był przetwarzany
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM stripe_events WHERE stripe_event_id = ?");
    $stmt->execute([$event->id]);
    if ($stmt->fetchColumn() > 0) {
        error_log("[WEBHOOK] Event already processed: {$event->id}", 3, $logFile);
        http_response_code(200);
        exit();
    }

    // Zapisz event
    $stmt = $pdo->prepare("INSERT INTO stripe_events (stripe_event_id, event_type, data) VALUES (?, ?, ?)");
    $stmt->execute([$event->id, $type, json_encode($event->data)]);

    if ($type === 'checkout.session.completed') {
        $customerId = $data->customer;
        $subscriptionId = $data->subscription;
        $email = $data->customer_email;

        // Pobierz user_id po customer_id lub emailu
        $userId = null;
        if ($customerId) {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE stripe_customer_id = ?");
            $stmt->execute([$customerId]);
            $userId = $stmt->fetchColumn();
        }
        if (!$userId && $email) {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $userId = $stmt->fetchColumn();
        }

        // *** POPRAWKA TUTAJ ***
        if (!$email && $customerId) {
            try {
                $stripeCustomer = \Stripe\Customer::retrieve($customerId);
                if ($stripeCustomer && !empty($stripeCustomer->email)) {
                    $email = $stripeCustomer->email;
                }
            } catch (Exception $e) {
                error_log("[WEBHOOK] Błąd pobierania emaila po customer_id: $customerId, " . $e->getMessage(), 3, $logFile);
            }
        }

        if (!$email) {
            error_log("[WEBHOOK] Przerwano zapis subskrypcji: email jest NULL dla eventu: " . $event->id, 3, $logFile);
            return;
        }
        // *** KONIEC POPRAWKI ***

        // Pobierz dane subskrypcji ze Stripe dla pełnych informacji
        $stripeSubscription = \Stripe\Subscription::retrieve($subscriptionId);

        // Ustal plan na podstawie Stripe (product/price)
        $plan = 'unknown';
        if (!empty($stripeSubscription->items->data[0]->price->id)) {
            $plan = $stripeSubscription->items->data[0]->price->id;
        } elseif (!empty($data->metadata->plan)) {
            $plan = $data->metadata->plan;
        }

        $status = $stripeSubscription->status;
        $currentPeriodStart = date('Y-m-d H:i:s', $stripeSubscription->current_period_start);
        $currentPeriodEnd = date('Y-m-d H:i:s', $stripeSubscription->current_period_end);
        $cancelAtPeriodEnd = $stripeSubscription->cancel_at_period_end ? 1 : 0;

        // Wstaw lub zaktualizuj subskrypcję z pełnymi danymi
        $stmt = $pdo->prepare("
        INSERT INTO subscriptions (
            email, user_id, stripe_customer_id, stripe_subscription_id, 
            plan, status, current_period_start, current_period_end, 
            cancel_at_period_end, created_at
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
            status = VALUES(status),
            plan = VALUES(plan),
            current_period_start = VALUES(current_period_start),
            current_period_end = VALUES(current_period_end),
            cancel_at_period_end = VALUES(cancel_at_period_end),
            updated_at = NOW()
    ");
        $stmt->execute([
            $email,
            $userId,
            $customerId,
            $subscriptionId,
            $plan,
            $status,
            $currentPeriodStart,
            $currentPeriodEnd,
            $cancelAtPeriodEnd
        ]);

        error_log("[WEBHOOK] Subscription created/updated: $subscriptionId for $email with full details", 3, $logFile);
    }


    if ($type === 'customer.subscription.updated') {
        $subId = $data->id;
        $status = $data->status;
        $currentStart = date('Y-m-d H:i:s', $data->current_period_start);
        $currentEnd = date('Y-m-d H:i:s', $data->current_period_end);
        $cancelAtPeriodEnd = $data->cancel_at_period_end ? 1 : 0;

        // Ustal plan na podstawie Stripe (product/price)
        $plan = null;
        if (!empty($data->items->data[0]->price->id)) {
            $plan = $data->items->data[0]->price->id;
        }

        $sql = "
            UPDATE subscriptions 
            SET status = ?, 
                current_period_start = ?, 
                current_period_end = ?, 
                cancel_at_period_end = ?,
                updated_at = NOW()";
        $params = [$status, $currentStart, $currentEnd, $cancelAtPeriodEnd];

        if ($plan) {
            $sql .= ", plan = ?";
            $params[] = $plan;
        }
        $sql .= " WHERE stripe_subscription_id = ?";
        $params[] = $subId;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        error_log("[WEBHOOK] Subscription updated: $subId to status $status, cancel_at_period_end: $cancelAtPeriodEnd", 3, $logFile);
    }

    if ($type === 'customer.subscription.deleted') {
        $subId = $data->id;

        $stmt = $pdo->prepare("UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE stripe_subscription_id = ?");
        $stmt->execute([$subId]);

        error_log("[WEBHOOK] Subscription canceled: $subId", 3, $logFile);
    }

    // Oznacz event jako przetworzony
    $stmt = $pdo->prepare("UPDATE stripe_events SET processed = 1, processed_at = NOW() WHERE stripe_event_id = ?");
    $stmt->execute([$event->id]);

    http_response_code(200);
    error_log("[WEBHOOK] Successfully processed event: {$event->id} of type: $type", 3, $logFile);

} catch (Exception $e) {
    error_log("[STRIPE WEBHOOK ERROR] " . $e->getMessage() . " - Event: {$event->id}", 3, $logFile);

    if (isset($pdo)) {
        try {
            $stmt = $pdo->prepare("UPDATE stripe_events SET error_message = ? WHERE stripe_event_id = ?");
            $stmt->execute([$e->getMessage(), $event->id]);
        } catch (Exception $dbError) {
            error_log("[WEBHOOK DB ERROR] " . $dbError->getMessage(), 3, $logFile);
        }
    }

    http_response_code(500);
    exit();
}
?>