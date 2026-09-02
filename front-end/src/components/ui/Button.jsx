import React from 'react'

export function Button({
  className = '',
  variant = 'secondary', // primary | secondary | ghost | destructive | outline
  size = 'md', // sm | md | lg | icon
  disabled = false,
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`neu-btn neu-btn--${variant} neu-btn--${size} ${disabled ? 'neu-btn--disabled' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
