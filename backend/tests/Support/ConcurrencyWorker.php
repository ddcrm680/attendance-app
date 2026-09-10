<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel as ConsoleKernel;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

require dirname(__DIR__, 2).'/vendor/autoload.php';

$database = getenv('CONCURRENCY_DATABASE');
$readyFile = getenv('CONCURRENCY_READY_FILE');
$startFile = getenv('CONCURRENCY_START_FILE');
$jobFile = getenv('CONCURRENCY_JOB_FILE');

if (! $database || ! $readyFile || ! $startFile || ! $jobFile) {
    fwrite(STDERR, "Missing concurrency worker configuration.\n");
    exit(2);
}

try {
    $app = require dirname(__DIR__, 2).'/bootstrap/app.php';
    $app->make(ConsoleKernel::class)->bootstrap();

    config()->set('database.default', 'sqlite');
    config()->set('database.connections.sqlite.database', $database);
    config()->set('whatsapp.enabled', false);
    DB::purge('sqlite');
    DB::reconnect('sqlite');

    $job = json_decode((string) file_get_contents($jobFile), true, 512, JSON_THROW_ON_ERROR);
    touch($readyFile);

    $deadline = microtime(true) + 15;
    while (! file_exists($startFile) && microtime(true) < $deadline) {
        usleep(10_000);
    }
    if (! file_exists($startFile)) {
        throw new RuntimeException('Concurrency start barrier timed out.');
    }

    $request = Request::create(
        $job['path'],
        $job['method'],
        [],
        [],
        [],
        [
            'HTTP_ACCEPT' => 'application/json',
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer '.$job['token'],
        ],
        json_encode($job['payload'], JSON_THROW_ON_ERROR),
    );
    $kernel = $app->make(HttpKernel::class);
    $response = $kernel->handle($request);
    $raw = $response->getContent();
    $kernel->terminate($request, $response);

    echo json_encode([
        'status' => $response->getStatusCode(),
        'body' => json_decode($raw, true),
        'raw' => $raw,
    ], JSON_THROW_ON_ERROR);
} catch (Throwable $exception) {
    fwrite(STDERR, get_class($exception).': '.$exception->getMessage()."\n");
    exit(1);
}
