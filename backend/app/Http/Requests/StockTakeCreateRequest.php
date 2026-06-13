<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StockTakeCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'remark' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function attributes(): array
    {
        return [
            'remark' => '备注',
        ];
    }
}
