<?php
/**
 * Shared functions: env_load, sign_p24, register_p24, verify_p24,
 * createInvoiceFakturownia, sendInvoiceEmail, and simple mapping.
 */

require __DIR__ . '/vendor/autoload.php';
use Dotenv\Dotenv;

function env_load() {
    \$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
    \$dotenv->load();
}

function sign_p24(array \$p24) {
    return hash('sha384', implode('|', [
        \$p24['merchantId'], \$p24['posId'], \$p24['sessionId'],
        \$p24['amount'], \$p24['currency'], getenv('P24_CRC_KEY')
    ]));
}

function register_p24(array \$p24) {
    \$ch = curl_init('https://sandbox.przelewy24.pl/api/v1/transaction/register');
    curl_setopt_array(\$ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode(\$p24), CURLOPT_RETURNTRANSFER=>true, CURLOPT_HTTPHEADER=>['Content-Type:application/json']]);
    \$res = json_decode(curl_exec(\$ch), true);
    curl_close(\$ch);
    return \$res['data']['data']['token'] ?? null;
}

function verify_p24(array \$input) {
    \$signature = hash('sha384', implode('|', [
        \$input['merchantId'], \$input['posId'], \$input['sessionId'], \$input['amount'], \$input['currency'], getenv('P24_CRC_KEY')
    ]));
    return \$signature === \$input['sign'];
}

function verify_status_p24(array \$input) {
    \$verify = [
        'merchantId'=>\$input['merchantId'], 'posId'=>\$input['posId'],
        'sessionId'=>\$input['sessionId'], 'amount'=>\$input['amount'], 'currency'=>\$input['currency']
    ];
    \$verify['sign'] = hash('sha384', implode('|', array_merge(array_values(\$verify), [getenv('P24_CRC_KEY')])));
    \$ch = curl_init('https://sanbox.przelewy24.pl/api/v1/transaction/verify');
    curl_setopt_array(\$ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode(\$verify), CURLOPT_RETURNTRANSFER=>true, CURLOPT_HTTPHEADER=>['Content-Type:application/json']]);
    \$res = json_decode(curl_exec(\$ch), true);
    curl_close(\$ch);
    return !empty(\$res['data']['data']['status']) && \$res['data']['data']['status']==='success';
}

function createInvoiceFakturownia(array \$data, string \$plan, int \$amount) {
    \$payload = [
        'api_token'=>getenv('FAKT_API_TOKEN'),
        'invoice'=>[
            'kind'=>'vat','sell_date'=>date('Y-m-d'),'issue_date'=>date('Y-m-d'),
            'payment_to'=>date('Y-m-d', strtotime('+7 days')),
            'buyer_name'=>\$data['company_name'],'buyer_tax_no'=>\$data['company_nip'],
            'buyer_street'=>\$data['company_address'],'buyer_post_code'=>\$data['company_zip'],
            'buyer_city'=>\$data['company_city'],'positions'=>[[
                'name'=>\$plan,'tax'=>23,'total_price_gross'=>\$amount/100,'quantity'=>1
            ]]
        ]
    ];
    \$ch = curl_init("https://".getenv('FAKT_DOMAIN').".fakturownia.pl/invoices.json");
    curl_setopt_array(\$ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode(\$payload),CURLOPT_RETURNTRANSFER=>true,CURLOPT_HTTPHEADER=>['Content-Type:application/json']]);
    \$res = json_decode(curl_exec(\$ch), true);
    curl_close(\$ch);
    return \$res['invoice']['id'] ?? null;
}

function sendInvoiceEmail(\$invoiceId) {
    \$ch = curl_init("https://".getenv('FAKT_DOMAIN').".fakturownia.pl/invoices/{$invoiceId}/send_by_email.json");
    curl_setopt_array(\$ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode(['api_token'=>getenv('FAKT_API_TOKEN')]),CURLOPT_RETURNTRANSFER=>true,CURLOPT_HTTPHEADER=>['Content-Type:application/json']]);
    curl_exec(\$ch);
    curl_close(\$ch);
}

function save_mapping(\$sessionId, \$invoiceId) {
    file_put_contents(__DIR__.'/data/invoices/'.\$sessionId.'.json', json_encode(['invoiceId'=>\$invoiceId]));
}

function load_mapping(\$sessionId) {
    \$path = __DIR__.'/data/invoices/'.\$sessionId.'.json';
    return file_exists(\$path) ? json_decode(file_get_contents(\$path), true): null;
}