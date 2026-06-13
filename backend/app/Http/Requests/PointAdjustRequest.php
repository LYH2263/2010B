<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PointAdjustRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'delta' => ['required', 'integer', 'not_in:0'],
            'reason' => ['required', 'string', 'max:255'],
        ];
    }

    public function attributes(): array
    {
        return [
            'delta' => '调整积分',
            'reason' => '调整原因',
        ];
    }
}
