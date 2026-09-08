<?php

namespace App\Services\WhatsApp;

/** Provider-neutral representation of a future Meta template message. */
class WhatsAppTemplate
{
    /**
     * @param list<string|int|float> $bodyParameters
     * @param list<string|int|float> $headerParameters
     * @param list<array{index:int, parameters:list<string|int|float>, sub_type?:string}> $buttonParameters
     */
    public function __construct(
        public readonly string $name,
        public readonly string $languageCode,
        public readonly array $bodyParameters = [],
        public readonly array $headerParameters = [],
        public readonly array $buttonParameters = [],
    ) {}
}
