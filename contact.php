<?php
/* Lavender Capital — contact form handler.
 * Accepts JSON POST {name, email, brief, topic, company} and emails the
 * enquiry to info@lavendercapital.vc. "company" is a honeypot: bots fill
 * it, humans never see it.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    $data = $_POST;
}

$clean = static function ($v, $max) {
    $v = trim((string) $v);
    $v = str_replace(["\r", "\n", "%0a", "%0d"], ' ', $v); // header-injection guard
    return mb_substr($v, 0, $max);
};

$name  = $clean($data['name'] ?? '', 200);
$email = $clean($data['email'] ?? '', 254);
$topic = $clean($data['topic'] ?? '', 200);
$brief = mb_substr(trim((string) ($data['brief'] ?? '')), 0, 5000);
$honey = trim((string) ($data['company'] ?? ''));

// Honeypot tripped: pretend success, send nothing — but log it flagged,
// so a false positive (e.g. browser autofill) is never silently lost.
if ($honey !== '') {
    @file_put_contents(dirname(__DIR__) . '/enquiries.log', json_encode([
        'time' => date('c'), 'honeypot' => true,
        'name' => $name, 'email' => $email, 'topic' => $topic, 'brief' => $brief,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    ], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
    echo json_encode(['ok' => true]);
    exit;
}

if ($name === '' || $brief === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'invalid']);
    exit;
}

$to      = 'info@lavendercapital.vc';
$subject = ($topic !== '' ? $topic : 'Website enquiry') . ' — ' . $name;
$subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$lines = [
    'Name: ' . $name,
    'Email: ' . $email,
];
if ($topic !== '') {
    $lines[] = 'Topic: ' . $topic;
}
$lines[] = '';
$lines[] = $brief;
$lines[] = '';
$lines[] = '--';
$lines[] = 'Sent from the lavendercapital.vc contact form';
$lines[] = 'IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$lines[] = 'Time: ' . date('c');
$body = implode("\n", $lines);

// Safety net: log every valid enquiry outside the webroot so nothing is
// ever lost, even if email delivery fails.
$logLine = json_encode([
    'time'  => date('c'),
    'name'  => $name,
    'email' => $email,
    'topic' => $topic,
    'brief' => $brief,
    'ip'    => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
], JSON_UNESCAPED_UNICODE);
@file_put_contents(dirname(__DIR__) . '/enquiries.log', $logLine . "\n", FILE_APPEND | LOCK_EX);

// SPF for lavendercapital.vc includes "a" (updated 2026-07-18), which
// authorizes this server's IP — so mail may now be sent From this domain.
$from    = 'noreply@lavendercapital.vc';
$headers = implode("\r\n", [
    'From: Lavender Capital <' . $from . '>',
    'Reply-To: ' . $name . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
]);

$sent = mail($to, $subject, $body, $headers, '-f' . $from);

if (!$sent) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'mail']);
    exit;
}

echo json_encode(['ok' => true]);
