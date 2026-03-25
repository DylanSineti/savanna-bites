<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function show()
    {
        return response()->json([
            'restaurant_name'    => env('RESTAURANT_NAME', 'Savanna Bites'),
            'whatsapp_phone_id'  => env('WHATSAPP_PHONE_ID'),
            'whatsapp_token'     => '••••••••••••' . substr(env('WHATSAPP_TOKEN', ''), -4),
            'admin_whatsapp'     => env('ADMIN_WHATSAPP'),
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'restaurant_name'   => ['sometimes', 'string', 'max:255'],
            'whatsapp_phone_id' => ['sometimes', 'string'],
            'whatsapp_token'    => ['sometimes', 'string'],
            'admin_whatsapp'    => ['sometimes', 'string'],
        ]);

        $env  = base_path('.env');
        $data = file_get_contents($env);

        $updates = [
            'RESTAURANT_NAME'    => $request->restaurant_name,
            'WHATSAPP_PHONE_ID'  => $request->whatsapp_phone_id,
            'ADMIN_WHATSAPP'     => $request->admin_whatsapp,
        ];

        if ($request->whatsapp_token && !str_starts_with($request->whatsapp_token, '••')) {
            $updates['WHATSAPP_TOKEN'] = $request->whatsapp_token;
        }

        foreach ($updates as $key => $value) {
            if ($value) {
                $data = preg_replace("/^{$key}=.*/m", "{$key}={$value}", $data);
            }
        }

        file_put_contents($env, $data);

        return response()->json(['message' => 'Settings saved successfully']);
    }
}