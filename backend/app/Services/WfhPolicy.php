<?php

namespace App\Services;

final readonly class WfhPolicy
{
    public function __construct(
        public bool $enabled,
        public bool $gpsRequired,
        public bool $photoRequired,
        public bool $approvalRequired,
        public bool $trackingEnabled,
    ) {}
}
