<?php

namespace app\common\library\campus;

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Excel 导出
 */
class ExportService
{
    /**
     * @param string $filename
     * @param array  $headers 表头 ['字段'=>'标题', ...]
     * @param array  $rows
     */
    public static function download($filename, array $headers, array $rows)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $col = 1;
        foreach ($headers as $title) {
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($col) . '1', $title);
            $col++;
        }
        $rowNum = 2;
        foreach ($rows as $row) {
            $col = 1;
            foreach (array_keys($headers) as $field) {
                $value = is_array($row) ? ($row[$field] ?? '') : ($row->$field ?? '');
                $cell = Coordinate::stringFromColumnIndex($col) . $rowNum;
                $sheet->setCellValue($cell, $value);
                $col++;
            }
            $rowNum++;
        }
        if (ob_get_length()) {
            ob_end_clean();
        }
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="' . $filename . '.xlsx"');
        header('Cache-Control: max-age=0');
        $writer = new Xlsx($spreadsheet);
        $writer->save('php://output');
        exit;
    }
}
