<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../vendor/autoload.php';

$pdo = new PDO(
    "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_NAME']};charset=utf8mb4",
    $_ENV['DB_USER'],
    $_ENV['DB_PASS'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action === 'register') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $password2 = $_POST['password2'] ?? '';
    if (!$email || !$password) {
        echo json_encode(['success' => false, 'message' => 'Podaj email i hasło']);
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Nieprawidłowy email']);
        exit;
    }
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'message' => 'Hasło za krótkie']);
        exit;
    }
    if ($password !== $password2) {
        echo json_encode(['success' => false, 'message' => 'Hasła nie są takie same!']);
        exit;
    }
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Email już istnieje']);
        exit;
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (email, password) VALUES (?, ?)");
    $stmt->execute([$email, $hash]);
    $_SESSION['user_id'] = $pdo->lastInsertId();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'login') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    if (!$email || !$password) {
        echo json_encode(['success' => false, 'message' => 'Podaj email i hasło']);
        exit;
    }
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Nieprawidłowe dane logowania']);
    }
    exit;
}

if ($action === 'logout') {
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'subscriptions') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Brak dostępu']);
        exit;
    }
    $stmt = $pdo->prepare("SELECT * FROM subscriptions WHERE email = (SELECT email FROM users WHERE id = ?)");
    $stmt->execute([$_SESSION['user_id']]);
    $subs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'subscriptions' => $subs]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Nieznana akcja']);