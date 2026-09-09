<?php

namespace App\Services\WhatsApp;

/** Provider-neutral representation of a future Meta template message. */
class WhatsAppTemplate
{
    /**
     * @param array<int|string, string|int|float> $bodyParameters
     * @param array<int|string, string|int|float> $headerParameters
     * @param list<array{index:int, parameters:array<int|string, string|int|float>, sub_type?:string}> $buttonParameters
     */
    public function __construct(
        public readonly string $name,
        public readonly string $languageCode,
        public readonly array $bodyParameters = [],
        public readonly array $headerParameters = [],
        public readonly array $buttonParameters = [],
    ) {}
}
