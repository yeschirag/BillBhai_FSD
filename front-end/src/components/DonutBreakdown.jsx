import { Cell, ResponsiveContainer, Pie, PieChart, Tooltip as RechartsTooltip } from 'recharts'

// Donut with a center figure and a count legend. Color follows the entity:
// callers assign `fill` per name, never by index, so segments keep their color
// as values change. Zero-value entries are omitted from the ring by Recharts
// and filtered here so the legend matches what is drawn.
function DonutBreakdown({ data, centerValue, centerLabel, formatValue }) {
  const visible = (Array.isArray(data) ? data : []).filter((entry) => Number(entry.value) > 0)
  if (!visible.length) return null

  return (
    <div className="donut-with-legend">
      <div className="donut-chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visible}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={3}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {visible.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <RechartsTooltip content={<DonutTooltip formatValue={formatValue} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center" aria-hidden="true">
          <span className="donut-center-value">{centerValue}</span>
          <span className="donut-center-label">{centerLabel}</span>
        </div>
      </div>
      <ul className="donut-legend">
        {visible.map((entry) => (
          <li key={entry.name}>
            <span className="donut-swatch" style={{ background: entry.fill }} />
            <span className="donut-legend-name">{entry.name}</span>
            <span className="donut-legend-value">{Number(entry.value).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DonutTooltip({ active, payload, formatValue }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  const value = formatValue ? formatValue(entry.value) : Number(entry.value).toLocaleString()
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{entry.name}</p>
      <p className="chart-tooltip-value">{value}</p>
    </div>
  )
}

export default DonutBreakdown
