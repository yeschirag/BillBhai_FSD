import React from 'react'

export function Badge({
  className = '',
  variant = 'default', // default | success | warning | destructive | outline | neutral
  children,
  ...props
}) {
  return (
    <span className={`neu-badge neu-badge--${variant} ${className}`} {...props}>
      {children}
    </span>
  )
}
