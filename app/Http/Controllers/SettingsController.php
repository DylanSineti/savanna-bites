<?php

namespace App\Http\Controllers;

use App\Models\Restaurant;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    private function restaurant(): Restaurant
    {
        if (app()->bound('restaurant')) {
            return app('restaurant');
        }

        return Restaurant::where('is_active', true)->firstOrFail();
    }

    public function show()
    {
        $r = $this->restaurant();
        return response()->json([
            'restaurant_name'       => $r->name,
            'tagline'               => $r->tagline,
            'whatsapp_phone_id'     => $r->whatsapp_phone_id,
            'whatsapp_token'        => $r->whatsapp_token ? '••••••••••••' . substr($r->whatsapp_token, -4) : '',
            'admin_whatsapp'        => $r->admin_whatsapp,
            'contact_phone'         => $r->contact_phone,
            'business_hours'        => $r->business_hours,
            'paynow_integration_id' => $r->paynow_integration_id,
            'paynow_integration_key'=> $r->paynow_integration_key ? '••••••••' : '',
            'paynow_auth_email'     => $r->paynow_auth_email,
            'verify_token'          => $r->verify_token,
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'restaurant_name'        => ['sometimes', 'string', 'max:255'],
            'tagline'                => ['sometimes', 'nullable', 'string', 'max:255'],
            'whatsapp_phone_id'      => ['sometimes', 'nullable', 'string'],
            'whatsapp_token'         => ['sometimes', 'nullable', 'string'],
            'admin_whatsapp'         => ['sometimes', 'nullable', 'string'],
            'contact_phone'          => ['sometimes', 'nullable', 'string'],
            'business_hours'         => ['sometimes', 'nullable', 'string', 'max:100'],
            'paynow_integration_id'  => ['sometimes', 'nullable', 'string'],
            'paynow_integration_key' => ['sometimes', 'nullable', 'string'],
            'paynow_auth_email'      => ['sometimes', 'nullable', 'email'],
        ]);

        $updates = [];

        if ($request->has('restaurant_name'))      $updates['name']                  = $request->restaurant_name;
        if ($request->has('tagline'))              $updates['tagline']               = $request->tagline;
        if ($request->has('whatsapp_phone_id'))    $updates['whatsapp_phone_id']     = $request->whatsapp_phone_id;
        if ($request->has('admin_whatsapp'))        $updates['admin_whatsapp']        = $request->admin_whatsapp;
        if ($request->has('contact_phone'))         $updates['contact_phone']         = $request->contact_phone;
        if ($request->has('business_hours'))        $updates['business_hours']        = $request->business_hours;
        if ($request->has('paynow_integration_id')) $updates['paynow_integration_id'] = $request->paynow_integration_id;
        if ($request->has('paynow_auth_email'))     $updates['paynow_auth_email']     = $request->paynow_auth_email;

        // Only update secrets when user actually types a new value (not the masked placeholder)
        if ($request->has('whatsapp_token') && !str_starts_with($request->whatsapp_token, '•')) {
            $updates['whatsapp_token'] = $request->whatsapp_token;
        }
        if ($request->has('paynow_integration_key') && !str_starts_with($request->paynow_integration_key, '•')) {
            $updates['paynow_integration_key'] = $request->paynow_integration_key;
        }

        if (!empty($updates)) {
            $this->restaurant()->update($updates);
        }

        return response()->json(['message' => 'Settings saved successfully']);
    }
}