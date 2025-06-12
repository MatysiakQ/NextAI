<?php
// filepath: c:\NextAi\NextAI\db.php

function getDb()
{
    static $pdo;
    if ($pdo)
        return $pdo;

    // Wczytaj dane z pliku .env
    $envPath = __DIR__ . '/../../.env';
    if (!file_exists($envPath)) {
        throw new Exception('.env file not found');
    }
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env = [];
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0 || strpos($line, '=') === false)
            continue;
        [$key, $val] = explode('=', $line, 2);
        $env[trim($key)] = trim($val);
    }

    $host = $env['DB_HOST'] ?? 'localhost';
    $dbname = $env['DB_NAME'] ?? 'nextai';
    $user = $env['DB_USER'] ?? 'user';
    $pass = $env['DB_PASS'] ?? 'password';

    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    return $pdo;
}