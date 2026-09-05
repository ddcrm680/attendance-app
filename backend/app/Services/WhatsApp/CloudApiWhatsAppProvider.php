<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class CloudApiWhatsAppProvider implements WhatsAppProvider
{
    public function send(string $recipient, string $body, ?string $privatePhotoPath = null): array
    {
        $phoneNumberId = config('whatsapp.phone_number_id');
        $token = config('whatsapp.access_token');

        if (! $phoneNumberId || ! $token) {
            throw new WhatsAppPermanentException('WhatsApp provider is not configured.');
        }

        $client = Http::acceptJson()
            ->withToken($token)
            ->timeout(10);
        $payload = [
                'messaging_product' => 'whatsapp',
                'to' => $recipient,
                'type' => 'text',
                'text' => ['body' => $body],
            ];
        if ($privatePhotoPath) {
            $disk = Storage::disk(config('attendance.photo_disk'));
            if (! $disk->exists($privatePhotoPath)) throw new WhatsAppPermanentException('The attendance photo is unavailable.');
            $media = $client->attach('file', $disk->get($privatePhotoPath), basename($privatePhotoPath))
                ->post(config('whatsapp.base_url')."/{$phoneNumberId}/media", ['messaging_product' => 'whatsapp']);
            if (! $media->successful()) throw new RuntimeException('WhatsApp media upload is temporarily unavailable.');
            $payload = ['messaging_product' => 'whatsapp', 'to' => $recipient, 'type' => 'image', 'image' => ['id' => data_get($media->json(), 'id'), 'caption' => $body]];
        }
        $response = $client->post(config('whatsapp.base_url')."/{$phoneNumberId}/messages", $payload);

        if ($response->successful()) {
            return ['message_id' => data_get($response->json(), 'messages.0.id')];
        }

        if ($response->status() !== 429 && $response->status() >= 400 && $response->status() < 500) {
            throw new WhatsAppPermanentException('WhatsApp provider rejected the message.');
        }

        throw new RuntimeException('WhatsApp provider is temporarily unavailable.');
    }
}
