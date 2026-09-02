import React from 'react'

export function GaugeChart({
  value = 92,
  min = 0,
  max = 100,
  title = 'GSTR Filing Index',
  subtitle = 'High Compliance',
  size = 180,
  strokeWidth = 14,
  color = '#059669', // Sage Emerald
}) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  const radius = (size - strokeWidth) / 2
  // Semi-circle arc from 180 deg to 360 deg (PI * radius)
  const arcLength = Math.PI * radius
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength

  return (
    <div className="neu-gauge-container" style={{ width: size, height: size * 0.65 }}>
      <svg
        width={size}
        height={size * 0.65}
        viewBox={`0 0 ${size} ${size * 0.65}`}
        className="neu-gauge-svg"
      >
        <defs>
          <linearGradient id="gaugeBgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bebebe" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#bebebe" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="gaugeFillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Background Track Arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="#d1d5db"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Filled Value Arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={arcLength}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="neu-gauge-fill"
        />
      </svg>

      <div className="neu-gauge-center" style={{ top: size * 0.22 }}>
        <span className="neu-gauge-value">{value}%</span>
        <span className="neu-gauge-subtitle">{subtitle}</span>
      </div>
      <p className="neu-gauge-title">{title}</p>
    </div>
  )
}
