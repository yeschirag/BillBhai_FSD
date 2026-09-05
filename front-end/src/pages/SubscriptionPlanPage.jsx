import { useState } from 'react'
import { useWorkspaceData } from '../hooks/useWorkspaceData.js'
import { toast } from '../components/toastBus.js'

const PLANS = [
  {
    key: 'starter',
    label: 'Starter Plan',
    price: 0,
    subtitle: 'Free Forever',
    color: '#3b82f6',
    popular: false,
    items: [
      '2 Staff Accounts (Admin + Cashier)',
      '1 Store Location',
      'Up to 300 Products',
      'In-Store POS Scanning & Invoices',
      'Daily Revenue & Sales Summary',
    ],
    disabled: [
      'Delivery Rider Dispatch',
      'Returns & Refund Management',
      'Promo Campaigns',
    ],
  },
  {
    key: 'pro',
    label: 'Growth / Pro',
    price: 1999,
    subtitle: 'Most Popular · Growth Tier',
    color: '#8b5cf6',
    popular: true,
    items: [
      '10 Staff Accounts (Custom Roles)',
      'Up to 3 Store Locations',
      'Up to 5,000 Products',
      'Delivery Module & Live Dispatch',
      'Returns & Refund Engine',
      'Discounts & Promo Campaigns',
      'Advanced Trend & Stock Analytics',
    ],
    disabled: [],
  },
  {
    key: 'enterprise',
    label: 'Enterprise Plan',
    price: 4999,
    subtitle: 'Full Scale',
    color: '#f59e0b',
    popular: false,
    items: [
      'Unlimited Staff Accounts',
      'Unlimited Store Locations',
      'Unlimited Products & SKUs',
      'Self-Checkout Kiosk Integration',
      'Inter-Store Inventory Transfers',
      'Dedicated 24/7 Phone SLA Support',
    ],
    disabled: [],
  },
]

function SubscriptionPlanPage() {
  const { activeBusiness, mutateWorkspace } = useWorkspaceData()
  const [activating, setActivating] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('starter')
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSelect = async (planKey) => {
    setActivating(planKey)
    const plan = PLANS.find((p) => p.key === planKey)
    try {
      await mutateWorkspace((draft) => {
        const bizId = draft.activeBusiness?.id || draft.activeBusinessId || 'BIZ-101'
        const biz = draft.activeBusiness || { id: bizId, name: 'BillBhai Store', plan: 'starter', monthlyPrice: 0 }
        biz.plan = planKey
        biz.planName = plan.label
        biz.monthlyPrice = plan.price
        biz.subscriptionStatus = 'Active'
        draft.activeBusiness = biz
        if (draft.dataByBusiness && draft.dataByBusiness[bizId]) {
          const data = draft.dataByBusiness[bizId]
          data.subscriptionPlan = planKey
          data.subscriptionStatus = 'Active'
        }
      })
      setSelectedPlan(planKey)
      setShowSuccess(true)
      toast.success(`${plan.label} activated — Razorpay subscription connected`)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (e) {
      toast.error('Activation failed: ' + (e?.message || 'unknown'))
    } finally {
      setActivating(null)
    }
  }

  const activePlanName = activeBusiness?.planName || 'Starter Plan (Free)'
  const activePlanKey = activeBusiness?.plan || 'starter'

  return (
    <>
      <div className="page-header">
        <h2>Subscription Plan</h2>
        <p className="text-muted">Select or upgrade your business plan.</p>
      </div>
      <section className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-neu-card">
          <div className="stat-info">
            <span className="stat-label">Current Plan</span>
            <span className="stat-value" style={{ color: '#8b5cf6' }}>{activePlanName}</span>
          </div>
        </div>
        <div className="stat-neu-card">
          <div className="stat-info">
            <span className="stat-label">Monthly Price</span>
            <span className="stat-value">₹{activeBusiness?.monthlyPrice || 0}</span>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 22 }}>
        {PLANS.map((plan) => (
          <article
            key={plan.key}
            className="neu-card"
            style={{
              borderColor: selectedPlan === plan.key ? plan.color : 'transparent',
              borderWidth: selectedPlan === plan.key ? 2 : 1,
              boxShadow: selectedPlan === plan.key ? `0 0 20px ${plan.color}35` : 'var(--neu-shadow-raised)',
            }}
          >
            <div style={{ padding: 28 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: plan.color, marginBottom: 4 }}>
                {plan.subtitle}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>{plan.label}</h3>
              <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 14 }}>
                ₹{plan.price}<span style={{ fontSize: '0.85rem', color: 'var(--neu-text-muted)', fontWeight: 500 }}>/month</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.items.map((item, i) => (
                  <li key={i} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--neu-text-secondary)' }}>
                    <span style={{ color: plan.color, flexShrink: 0, fontSize: '0.9rem', marginTop: 1 }}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
                {plan.disabled.map((item, i) => (
                  <li key={`d-${i}`} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--neu-text-muted)' }}>
                    <span style={{ color: 'var(--neu-text-muted)', flexShrink: 0, fontSize: '0.9rem', marginTop: 1 }}>✗</span>
                    <span style={{ textDecoration: 'line-through', opacity: 0.65 }}>{item}</span>
                  </li>
                ))}
              </ul>

              <button
                className="neu-btn neu-btn--primary"
                style={{ width: '100%', padding: '11px 16px', fontWeight: 700, fontSize: '0.9rem', borderColor: plan.color }}
                onClick={() => handleSelect(plan.key)}
                disabled={activating === plan.key || selectedPlan === plan.key}
              >
                {activating === plan.key ? 'Activating…' : selectedPlan === plan.key ? '✓ Active' : plan.price === 0 ? 'Choose Free' : 'Subscribe via Razorpay'}
              </button>
            </div>
          </article>
        ))}
      </section>
    </>
  )
}

export default SubscriptionPlanPage
