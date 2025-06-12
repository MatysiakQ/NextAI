<?php
// filepath: c:\NextAi\NextAI\main\add_opinion.php
header('Content-Type: application/json');
require_once __DIR__ . '/../db.php'; // lub podaj właściwą ścieżkę do pliku z połączeniem do bazy

$data = json_decode(file_get_contents('php://input'), true);

$name = trim($data['name'] ?? '');
$text = trim($data['text'] ?? '');
$stars = intval($data['stars'] ?? 5);
$anonymous = !empty($data['anonymous']);

if ($anonymous) $name = 'Anonimowy';
if (!$name || !$text || $stars < 1 || $stars > 5) {
    echo json_encode(['success' => false, 'message' => 'Brak wymaganych danych.']);
    exit;
}

try {
    $pdo = getDb();
    $stmt = $pdo->prepare("INSERT INTO opinions (name, stars, text, created_at) VALUES (?, ?, ?, NOW())");
    $stmt->execute([$name, $stars, $text]);
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Błąd bazy danych.']);
}