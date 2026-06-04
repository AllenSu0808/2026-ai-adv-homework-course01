const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');
const {
  generateMerchantTradeNo,
  buildCheckoutParams,
  buildAutoSubmitForm,
  queryTradeInfo,
  verifyCheckMacValue,
} = require('../utils/ecpay');

const router = express.Router();

/**
 * @openapi
 * /api/ecpay/checkout/{orderId}:
 *   post:
 *     summary: 建立 ECPay 綠界付款交易，回傳 HTML auto-submit form
 *     tags: [ECPay]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功，回傳 HTML form
 *       400:
 *         description: 訂單狀態不是 pending 或已有付款記錄
 *       404:
 *         description: 訂單不存在
 */
router.post('/checkout/:orderId', authMiddleware, (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.userId;

  const order = db.prepare(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?'
  ).get(orderId, userId);

  if (!order) {
    return res.status(404).json({ data: null, error: 'NOT_FOUND', message: '訂單不存在' });
  }

  if (order.status !== 'pending') {
    return res.status(400).json({
      data: null,
      error: 'INVALID_STATUS',
      message: '訂單狀態不是 pending，無法付款',
    });
  }

  const items = db.prepare(
    'SELECT product_name, product_price, quantity FROM order_items WHERE order_id = ?'
  ).all(orderId);

  const merchantTradeNo = generateMerchantTradeNo();

  db.prepare(
    'UPDATE orders SET ecpay_merchant_trade_no = ? WHERE id = ?'
  ).run(merchantTradeNo, orderId);

  const params = buildCheckoutParams(order, items, merchantTradeNo);
  const form = buildAutoSubmitForm(params);

  res.json({ data: { form }, error: null, message: '跳轉至綠界付款頁' });
});

/**
 * @openapi
 * /api/ecpay/status/{orderId}:
 *   get:
 *     summary: 主動查詢 ECPay 付款狀態（QueryTradeInfo）
 *     tags: [ECPay]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 查詢成功
 *       400:
 *         description: 尚未建立 ECPay 交易
 *       404:
 *         description: 訂單不存在
 */
router.get('/status/:orderId', authMiddleware, async (req, res, next) => {
  const { orderId } = req.params;
  const userId = req.user.userId;

  const order = db.prepare(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?'
  ).get(orderId, userId);

  if (!order) {
    return res.status(404).json({ data: null, error: 'NOT_FOUND', message: '訂單不存在' });
  }

  if (!order.ecpay_merchant_trade_no) {
    return res.status(400).json({
      data: null,
      error: 'NO_ECPAY_TRADE',
      message: '此訂單尚未建立綠界付款交易',
    });
  }

  try {
    const result = await queryTradeInfo(order.ecpay_merchant_trade_no);

    const paid = result.TradeStatus === '1';

    if (paid && order.status === 'pending') {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('paid', orderId);
    }

    const currentOrder = db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId);

    res.json({
      data: {
        status: currentOrder.status,
        paid,
        tradeStatus: result.TradeStatus,
        merchantTradeNo: order.ecpay_merchant_trade_no,
      },
      error: null,
      message: paid ? '付款成功' : '尚未完成付款',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/ecpay/notify:
 *   post:
 *     summary: ECPay ReturnURL（Server Notify stub，localhost 環境收不到）
 *     tags: [ECPay]
 *     responses:
 *       200:
 *         description: 1|OK
 */
router.post('/notify', (req, res) => {
  const params = req.body;

  if (!verifyCheckMacValue(params)) {
    return res.type('text').send('1|OK');
  }

  if (params.RtnCode === '1' && params.MerchantTradeNo) {
    const order = db.prepare(
      'SELECT id, status FROM orders WHERE ecpay_merchant_trade_no = ?'
    ).get(params.MerchantTradeNo);

    if (order && order.status === 'pending') {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('paid', order.id);
    }
  }

  res.type('text').send('1|OK');
});

module.exports = router;
