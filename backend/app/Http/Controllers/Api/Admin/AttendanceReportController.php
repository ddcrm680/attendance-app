<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Services\AttendanceReportService;
use Dompdf\Dompdf;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AttendanceReportController extends Controller
{
    public function __construct(private AttendanceReportService $reports) {}

    private function filters(Request $request): array
    {
        return $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'office_id' => ['nullable', 'integer', 'exists:offices,id'],
            'status' => ['nullable', 'in:present,late,half_day,partial,absent,work_from_home'],
            'mode' => ['nullable', 'in:office,wfh'],
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', 'in:attendance_date,working_minutes,late_minutes'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
    }

    public function index(Request $request)
    {
        $filters = $this->filters($request);

        return response()->json(
            $this->reports->query($filters)->paginate($filters['per_page'] ?? 25)
        );
    }

    public function show(Attendance $attendance)
    {
        return response()->json($attendance->load([
            'employee.department',
            'office',
            'locationLogs' => fn ($query) => $query
                ->latest('recorded_at')
                ->limit(1),
        ]));
    }

    public function export(Request $request, string $format)
    {
        abort_unless(in_array($format, ['csv', 'xlsx', 'pdf'], true), 404);

        $filters = $this->filters($request);
        $rows = $this->reports
            ->query($filters)
            ->limit(10000)
            ->get()
            ->map(fn ($attendance) => $this->reports->row($attendance))
            ->values();

        if ($format === 'csv') {
            return response()->streamDownload(function () use ($rows) {
                $output = fopen('php://output', 'w');

                if ($rows->isNotEmpty()) {
                    fputcsv($output, array_keys($rows[0]));

                    foreach ($rows as $row) {
                        fputcsv($output, $row);
                    }
                }

                fclose($output);
            }, 'attendance-report.csv', ['Content-Type' => 'text/csv']);
        }

        if ($format === 'xlsx') {
            return response()->streamDownload(function () use ($rows) {
                $sheet = (new Spreadsheet)->getActiveSheet();
                $headers = array_keys($rows->first() ?? ['date' => 'Date']);

                $sheet->fromArray($headers, null, 'A1');

                foreach ($rows as $index => $row) {
                    $sheet->fromArray(array_values($row), null, 'A'.($index + 2));
                }

                foreach (range('A', chr(64 + count($headers))) as $column) {
                    $sheet->getColumnDimension($column)->setAutoSize(true);
                }

                (new Xlsx($sheet->getParent()))->save('php://output');
            }, 'attendance-report.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ]);
        }

        $headers = array_keys($rows->first() ?? ['date' => 'Date']);
        $headerCells = implode('', array_map(
            fn ($header) => '<th>'.htmlspecialchars($header).'</th>',
            $headers
        ));
        $bodyRows = $rows->map(function ($row) {
            $cells = implode('', array_map(
                fn ($value) => '<td>'.htmlspecialchars((string) $value).'</td>',
                $row
            ));

            return '<tr>'.$cells.'</tr>';
        })->all();
        $html = '<h1>Attendance report</h1><table><tr>'.$headerCells.'</tr>'
            .implode('', $bodyRows)
            .'</table>';

        $pdf = new Dompdf;
        $pdf->loadHtml(
            '<style>body{font:9px sans-serif}table{border-collapse:collapse;width:100%}'
            .'td,th{border:1px solid #555;padding:3px}</style>'.$html
        );
        $pdf->setPaper('A4', 'landscape');
        $pdf->render();

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="attendance-report.pdf"',
        ]);
    }
}
