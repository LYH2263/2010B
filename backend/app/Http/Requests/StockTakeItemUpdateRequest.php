<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StockTakeItemUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'actual_quantity' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function attributes(): array
    {
        return [
            'actual_quantity' => '实盘数量',
        ];
    }
}
