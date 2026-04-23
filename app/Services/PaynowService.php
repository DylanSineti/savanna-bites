<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Restaurant;
use Illuminate\Support\Facades\Log;
use Paynow\Payments\Paynow;
use Paynow\Util\Hash;

class PaynowService
{
    private Paynow $paynow;
    private bool $mockMode;
    private string $integrationKey;
    private Restaurant $restaurant;

    public function __construct()
    {
        // If a restaurant is already bound (webhook context), use its Paynow credentials.
        // Otherwise fall back to the global config (e.g. PaymentController callbacks).
        if (app()->bound('restaurant')) {
            $this->restaurant = app('restaurant');
        }

        $this->mockMode = config('services.paynow.mock', false);

        $integrationId  = $this->restaurantConfig('paynow_integration_id', 'services.paynow.integration_id');
        $this->integrationKey = $this->restaurantConfig('paynow_integration_key', 'services.paynow.integration_key');

        $this->paynow = new Paynow(
            $integrationId,
            $this->integrationKey,
            config('services.paynow.return_url', ''),
            config('services.paynow.result_url', ''),
        );
    }

    /** Resolve a value from the restaurant model first, then fall back to global config. */
    private function restaurantConfig(string $restaurantField, string $configKey): string
    {
        if (isset($this->restaurant) && !empty($this->restaurant->{$restaurantField})) {
            return (string) $this->restaurant->{$restaurantField};
        }
        return (string) config($configKey, '');
    }

    /**
     * Initiate an EcoCash USSD push for the given order.
     * Returns ['success' => true, 'pollUrl' => '...', 'reference' => '...']
     *      or ['success' => false, 'error' => '...'].
     */
    public function initiateEcocash(Order $order, string $mobileNumber): array
    {
        $normalised = $this->normalisePhone($mobileNumber);

        if (!$normalised) {
            return [
                'success' => false,
                'error'   => 'Invalid EcoCash number. Please enter a valid Zimbabwe number (e.g. 0771234567).',
            ];
        }

        if ($this->mockMode) {
            return [
                'success'   => true,
                'pollUrl'   => 'mock://paynow/poll/' . $order->id,
                'reference' => 'MOCK-' . $order->id,
            ];
        }

        try {
            // Paynow requires the merchant's registered email for mobile payments
            $authEmail = isset($this->restaurant) && $this->restaurant->paynow_auth_email
                ? $this->restaurant->paynow_auth_email
                : config('services.paynow.auth_email', 'pay@example.com');

            $restaurantName = isset($this->restaurant) ? $this->restaurant->name : config('app.name', 'Restaurant');

            // In test mode Paynow only accepts special test numbers; use the override if set
            $testPhone = config('services.paynow.test_phone');
            $sendPhone = $testPhone ?: $normalised;

            $payment = $this->paynow->createPayment('Order #' . $order->id, $authEmail);
            $payment->add($restaurantName . ' Order #' . $order->id, (float) $order->total);

            $response = $this->paynow->sendMobile($payment, $sendPhone, 'ecocash');

            Log::info('Paynow sendMobile response', [
                'success' => $response->success(),
                'status'  => $response->status,
                'data'    => $response->data(),
            ]);

            if (!$response->success()) {
                $errData = $response->data();
                $errMsg  = $errData['error'] ?? 'Failed to initiate EcoCash payment. Please try again.';
                return ['success' => false, 'error' => $errMsg];
            }

            return [
                'success'   => true,
                'pollUrl'   => $response->pollUrl(),
                'reference' => 'Order #' . $order->id,
            ];
        } catch (\Throwable $e) {
            Log::error('Paynow initiateEcocash exception', [
                'message' => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
            ]);
            return [
                'success' => false,
                'error'   => 'Could not reach payment gateway. Please try again.',
            ];
        }
    }

    /**
     * Verify the hash on a Paynow result/status callback POST.
     */
    public function verifyResultHash(array $data): bool
    {
        if (!isset($data['hash'])) {
            return false;
        }

        return Hash::verify($data, strtolower($this->integrationKey));
    }

    /**
     * Normalise a Zimbabwean phone number to local 10-digit format (07XXXXXXXX).
     */
    private function normalisePhone(string $phone): ?string
    {
        $digits = preg_replace('/\D/', '', $phone);

        // +263 or 263 prefix → strip to local
        if (str_starts_with($digits, '263') && strlen($digits) === 12) {
            $digits = '0' . substr($digits, 3);
        }

        if (preg_match('/^07[1-9]\d{7}$/', $digits)) {
            return $digits;
        }

        return null;
    }
}
