<?php
// filepath: c:\NextAi\NextAI\main\get_opinions.php
header('Content-Type: application/json');
require_once __DIR__ . '/../db.php'; // lub podaj właściwą ścieżkę do pliku z połączeniem do bazy

try {
    $pdo = getDb(); // funkcja getDb() powinna zwracać PDO
    $stmt = $pdo->query("SELECT name, stars, text FROM opinions ORDER BY id DESC LIMIT 30");
    $opinions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($opinions);
} catch (Exception $e) {
    echo json_encode([]);
}