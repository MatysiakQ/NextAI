<?php
header('Content-Type: application/json');

$postsFile = __DIR__ . '/../posts.json';
if (!file_exists($postsFile)) {
    echo json_encode(['posts' => []]);
    exit;
}

$posts = json_decode(file_get_contents($postsFile), true);
echo json_encode(['posts' => $posts]);
exit;