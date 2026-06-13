<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class ProductImportExportService
{
    const HEADERS = ['名称', 'SKU', '分类', '价格', '库存', '状态'];
    const HEADER_MAP = [
        '名称' => 'name',
        'SKU' => 'sku',
        '分类' => 'category_name',
        '价格' => 'price',
        '库存' => 'stock',
        '状态' => 'status_text',
    ];
    const STATUS_MAP = ['上架' => 1, '下架' => 0, '1' => 1, '0' => 0];

    public function exportCsv(?int $categoryId = null, array $filters = []): string
    {
        $q = Product::with('category')->orderBy('id', 'desc');
        if ($categoryId !== null) {
            $q->where('category_id', $categoryId);
        }
        if (!empty($filters['keyword'])) {
            $kw = trim($filters['keyword']);
            $q->where(function ($query) use ($kw) {
                $query->where('name', 'like', '%' . $kw . '%')
                    ->orWhere('sku', 'like', '%' . $kw . '%');
            });
        }
        if (!empty($filters['tag_ids']) && is_array($filters['tag_ids'])) {
            $tagIds = array_values(array_filter($filters['tag_ids'], 'is_numeric'));
            $tagIds = array_map('intval', $tagIds);
            if (!empty($tagIds)) {
                $mode = $filters['tag_mode'] ?? 'any';
                if ($mode === 'all') {
                    $q->whereHas('tags', function ($subQ) use ($tagIds) {
                        $subQ->whereIn('tags.id', $tagIds);
                    }, '=', count($tagIds));
                } else {
                    $q->whereHas('tags', function ($subQ) use ($tagIds) {
                        $subQ->whereIn('tags.id', $tagIds);
                    });
                }
            }
        }

        $bom = "\xEF\xBB\xBF";
        $lines = [implode(',', self::HEADERS)];

        $q->chunk(200, function ($products) use (&$lines) {
            foreach ($products as $p) {
                $lines[] = implode(',', [
                    $this->csvEscape($p->name),
                    $this->csvEscape($p->sku),
                    $this->csvEscape($p->category?->name ?? ''),
                    $p->price,
                    $p->stock,
                    $p->status ? '上架' : '下架',
                ]);
            }
        });

        return $bom . implode("\n", $lines);
    }

    public function generateTemplate(): string
    {
        $bom = "\xEF\xBB\xBF";
        $example = implode(',', [
            $this->csvEscape('示例商品A'),
            $this->csvEscape('SKU-001'),
            $this->csvEscape('电子产品'),
            '99.00',
            '100',
            $this->csvEscape('上架'),
        ]);
        return $bom . implode(',', self::HEADERS) . "\n" . $example . "\n";
    }

    public function validateCsv(string $content): array
    {
        $lines = $this->parseCsvLines($content);
        if (count($lines) < 2) {
            return ['rows' => [], 'errors' => ['文件至少需要包含表头行和一行数据']];
        }

        $headerLine = array_shift($lines);
        $headers = str_getcsv($headerLine, ',', '"', '\\');
        $headerMap = $this->resolveHeaderMap($headers);
        if ($headerMap === null) {
            return ['rows' => [], 'errors' => ['表头格式不正确，请使用模板导出的格式：' . implode(',', self::HEADERS)]];
        }

        $categories = Category::pluck('id', 'name')->toArray();
        $existingSkus = Product::withTrashed()->pluck('id', 'sku')->toArray();

        $rows = [];
        $csvSkus = [];

        foreach ($lines as $idx => $line) {
            $rowNum = $idx + 2;
            if (trim($line) === '') {
                continue;
            }
            $fields = str_getcsv($line, ',', '"', '\\');
            $row = $this->mapFields($headerMap, $fields);
            $errors = $this->validateRow($row, $categories, $existingSkus, $csvSkus, $rowNum);
            $csvSkus[] = $row['sku'] ?? '';

            $rows[] = [
                'row_num' => $rowNum,
                'data' => $row,
                'valid' => empty($errors),
                'errors' => $errors,
            ];
        }

        return ['rows' => $rows, 'errors' => []];
    }

    public function importRows(array $rows, string $strategy = 'skip_errors'): array
    {
        $successCount = 0;
        $failCount = 0;
        $failDetails = [];

        if ($strategy === 'rollback_all') {
            return DB::transaction(function () use ($rows, &$successCount, &$failCount, &$failDetails) {
                foreach ($rows as $row) {
                    if (!$row['valid']) {
                        $failCount++;
                        $failDetails[] = ['row_num' => $row['row_num'], 'reason' => implode('; ', $row['errors'])];
                        throw new \RuntimeException('第 ' . $row['row_num'] . ' 行存在错误：' . implode('; ', $row['errors']));
                    }
                    try {
                        $this->createProductFromRow($row['data']);
                        $successCount++;
                    } catch (\Throwable $e) {
                        throw new \RuntimeException('第 ' . $row['row_num'] . ' 行导入失败：' . $e->getMessage());
                    }
                }
                return [
                    'success_count' => $successCount,
                    'fail_count' => 0,
                    'total' => $successCount + $failCount,
                    'failed' => [],
                ];
            });
        }

        DB::transaction(function () use ($rows, &$successCount, &$failCount, &$failDetails) {
            foreach ($rows as $row) {
                if (!$row['valid']) {
                    $failCount++;
                    $failDetails[] = ['row_num' => $row['row_num'], 'reason' => implode('; ', $row['errors'])];
                    continue;
                }
                try {
                    $this->createProductFromRow($row['data']);
                    $successCount++;
                } catch (\Throwable $e) {
                    $failCount++;
                    $failDetails[] = ['row_num' => $row['row_num'], 'reason' => $e->getMessage()];
                }
            }
        });

        return [
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'total' => count($rows),
            'failed' => $failDetails,
        ];
    }

    private function createProductFromRow(array $data): Product
    {
        $categories = Category::pluck('id', 'name')->toArray();
        $categoryId = $categories[$data['category_name'] ?? ''] ?? null;
        $status = self::STATUS_MAP[$data['status_text'] ?? ''] ?? 1;

        return Product::create([
            'name' => $data['name'],
            'sku' => $data['sku'],
            'category_id' => $categoryId,
            'price' => $data['price'],
            'stock' => (int) ($data['stock'] ?? 0),
            'status' => $status,
        ]);
    }

    private function validateRow(array $row, array $categories, array $existingSkus, array $csvSkus, int $rowNum): array
    {
        $errors = [];

        if (empty($row['name'])) {
            $errors[] = '名称不能为空';
        }
        if (empty($row['sku'])) {
            $errors[] = 'SKU不能为空';
        } else {
            if (isset($existingSkus[$row['sku']])) {
                $errors[] = 'SKU「' . $row['sku'] . '」已存在';
            }
            $previousOcc = array_filter($csvSkus, function ($s) use ($row) {
                return $s === $row['sku'];
            });
            if (count($previousOcc) > 0) {
                $errors[] = 'SKU「' . $row['sku'] . '」在文件中重复';
            }
        }

        if (isset($row['price']) && $row['price'] !== '') {
            if (!is_numeric($row['price']) || (float) $row['price'] < 0) {
                $errors[] = '价格必须为非负数字';
            }
        } else {
            $errors[] = '价格不能为空';
        }

        if (isset($row['stock']) && $row['stock'] !== '') {
            if (!is_numeric($row['stock']) || (int) $row['stock'] < 0) {
                $errors[] = '库存必须为非负整数';
            }
        } else {
            $errors[] = '库存不能为空';
        }

        if (!empty($row['category_name'])) {
            if (!isset($categories[$row['category_name']])) {
                $errors[] = '分类「' . $row['category_name'] . '」不存在';
            }
        }

        $statusText = $row['status_text'] ?? '';
        if ($statusText !== '' && !isset(self::STATUS_MAP[$statusText])) {
            $errors[] = '状态值「' . $statusText . '」不合法，应为「上架」或「下架」';
        }

        return $errors;
    }

    private function resolveHeaderMap(array $headers): ?array
    {
        $map = [];
        $normalizedHeaders = array_map('trim', $headers);
        foreach (self::HEADER_MAP as $cn => $field) {
            $idx = array_search($cn, $normalizedHeaders);
            if ($idx === false) {
                $altMap = ['名称' => ['名称', 'name', '商品名称', '商品名'], 'SKU' => ['SKU', 'sku', '编码'], '分类' => ['分类', 'category', '分类名称'], '价格' => ['价格', 'price', '单价'], '库存' => ['库存', 'stock', '库存数量'], '状态' => ['状态', 'status']];
                foreach ($altMap[$cn] as $alt) {
                    $idx = array_search($alt, $normalizedHeaders);
                    if ($idx !== false) break;
                }
            }
            if ($idx === false) {
                return null;
            }
            $map[$field] = (int) $idx;
        }
        return $map;
    }

    private function mapFields(array $headerMap, array $fields): array
    {
        $row = [];
        foreach ($headerMap as $field => $idx) {
            $row[$field] = isset($fields[$idx]) ? trim($fields[$idx]) : '';
        }
        return $row;
    }

    private function parseCsvLines(string $content): array
    {
        $content = str_replace(["\r\n", "\r"], "\n", $content);
        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3);
        }
        return explode("\n", $content);
    }

    private function csvEscape(string $value): string
    {
        if (preg_match('/[,"\n\r]/', $value)) {
            return '"' . str_replace('"', '""', $value) . '"';
        }
        return $value;
    }
}
