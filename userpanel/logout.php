<?php
session_start();

$wasLoggedIn = isset($_SESSION['user_email']);

session_unset();

session_destroy();

header('Content-Type: application/json; charset=utf-8');

if ($wasLoggedIn) {
    echo json_encode([
        'success' => true, 
        'message' => 'Zostałeś pomyślnie wylogowany.',
        'redirectTo' => '/index.html'
    ]);
} else {
    echo json_encode([
        'success' => false, 
        'message' => 'Nie byłeś zalogowany.',
        'redirectTo' => '/index.html'
    ]);
}
?>