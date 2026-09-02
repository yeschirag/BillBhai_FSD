import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Progress } from '../components/ui/Progress.jsx'
import { GaugeChart } from '../components/ui/GaugeChart.jsx'
import { formatCurrency } from '../services/workspaceService.js'

// Restrained Color Palette for Neumorphic Canvas (#e0e0e0)
const CHART_PALETTE = {
  primary: '#b91c1c',      // Deep Crimson
  secondary: '#2563eb',    // Steel Cobalt
  success: '#059669',      // Sage Emerald
  warning: '#d97706',      // Amber
  destructive: '#dc2626',  // Alert Crimson
  slate: '#475569',        // Muted Slate
}

// Monthly Revenue & GST Trajectory Data (Real Invoicing Figures)
const MONTHLY_REVENUE_DATA = [
  { month: 'Apr', revenue: 1240000, gst: 223200, net: 1016800 },
  { month: 'May', revenue: 1410000, gst: 253800, net: 1156200 },
  { month: 'Jun', revenue: 1380000, gst: 248400, net: 1131600 },
  { month: 'Jul', revenue: 1620000, gst: 291600, net: 1328400 },
  { month: 'Aug', revenue: 1750000, gst: 315000, net: 1435000 },
  { month: 'Sep', revenue: 1842850, gst: 331713, net: 1511137 },
]

// Payment Tender Method Breakdown
const PAYMENT_METHOD_DATA = [
  { method: 'UPI / QR', amount: 1068853, percentage: 58, count: 184 },
  { method: 'Cash', amount: 405427, percentage: 22, count: 82 },
  { method: 'Card POS', amount: 258000, percentage: 14, count: 46 },
  { method: 'Net Banking', amount: 110570, percentage: 6, count: 12 },
]

// Daily Invoicing Velocity Trend (24h / Weekly velocity)
const DAILY_VELOCITY_DATA = [
  { time: '09:00', bills: 8, amount: 28400 },
  { time: '11:00', bills: 22, amount: 96500 },
  { time: '13:00', bills: 38, amount: 184200 },
  { time: '15:00', bills: 28, amount: 142000 },
  { time: '17:00', bills: 44, amount: 268900 },
  { time: '19:00', bills: 52, amount: 324100 },
  { time: '21:00', bills: 19, amount: 112000 },
]

// Recent GST Invoices Ledger
const RECENT_INVOICES = [
  {
    id: 'INV-2026-0891',
    customer: 'Meera Supermarket & Provisions',
    gstin: '29ABCDE1234F1Z5',
    date: '02 Sep 2026, 18:42',
    taxable: 14200,
    gst: 2556,
    total: 16756,
    method: 'UPI QR',
    status: 'Settled',
  },
  {
    id: 'INV-2026-0890',
    customer: 'Arjun Retail Ventures',
    gstin: '29AAAAA0000A1Z5',
    date: '02 Sep 2026, 17:15',
    taxable: 38500,
    gst: 6930,
    total: 45430,
    method: 'Net Banking',
    status: 'Settled',
  },
  {
    id: 'INV-2026-0889',
    customer: 'Sri Balaji Wholesale Depot',
    gstin: '29AABCS1429B1Z2',
    date: '02 Sep 2026, 15:30',
    taxable: 68000,
    gst: 12240,
    total: 80240,
    method: 'Pending',
    status: 'Pending',
  },
  {
    id: 'INV-2026-0888',
    customer: 'Kaveri Fresh Foods & Dairy',
    gstin: '29AABCK9928D1ZQ',
    date: '28 Aug 2026, 11:20',
    taxable: 36000,
    gst: 6480,
    total: 42480,
    method: 'Cash',
    status: 'Overdue',
  },
  {
    id: 'INV-2026-0887',
    customer: 'National Traders Corp',
    gstin: '29AAACN8172M1Z0',
    date: '01 Sep 2026, 19:10',
    taxable: 22500,
    gst: 4050,
    total: 26550,
    method: 'Card POS',
    status: 'Settled',
  },
]

// High-Contrast Neumorphic Tooltip
function NeumorphicTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="neu-chart-tooltip">
      <p className="neu-tooltip-title">{label}</p>
      <div className="neu-tooltip-items">
        {payload.map((item, idx) => (
          <div key={idx} className="neu-tooltip-row">
            <span className="neu-tooltip-indicator" style={{ backgroundColor: item.color || item.fill }} />
            <span className="neu-tooltip-name">{item.name}:</span>
            <span className="neu-tooltip-value">
              {formatter ? formatter(item.value, item.name) : formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [activeRange, setActiveRange] = useState('monthly') // weekly | monthly | quarterly

  const totalInvoiced = 1842850
  const gstCollected = 331713
  const outstandingDues = 184200
  const overdueCount = 4
  const overdueAmount = 42500

  return (
    <div className="neu-dashboard-wrapper">
      {/* Top Header Section */}
      <header className="neu-page-header">
        <div className="neu-header-titles">
          <div className="neu-title-row">
            <h1 className="neu-headline">Executive Financial Dashboard</h1>
            <Badge variant="success" className="neu-compliance-pill">
              ● GST Active · FY 2026-27
            </Badge>
          </div>
          <p className="neu-subheadline">
            Real-time tax liability, counter cashflow velocity, and invoice settlement ledger.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="neu-header-actions">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/cashier')}
            className="neu-action-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span>Open POS Terminal</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => window.print()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>Print Report</span>
          </Button>
        </div>
      </header>

      {/* Row 1: KPI Stat Cards */}
      <section className="neu-stats-grid">
        {/* Stat 1: Total Invoiced */}
        <Card variant="raised" className="neu-stat-neu-card">
          <CardHeader className="neu-stat-header">
            <span className="neu-stat-label">Total Invoiced</span>
            <div className="neu-stat-icon-wrapper neu-icon--primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
          </CardHeader>
          <CardContent className="neu-stat-body">
            <div className="neu-stat-number">{formatCurrency(totalInvoiced)}</div>
            <div className="neu-stat-footer">
              <Badge variant="success" className="neu-trend-badge">
                ↑ 14.2% vs last mo
              </Badge>
              <span className="neu-stat-subtext">142 Invoices generated</span>
            </div>
          </CardContent>
        </Card>

        {/* Stat 2: GST Collected */}
        <Card variant="raised" className="neu-stat-neu-card">
          <CardHeader className="neu-stat-header">
            <span className="neu-stat-label">GST Collected (CGST+SGST)</span>
            <div className="neu-stat-icon-wrapper neu-icon--secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <polyline points="9 12 11 14 15 10"></polyline>
              </svg>
            </div>
          </CardHeader>
          <CardContent className="neu-stat-body">
            <div className="neu-stat-number">{formatCurrency(gstCollected)}</div>
            <div className="neu-stat-footer">
              <Badge variant="default" className="neu-trend-badge">
                100% Reconciled
              </Badge>
              <span className="neu-stat-subtext">CGST: ₹1.65L · SGST: ₹1.65L</span>
            </div>
          </CardContent>
        </Card>

        {/* Stat 3: Outstanding Dues */}
        <Card variant="raised" className="neu-stat-neu-card">
          <CardHeader className="neu-stat-header">
            <span className="neu-stat-label">Outstanding Dues</span>
            <div className="neu-stat-icon-wrapper neu-icon--warning">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
          </CardHeader>
          <CardContent className="neu-stat-body">
            <div className="neu-stat-number">{formatCurrency(outstandingDues)}</div>
            <div className="neu-stat-footer">
              <Badge variant="warning" className="neu-trend-badge">
                12 Retail Accounts
              </Badge>
              <span className="neu-stat-subtext">Avg settlement: 14 days</span>
            </div>
          </CardContent>
        </Card>

        {/* Stat 4: Overdue Invoices (Negative / Alert State) */}
        <Card variant="raised" className="neu-neu-card neu-stat-neu-card--alert">
          <CardHeader className="neu-stat-header">
            <span className="neu-stat-label">Overdue Invoices</span>
            <div className="neu-stat-icon-wrapper neu-icon--destructive">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
          </CardHeader>
          <CardContent className="neu-stat-body">
            <div className="neu-stat-number neu-text--destructive">{overdueCount} Invoices</div>
            <div className="neu-stat-footer">
              <Badge variant="destructive" className="neu-trend-badge">
                {formatCurrency(overdueAmount)} Overdue
              </Badge>
              <span className="neu-stat-subtext">&gt; 30 Days overdue notice</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Row 2: Quick Action Operations Bar */}
      <section className="neu-quick-actions">
        <button
          type="button"
          onClick={() => navigate('/cashier')}
          className="neu-quick-pill neu-quick-pill--primary"
        >
          <span className="neu-quick-icon">⚡</span>
          <span className="neu-quick-title">Create GST Invoice</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/inventory')}
          className="neu-quick-pill"
        >
          <span className="neu-quick-icon">📦</span>
          <span className="neu-quick-title">Stock Inward (GRN)</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/delivery')}
          className="neu-quick-pill"
        >
          <span className="neu-quick-icon">🚚</span>
          <span className="neu-quick-title">Dispatch Courier</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="neu-quick-pill"
        >
          <span className="neu-quick-icon">📄</span>
          <span className="neu-quick-title">Export GSTR-1 File</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/returns')}
          className="neu-quick-pill"
        >
          <span className="neu-quick-icon">🔄</span>
          <span className="neu-quick-title">Credit Note / Returns</span>
        </button>
      </section>

      {/* Row 3: Mixed Grid of Charts (Area Chart + Gauge + Bar + Progress + Line) */}
      <div className="neu-charts-grid">
        {/* Chart 1: Monthly Revenue & GST Trajectory (Area Chart - 2 Cols) */}
        <Card variant="raised" className="neu-chart-neu-card neu-col-span-2">
          <CardHeader className="neu-chart-header">
            <div>
              <CardTitle as="h2">Monthly Revenue &amp; GST Trajectory</CardTitle>
              <CardDescription>
                Gross billings against input/output tax liability over the last 6 months.
              </CardDescription>
            </div>
            <div className="neu-toggle-group">
              <button
                type="button"
                className={`neu-toggle-btn ${activeRange === 'monthly' ? 'active' : ''}`}
                onClick={() => setActiveRange('monthly')}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`neu-toggle-btn ${activeRange === 'quarterly' ? 'active' : ''}`}
                onClick={() => setActiveRange('quarterly')}
              >
                Quarterly
              </button>
            </div>
          </CardHeader>
          <CardContent className="neu-chart-content">
            <div className="neu-recharts-container" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MONTHLY_REVENUE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="neuRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_PALETTE.primary} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={CHART_PALETTE.primary} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="neuGstGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_PALETTE.secondary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_PALETTE.secondary} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#bebebe" strokeOpacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#334155"
                    tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: '#bebebe' }}
                  />
                  <YAxis
                    stroke="#334155"
                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(v) => `₹${v / 100000}L`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip content={<NeumorphicTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Gross Invoiced"
                    stroke={CHART_PALETTE.primary}
                    strokeWidth={3}
                    fillOpacity={1}
                    isAnimationActive={false}
                    fill="url(#neuRevenueGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="gst"
                    name="GST Collected"
                    stroke={CHART_PALETTE.secondary}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    isAnimationActive={false}
                    fill="url(#neuGstGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Legend Footer */}
            <div className="neu-chart-legend">
              <div className="neu-legend-item">
                <span className="neu-legend-dot" style={{ background: CHART_PALETTE.primary }} />
                <span>Gross Invoiced (₹18.42L)</span>
              </div>
              <div className="neu-legend-item">
                <span className="neu-legend-dot" style={{ background: CHART_PALETTE.secondary }} />
                <span>GST Liability (₹3.31L)</span>
              </div>
              <div className="neu-legend-item">
                <span className="neu-legend-dot" style={{ background: CHART_PALETTE.success }} />
                <span>ITC Eligible (₹48.2K)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: GSTR Filing & Compliance Velocity (Gauge Chart - 1 Col) */}
        <Card variant="raised" className="neu-chart-neu-card">
          <CardHeader className="neu-chart-header">
            <div>
              <CardTitle as="h2">GST Compliance Score</CardTitle>
              <CardDescription>Government filing readiness</CardDescription>
            </div>
            <Badge variant="success">92% Optimal</Badge>
          </CardHeader>
          <CardContent className="neu-chart-content neu-gauge-neu-card-body">
            <GaugeChart
              value={92}
              title="Filing Index (GSTR-1 & 3B)"
              subtitle="High Compliance"
              color={CHART_PALETTE.success}
              size={200}
            />

            {/* Inset Compliance Status Pills */}
            <div className="neu-compliance-list">
              <div className="neu-compliance-row">
                <span className="neu-compliance-name">GSTR-1 (Outward)</span>
                <Badge variant="success">Filed · 08 Sep</Badge>
              </div>
              <div className="neu-compliance-row">
                <span className="neu-compliance-name">GSTR-3B (Summary)</span>
                <Badge variant="default">Ready to Submit</Badge>
              </div>
              <div className="neu-compliance-row">
                <span className="neu-compliance-name">Available ITC</span>
                <span className="neu-compliance-amount">₹48,200</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Payment Collection Method Breakdown (Bar Chart - 1 Col) */}
        <Card variant="raised" className="neu-chart-neu-card">
          <CardHeader className="neu-chart-header">
            <div>
              <CardTitle as="h2">Payment Collection Split</CardTitle>
              <CardDescription>Tender breakdown across counters</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="neu-chart-content">
            <div className="neu-recharts-container" style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PAYMENT_METHOD_DATA} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#bebebe" strokeOpacity={0.4} horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="method"
                    stroke="#334155"
                    tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <RechartsTooltip
                    formatter={(v) => [formatCurrency(v), 'Volume']}
                    content={<NeumorphicTooltip />}
                  />
                  <Bar
                    dataKey="amount"
                    name="Amount"
                    fill={CHART_PALETTE.primary}
                    isAnimationActive={false}
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="neu-breakdown-chips">
              {PAYMENT_METHOD_DATA.map((item, idx) => (
                <div key={idx} className="neu-tender-chip">
                  <span className="neu-tender-name">{item.method}</span>
                  <strong className="neu-tender-val">{item.percentage}%</strong>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart 4: Invoice Aging & Collection Rate (Progress Bars - 1 Col) */}
        <Card variant="raised" className="neu-chart-neu-card">
          <CardHeader className="neu-chart-header">
            <div>
              <CardTitle as="h2">Collection Rate &amp; Aging</CardTitle>
              <CardDescription>Settlement efficiency analysis</CardDescription>
            </div>
            <Badge variant="success">88.4% Rate</Badge>
          </CardHeader>
          <CardContent className="neu-chart-content">
            <div className="neu-progress-stack">
              <Progress
                value={88.4}
                max={100}
                variant="success"
                label="Payment Collection Rate"
                showLabel
              />

              <div className="neu-aging-block">
                <span className="neu-aging-title">Accounts Receivable Aging</span>

                <Progress
                  value={60.8}
                  max={100}
                  variant="primary"
                  label="0–15 Days (Current: ₹1.12L)"
                  showLabel
                />

                <Progress
                  value={16.1}
                  max={100}
                  variant="warning"
                  label="16–30 Days (Moderate: ₹29.7K)"
                  showLabel
                />

                <Progress
                  value={23.1}
                  max={100}
                  variant="destructive"
                  label="> 30 Days (Overdue: ₹42.5K)"
                  showLabel
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart 5: Daily Counter Invoicing Velocity (Line Chart - 1 Col) */}
        <Card variant="raised" className="neu-chart-neu-card">
          <CardHeader className="neu-chart-header">
            <div>
              <CardTitle as="h2">Daily Counter Velocity</CardTitle>
              <CardDescription>Peak billing volume (Bills/Hour)</CardDescription>
            </div>
            <Badge variant="default">Peak: 19:00</Badge>
          </CardHeader>
          <CardContent className="neu-chart-content">
            <div className="neu-recharts-container" style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={DAILY_VELOCITY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#bebebe" strokeOpacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#334155"
                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#334155"
                    tick={{ fill: '#334155', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip content={<NeumorphicTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="bills"
                    name="Bills Processed"
                    stroke={CHART_PALETTE.primary}
                    strokeWidth={3}
                    isAnimationActive={false}
                    dot={{ fill: CHART_PALETTE.primary, stroke: '#e0e0e0', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, stroke: '#ffffff', strokeWidth: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="neu-velocity-footer">
              <span>Avg processing time: <strong>42s / bill</strong></span>
              <span>Total today: <strong>211 bills</strong></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Recent Invoices Ledger (Sunken Neumorphic Table) */}
      <section className="neu-ledger-section">
        <Card variant="raised" className="neu-ledger-neu-card">
          <CardHeader className="neu-ledger-header">
            <div>
              <CardTitle as="h2">Recent GST Invoices Ledger</CardTitle>
              <CardDescription>
                Direct transaction history with verified customer GSTINs and tax breakdown.
              </CardDescription>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/orders')}
            >
              View Full Invoicing Ledger →
            </Button>
          </CardHeader>

          <CardContent className="neu-ledger-body">
            <div className="neu-table-container">
              <table className="neu-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Customer / Trade Name</th>
                    <th>GSTIN</th>
                    <th>Taxable Value</th>
                    <th>GST (18%)</th>
                    <th>Total Amount</th>
                    <th>Payment Mode</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_INVOICES.map((inv) => (
                    <tr key={inv.id}>
                      <td className="neu-cell-id">{inv.id}</td>
                      <td>
                        <div className="neu-cell-customer">
                          <strong>{inv.customer}</strong>
                          <span>{inv.date}</span>
                        </div>
                      </td>
                      <td className="neu-cell-mono">{inv.gstin}</td>
                      <td className="neu-cell-num">{formatCurrency(inv.taxable)}</td>
                      <td className="neu-cell-num">{formatCurrency(inv.gst)}</td>
                      <td className="neu-cell-total">{formatCurrency(inv.total)}</td>
                      <td>
                        <span className="neu-mode-tag">{inv.method}</span>
                      </td>
                      <td>
                        <Badge
                          variant={
                            inv.status === 'Settled'
                              ? 'success'
                              : inv.status === 'Overdue'
                              ? 'destructive'
                              : 'warning'
                          }
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="neu-neu-btn-icon"
                          title="View Invoice"
                          onClick={() => navigate('/orders')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
