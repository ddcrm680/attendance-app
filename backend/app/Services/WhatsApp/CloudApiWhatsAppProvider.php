<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class CloudApiWhatsAppProvider implements WhatsAppProvider
{
    public function send(
        string $recipient,
        string $body,
        ?string $privatePhotoPath = null,
        ?WhatsAppTemplate $template = null,
    ): array
    {
        $phoneNumberId = config('whatsapp.phone_number_id');
        $token = config('whatsapp.access_token');

        if (! $phoneNumberId || ! $token) {
            throw new WhatsAppPermanentException('WhatsApp provider is not configured.');
        }

        if ($template && $privatePhotoPath) {
            throw new WhatsAppPermanentException('A template message cannot include an attendance photo.');
        }

        $client = Http::acceptJson()
            ->withToken($token)
            ->timeout(10);
        $payload = $template
            ? $this->templatePayload($recipient, $template)
            : [
                'messaging_product' => 'whatsapp',
                'to' => $recipient,
                'type' => 'text',
                'text' => ['body' => $body],
            ];
        if ($privatePhotoPath) {
            $disk = Storage::disk(config('attendance.photo_disk'));
            if (! $disk->exists($privatePhotoPath)) throw new WhatsAppPermanentException('The attendance photo is unavailable.');
            $contents = $disk->get($privatePhotoPath);
            if (! is_string($contents) || $contents === '') {
                throw new WhatsAppPermanentException('The attendance photo is unavailable.');
            }
            $media = $client->withOptions([
                'multipart' => [
                    ['name' => 'messaging_product', 'contents' => 'whatsapp'],
                    ['name' => 'type', 'contents' => $disk->mimeType($privatePhotoPath) ?: 'image/jpeg'],
                    ['name' => 'file', 'contents' => $contents, 'filename' => basename($privatePhotoPath)],
                ],
            ])->send('POST', $this->endpoint($phoneNumberId, 'media'));
            if (! $media->successful()) {
                if ($media->status() !== 429 && $media->status() >= 400 && $media->status() < 500) {
                    throw new WhatsAppPermanentException('WhatsApp media upload was rejected.');
                }
                throw new RuntimeException('WhatsApp media upload is temporarily unavailable.');
            }
            $payload = ['messaging_product' => 'whatsapp', 'to' => $recipient, 'type' => 'image', 'image' => ['id' => data_get($media->json(), 'id'), 'caption' => $body]];
        }
        $response = $client->post($this->endpoint($phoneNumberId, 'messages'), $payload);

        if ($response->successful()) {
            return ['message_id' => data_get($response->json(), 'messages.0.id')];
        }

        if ($response->status() !== 429 && $response->status() >= 400 && $response->status() < 500) {
            throw new WhatsAppPermanentException('WhatsApp provider rejected the message.');
        }

        throw new RuntimeException('WhatsApp provider is temporarily unavailable.');
    }

    private function endpoint(string $phoneNumberId, string $resource): string
    {
        $base = rtrim((string) config('whatsapp.base_url'), '/');
        $base = preg_replace('#/v\d+(?:\.\d+)?$#', '', $base) ?: $base;
        $version = trim((string) config('whatsapp.graph_api_version'), '/');

        return "{$base}/{$version}/{$phoneNumberId}/{$resource}";
    }

    /** @return array<string,mixed> */
    private function templatePayload(string $recipient, WhatsAppTemplate $template): array
    {
        $components = [];
        if ($template->headerParameters) {
            $components[] = ['type' => 'header', 'parameters' => $this->parameters($template->headerParameters)];
        }
        if ($template->bodyParameters) {
            $components[] = ['type' => 'body', 'parameters' => $this->parameters($template->bodyParameters)];
        }
        foreach ($template->buttonParameters as $button) {
            $components[] = [
                'type' => 'button',
                'sub_type' => $button['sub_type'] ?? 'url',
                'index' => (string) $button['index'],
                'parameters' => $this->parameters($button['parameters']),
            ];
        }

        return [
            'messaging_product' => 'whatsapp',
            'to' => $recipient,
            'type' => 'template',
            'template' => [
                'name' => $template->name,
                'language' => ['code' => $template->languageCode],
                'components' => $components,
            ],
        ];
    }

    /** @param list<string|int|float> $values */
    private function parameters(array $values): array
    {
        return array_map(fn (string|int|float $value): array => [
            'type' => 'text',
            'text' => (string) $value,
        ], $values);
    }
}
