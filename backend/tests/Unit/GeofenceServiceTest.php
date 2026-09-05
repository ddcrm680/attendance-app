<?php

namespace Tests\Unit;

use App\Models\Office;
use App\Services\GeofenceService;
use PHPUnit\Framework\TestCase;

class GeofenceServiceTest extends TestCase
{
    public function test_it_calculates_distance_and_respects_the_office_radius(): void
    {
        $office = new Office([
            'latitude' => '28.6139000',
            'longitude' => '77.2090000',
            'radius' => 200,
        ]);

        $result = (new GeofenceService())->isWithinOffice($office, 28.6140, 77.2090);

        $this->assertTrue($result['inside']);
        $this->assertGreaterThan(0, $result['distance_meters']);
        $this->assertLessThan(200, $result['distance_meters']);
    }

    public function test_boundary_is_inside_and_a_point_beyond_the_radius_is_outside(): void
    {
        $office = new Office(['latitude' => 0, 'longitude' => 0, 'radius' => 10]);
        $service = new GeofenceService();

        $this->assertTrue($service->isWithinOffice($office, 0.000089, 0)['inside']);
        $this->assertFalse($service->isWithinOffice($office, 0.00010, 0)['inside']);
    }
}
