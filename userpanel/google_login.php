<?php
session_start();
header("Content-Type: application/json");

// ⛓️ Połącz się z bazą danych (zmień ścieżkę/PDO na swoją)
$db = new PDO("sqlite:users.db"); // lub np. new PDO("mysql:host=localhost;dbname=nextai", "user", "pass");

$token = $_POST['token'] ?? '';
if (!$token) {
  echo json_encode(["success" => false, "message" => "Brak tokenu"]);
  exit;
}

// ✅ Weryfikacja tokenu przez Google
$verify = file_get_contents("https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($token));
$data = json_decode($verify, true);

// ❌ Błąd lub brak e-maila
if (!$data || !isset($data['email'])) {
  echo json_encode(["success" => false, "message" => "Token niepoprawny"]);
  exit;
}

$email = $data['email'];
$username = $data['name'] ?? explode('@', $email)[0];

// 🔍 Sprawdź, czy użytkownik już istnieje
$stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
  // 🆕 Rejestracja użytkownika (z hasłem generowanym losowo)
  $fakePassword = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
  $stmt = $db->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
  $stmt->execute([$username, $email, $fakePassword]);
}

// ✅ Ustaw sesję użytkownika
$_SESSION['user'] = ['email' => $email];
echo json_encode(["success" => true]);
?>