<?php

namespace App\Services\WhatsApp;

interface WhatsAppProvider
{
    /** @return array{message_id:?string} */
    public function send(string $recipient, string $body, ?string $privatePhotoPath = null): array;
}
