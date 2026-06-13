<?php

namespace App\Http\Controllers;

use App\Services\ProductImportExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductImportExportController extends Controller
{
    public function __construct(
        private ProductImportExportService $importExportService
    ) {}

    public function exportCsv(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $categoryId = $request->query('category_id') ? (int) $request->query('category_id') : null;
        $filters = [];
        $keyword = $request->query('keyword');
        if (is_string($keyword) && trim($keyword) !== '') {
            $filters['keyword'] = trim($keyword);
        }
        $tagIds = $request->query('tag_ids');
        if (is_string($tagIds)) {
            $tagIds = explode(',', $tagIds);
        }
        if (is_array($tagIds)) {
            $filters['tag_ids'] = $tagIds;
        }
        $tagMode = $request->query('tag_mode');
        if (is_string($tagMode) && in_array($tagMode, ['any', 'all'], true)) {
            $filters['tag_mode'] = $tagMode;
        }

        $csv = $this->importExportService->exportCsv($categoryId, $filters);
        $filename = 'products_' . date('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public function downloadTemplate(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $csv = $this->importExportService->generateTemplate();
        $filename = 'product_import_template.csv';

        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public function validateImport(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
        ]);

        $file = $request->file('file');
        $content = $file->get();

        $result = $this->importExportService->validateCsv($content);

        return response()->json($result);
    }

    public function confirmImport(Request $request): JsonResponse
    {
        $request->validate([
            'rows' => ['required', 'array'],
            'rows.*.row_num' => ['required', 'integer'],
            'rows.*.data' => ['required', 'array'],
            'rows.*.valid' => ['required', 'boolean'],
            'rows.*.errors' => ['required', 'array'],
            'strategy' => ['required', 'in:skip_errors,rollback_all'],
        ]);

        try {
            $result = $this->importExportService->importRows(
                $request->input('rows'),
                $request->input('strategy')
            );
            return response()->json($result);
        } catch (\Throwable $e) {
            return response()->json([
                'success_count' => 0,
                'fail_count' => count($request->input('rows')),
                'total' => count($request->input('rows')),
                'failed' => [['row_num' => 0, 'reason' => $e->getMessage()]],
                'rolled_back' => true,
            ], 422);
        }
    }
}
