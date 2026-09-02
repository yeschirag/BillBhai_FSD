import React from 'react'

export function Card({ className = '', variant = 'raised', children, ...props }) {
  return (
    <div className={`neu-card neu-card--${variant} ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }) {
  return (
    <div className={`neu-card-header ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className = '', as: Tag = 'h3', children, ...props }) {
  return (
    <Tag className={`neu-card-title ${className}`} {...props}>
      {children}
    </Tag>
  )
}

export function CardDescription({ className = '', children, ...props }) {
  return (
    <p className={`neu-card-description ${className}`} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className = '', children, ...props }) {
  return (
    <div className={`neu-card-content ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className = '', children, ...props }) {
  return (
    <div className={`neu-card-footer ${className}`} {...props}>
      {children}
    </div>
  )
}
