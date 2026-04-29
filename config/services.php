<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'paynow' => [
        'integration_id'  => env('PAYNOW_INTEGRATION_ID'),
        'integration_key' => env('PAYNOW_INTEGRATION_KEY'),
        'auth_email'      => env('PAYNOW_AUTH_EMAIL'),
        'test_phone'      => env('PAYNOW_TEST_PHONE'),
        'result_url'      => env('PAYNOW_RESULT_URL'),
        'return_url'      => env('PAYNOW_RETURN_URL'),
        'mock'            => env('PAYNOW_MOCK', false),
    ],

    'whatsapp' => [
        'token'        => env('WHATSAPP_TOKEN'),
        'phone_id'     => env('WHATSAPP_PHONE_ID'),
        'verify_token' => env('WHATSAPP_VERIFY_TOKEN'),
        'admin_phone'  => env('ADMIN_WHATSAPP'),
    ],

    'savanna_bites' => [
        'shop_lat' => env('SHOP_LAT', -17.830737),
        'shop_lng' => env('SHOP_LNG',  31.049078),
    ],

];
