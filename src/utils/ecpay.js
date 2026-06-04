const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

const MERCHANT_ID = process.env.ECPAY_MERCHANT_ID || '3002607';
const HASH_KEY = process.env.ECPAY_HASH_KEY || 'pwFHCqoQZGmho4w6';
const HASH_IV = process.env.ECPAY_HASH_IV || 'EkRm7iFT261dpevs';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const IS_STAGING = (process.env.ECPAY_ENV || 'staging') !== 'production';

const ECPAY_HOST = IS_STAGING ? 'payment-stage.ecpay.com.tw' : 'payment.ecpay.com.tw';
const CHECKOUT_URL = `https://${ECPAY_HOST}/Cashier/AioCheckOut/V5`;
const QUERY_URL = `https://${ECPAY_HOST}/Cashier/QueryTradeInfo/V5`;

// ECPay 專用 URL encode（CMV-SHA256 用，不可與 AES encode 混用）
// 來源：guides/13-checkmacvalue.md §Node.js（line 202-262）
function ecpayUrlEncode(source) {
  let encoded = encodeURIComponent(source)
    .replace(/%20/g, '+')
    .replace(/~/g, '%7e')
    .replace(/'/g, '%27');
  encoded = encoded.toLowerCase();
  const replacements = {
    '%2d': '-', '%5f': '_', '%2e': '.', '%21': '!',
    '%2a': '*', '%28': '(', '%29': ')',
  };
  for (const [old, char] of Object.entries(replacements)) {
    encoded = encoded.split(old).join(char);
  }
  return encoded;
}

function generateCheckMacValue(params) {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([k]) => k !== 'CheckMacValue')
  );
  const sorted = Object.keys(filtered).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const paramStr = sorted.map(k => `${k}=${filtered[k]}`).join('&');
  const raw = `HashKey=${HASH_KEY}&${paramStr}&HashIV=${HASH_IV}`;
  const encoded = ecpayUrlEncode(raw);
  return crypto.createHash('sha256').update(encoded, 'utf8').digest('hex').toUpperCase();
}

function verifyCheckMacValue(params) {
  const received = params.CheckMacValue || '';
  const calculated = generateCheckMacValue(params);
  const a = Buffer.from(received.toUpperCase());
  const b = Buffer.from(calculated);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// MerchantTradeNo：20 字元英數字，EC + 10 位時間戳 + 8 位隨機
function generateMerchantTradeNo() {
  const ts = Date.now().toString().slice(-10);
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `EC${ts}${rand}`;
}

// 取台灣時間 yyyy/MM/dd HH:mm:ss（ECPay 要求 UTC+8）
function getTaiwanDateString() {
  const now = new Date();
  const twOffset = 8 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const tw = new Date(utc + twOffset * 60000);
  const pad = n => String(n).padStart(2, '0');
  return `${tw.getFullYear()}/${pad(tw.getMonth() + 1)}/${pad(tw.getDate())} ${pad(tw.getHours())}:${pad(tw.getMinutes())}:${pad(tw.getSeconds())}`;
}

function buildCheckoutParams(order, items, merchantTradeNo) {
  // ItemName：多項以 # 分隔，截斷至 200 字元防掉單
  // 不含 echo/curl/wget 等 WAF 關鍵字（商品名稱為花卉，安全）
  let itemName = items
    .map(i => `${i.product_name} x${i.quantity}`)
    .join('#');
  if (itemName.length > 200) {
    itemName = itemName.substring(0, 197) + '...';
  }

  const params = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: getTaiwanDateString(),
    PaymentType: 'aio',
    TotalAmount: String(order.total_amount),
    TradeDesc: '花卉電商訂單',
    ItemName: itemName,
    ReturnURL: `${BASE_URL}/api/ecpay/notify`,
    ClientBackURL: `${BASE_URL}/payment/complete?orderId=${order.id}`,
    ChoosePayment: 'ALL',
    EncryptType: '1',
  };

  params.CheckMacValue = generateCheckMacValue(params);
  return params;
}

function buildAutoSubmitForm(params) {
  const fields = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`)
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>導向綠界付款頁...</title></head>
<body>
<form id="ecpay-form" method="POST" action="${CHECKOUT_URL}">
${fields}
</form>
<script>document.getElementById('ecpay-form').submit();</script>
</body>
</html>`;
}

// 主動查詢 ECPay 訂單狀態，回傳解析後的物件
// QueryTradeInfo TimeStamp 有效期僅 3 分鐘，每次呼叫前重新產生
function queryTradeInfo(merchantTradeNo) {
  const params = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: merchantTradeNo,
    TimeStamp: String(Math.floor(Date.now() / 1000)),
  };
  params.CheckMacValue = generateCheckMacValue(params);

  const postData = querystring.stringify(params);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: ECPAY_HOST,
      path: '/Cashier/QueryTradeInfo/V5',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const parsed = querystring.parse(data);
        resolve(parsed);
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

module.exports = {
  generateMerchantTradeNo,
  buildCheckoutParams,
  buildAutoSubmitForm,
  queryTradeInfo,
  verifyCheckMacValue,
};
