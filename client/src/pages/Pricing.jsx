import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FiCheck, FiX, FiZap, FiStar } from 'react-icons/fi';

const plans = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    features: [
      { text: '15 resume analyses', included: true },
      { text: 'AI-powered scoring', included: true },
      { text: 'Skill extraction', included: true },
      { text: 'ATS compatibility check', included: true },
      { text: 'Basic suggestions', included: true },
      { text: 'Unlimited analyses', included: false },
      { text: 'Priority AI analysis', included: false },
      { text: 'Career recommendations', included: false },
    ],
    cta: 'Current Plan',
    popular: false,
  },
  {
    name: 'Pro Monthly',
    price: '₹299',
    period: '/month',
    plan: 'monthly',
    features: [
      { text: 'Unlimited analyses', included: true },
      { text: 'AI-powered scoring', included: true },
      { text: 'Advanced skill extraction', included: true },
      { text: 'ATS compatibility check', included: true },
      { text: 'Detailed suggestions', included: true },
      { text: 'Career recommendations', included: true },
      { text: 'Priority AI analysis', included: true },
      { text: 'Export reports as PDF', included: true },
    ],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    name: 'Pro Yearly',
    price: '₹2,499',
    period: '/year',
    plan: 'yearly',
    features: [
      { text: 'Everything in Monthly', included: true },
      { text: 'Save ₹1,089/year', included: true },
      { text: 'Unlimited analyses', included: true },
      { text: 'Priority AI analysis', included: true },
      { text: 'Career recommendations', included: true },
      { text: 'Export reports as PDF', included: true },
      { text: 'Early access to features', included: true },
      { text: 'Priority support', included: true },
    ],
    cta: 'Best Value',
    popular: false,
  },
];

export default function Pricing() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (plan) => {
    if (!user) {
      window.location.href = '/signup';
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/payment/create-order', { plan });
      const { order, key, mock } = res.data;

      if (mock) {
        // Mock payment for testing
        await api.post('/payment/verify', {
          razorpay_order_id: order.id,
          razorpay_payment_id: 'mock_pay_' + Date.now(),
          razorpay_signature: 'mock_sig',
        });
        alert('🎉 Premium activated! (Mock mode)');
        refreshUser();
      } else {
        // Real Razorpay checkout
        const options = {
          key,
          amount: order.amount,
          currency: order.currency,
          name: 'ResumeAI',
          description: `${plan} Premium Plan`,
          order_id: order.id,
          handler: async (response) => {
            try {
              await api.post('/payment/verify', response);
              alert('🎉 Premium activated!');
              refreshUser();
            } catch (err) {
              alert('Payment verification failed.');
            }
          },
          prefill: { name: user.name, email: user.email },
          theme: { color: '#6c63ff' },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Payment failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pricing">
      <div className="container">
        <div className="pricing-header animate-fade-in-up">
          <h1>Simple, Transparent <span className="text-gradient">Pricing</span></h1>
          <p>Start free, upgrade when you need more.</p>
        </div>

        <div className="pricing-grid animate-fade-in-up stagger-1">
          {plans.map((p, i) => (
            <div key={i} className={`pricing-card glass-card ${p.popular ? 'pricing-card-popular' : ''}`}>
              {p.popular && <div className="pricing-popular-badge"><FiStar size={12} /> Most Popular</div>}
              <h3 className="pricing-plan-name">{p.name}</h3>
              <div className="pricing-price">
                <span className="pricing-amount">{p.price}</span>
                <span className="pricing-period">{p.period}</span>
              </div>

              <ul className="pricing-features">
                {p.features.map((f, j) => (
                  <li key={j} className={f.included ? '' : 'pricing-feature-disabled'}>
                    {f.included ? <FiCheck className="pricing-feature-icon-yes" /> : <FiX className="pricing-feature-icon-no" />}
                    {f.text}
                  </li>
                ))}
              </ul>

              {p.plan ? (
                <button className={`btn ${p.popular ? 'btn-primary' : 'btn-secondary'} pricing-cta`}
                  onClick={() => handleUpgrade(p.plan)} disabled={loading || user?.is_premium}>
                  {user?.is_premium ? '✓ Active' : loading ? 'Processing...' : p.cta}
                </button>
              ) : (
                <button className="btn btn-ghost pricing-cta" disabled>
                  {p.cta}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
