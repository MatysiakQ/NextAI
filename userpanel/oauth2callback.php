<?php
session_start();
require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$client_id = $_ENV['GOOGLE_CLIENT_ID'];
$client_secret = $_ENV['GOOGLE_CLIENT_SECRET'];
$redirect_uri = $_ENV['REDIRECT_URI'];

// Krok 1: Sprawdzenie kodu
if (!isset($_GET['code'])) {
    die('Brak kodu autoryzacji.');
}

// Krok 2: Wymiana kodu na token
$code = $_GET['code'];
$token_url = "https://oauth2.googleapis.com/token";

$data = [
    'code' => $code,
    'client_id' => $client_id,
    'client_secret' => $client_secret,
    'redirect_uri' => $redirect_uri,
    'grant_type' => 'authorization_code',
];

$options = [
    'http' => [
        'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
        'method'  => 'POST',
        'content' => http_build_query($data),
    ],
];
$context = stream_context_create($options);
$response = file_get_contents($token_url, false, $context);
if (!$response) {
    die('Błąd przy pobieraniu tokenu.');
}
$token_data = json_decode($response, true);

// Krok 3: Pobranie danych użytkownika
$access_token = $token_data['access_token'];
$userinfo = file_get_contents('https://www.googleapis.com/oauth2/v2/userinfo?access_token=' . $access_token);
$userinfo = json_decode($userinfo, true);

// Krok 4: Zalogowanie użytkownika (np. zapis do sesji)
$_SESSION['user'] = $userinfo;
$_SESSION['user_email'] = $userinfo['email'] ?? null;
$_SESSION['username'] = $userinfo['name'] ?? ($userinfo['email'] ?? '');
$_SESSION['login_time'] = time();

// Przekierowanie do panelu
header('Location: /userpanel/user_panel.html');
exit;
?>
