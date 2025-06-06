<?php
header('Content-Type: application/json');
require_once __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

echo json_encode([
     'GOOGLE_CLIENT_ID' => $_ENV['GOOGLE_CLIENT_ID'],
]);
