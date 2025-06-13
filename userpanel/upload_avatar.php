<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_email'])) {
    echo json_encode(['success' => false, 'message' => 'Nie jesteś zalogowany.']);
    exit;
}

// Obsługa usuwania avatara (działa dla form-data, x-www-form-urlencoded i JSON)
$action = $_POST['action'] ?? $_REQUEST['action'] ?? null;
if (
    ($_SERVER['REQUEST_METHOD'] === 'POST') &&
    (
        (isset($action) && $action === 'remove') ||
        (
            strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false &&
            ($input = json_decode(file_get_contents('php://input'), true)) &&
            isset($input['action']) && $input['action'] === 'remove'
        )
    )
) {
    $email = $_SESSION['user_email'];
    $avatarDir = realpath(__DIR__ . '/../uploads/avatars/');
    $emailHash = md5(strtolower(trim($email)));
    $removed = false;
    foreach (['jpg', 'png', 'webp'] as $ext) {
        $path = $avatarDir . DIRECTORY_SEPARATOR . $emailHash . '.' . $ext;
        if (file_exists($path)) {
            @unlink($path);
            $removed = true;
        }
    }
    echo json_encode(['success' => true, 'removed' => $removed]);
    exit;
}

if (!isset($_FILES['avatar']) || !is_uploaded_file($_FILES['avatar']['tmp_name'])) {
    echo json_encode(['success' => false, 'message' => 'Nie przesłano pliku.']);
    exit;
}

$file = $_FILES['avatar'];
$allowedTypes = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
$maxSize = 2 * 1024 * 1024; // 2MB

if (!isset($allowedTypes[$file['type']])) {
    echo json_encode(['success' => false, 'message' => 'Dozwolone formaty: JPG, PNG, WEBP.']);
    exit;
}
if ($file['size'] > $maxSize) {
    echo json_encode(['success' => false, 'message' => 'Maksymalny rozmiar pliku to 2MB.']);
    exit;
}

// Sprawdź czy katalog istnieje
$uploadDir = __DIR__ . '/../uploads/avatars/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0775, true);
}

// Nazwa pliku: email_hash.ext
$email = $_SESSION['user_email'];
$ext = $allowedTypes[$file['type']];
$filename = md5(strtolower(trim($email))) . '.' . $ext;
$target = $uploadDir . $filename;

// Usuń stare avatary tego użytkownika
foreach (glob($uploadDir . md5(strtolower(trim($email))) . '.*') as $oldFile) {
    @unlink($oldFile);
}

if (!move_uploaded_file($file['tmp_name'], $target)) {
    echo json_encode(['success' => false, 'message' => 'Błąd zapisu pliku.']);
    exit;
}

// Zwróć ścieżkę względną do avatara
$url = '/uploads/avatars/' . $filename;
echo json_encode(['success' => true, 'url' => $url]);
