<?php
header('Content-Type: application/json');

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if ($data) {
    $filename = 'logs.json';
    
    $logs = [];
    if (file_exists($filename)) {
        $logs = json_decode(file_get_contents($filename), true);
        if (!is_array($logs)) $logs = [];
    }

    $now = DateTime::createFromFormat('U.u', microtime(true));
    if (!$now) $now = new DateTime();
    $now->setTimezone(new DateTimeZone('Europe/Kiev'));
    $serverTime = $now->format("H:i:s.u");

    if (isset($data['is_bulk']) && $data['is_bulk'] === true) {  // спосіб 2 масове збереження
        foreach ($data['payload'] as $item) {        // Додаємо до кожного запису час отримання сервером
            $item['server_time'] = $serverTime; 
            $item['method'] = 'method_2_localStorage'; 
            $logs[] = $item;
        }
    } else {
        $data['server_time'] = $serverTime;  //спосіб 1 миттєве збереження
        $data['method'] = 'method_1_immediate'; 
        $logs[] = $data;
    }

    file_put_contents($filename, json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    echo json_encode(['status' => 'success', 'server_time' => $serverTime]);
} else {
    echo json_encode(['status' => 'error']);
}
?>