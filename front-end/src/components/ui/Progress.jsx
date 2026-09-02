import React from 'react'

export function Progress({
  value = 0,
  max = 100,
  variant = 'primary', // primary | success | warning | destructive | navy
  className = '',
  showLabel = false,
  label = '',
  ...props
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={`neu-progress-wrapper ${className}`} {...props}>
      {(label || showLabel) && (
        <div className="neu-progress-labels">
          {label && <span className="neu-progress-title">{label}</span>}
          {showLabel && <span className="neu-progress-val">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className="neu-progress-track">
        <div
          className={`neu-progress-fill neu-progress-fill--${variant}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
