const crypto = require('crypto');
const User = require('../models/User');

const PLAN_PRICES = {
  monthly: 29900,
  yearly: 249900,
};

const createMockOrder = (plan) => ({
  id: `mock_order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
  amount: PLAN_PRICES[plan],
  currency: 'INR',
  plan,
});

// POST /api/payment/create-order
exports.createOrder = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({ error: 'Invalid payment plan' });
    }

    const user = await User.findById(req.user.id).select('_id is_premium').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_premium) {
      return res.status(400).json({ error: 'Premium is already active' });
    }

    res.json({
      mock: true,
      key: process.env.RAZORPAY_KEY_ID || 'mock_razorpay_key',
      order: createMockOrder(plan),
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};

// POST /api/payment/verify
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ error: 'Payment details are required' });
    }

    if (!razorpay_order_id.startsWith('mock_order_') || !razorpay_payment_id.startsWith('mock_pay_')) {
      return res.status(400).json({ error: 'Payment verification is not configured for live payments' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { is_premium: true },
      { new: true, runValidators: true }
    ).select('_id name email is_premium analysis_count max_free_analyses created_at');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Premium activated successfully',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        is_premium: user.is_premium,
        analysis_count: user.analysis_count,
        max_free_analyses: user.max_free_analyses,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};
