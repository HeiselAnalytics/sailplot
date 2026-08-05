import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  compact?: boolean
  active?: boolean
}

export function IconButton({
  icon,
  label,
  compact,
  active,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button ${compact ? 'icon-button--compact' : ''} ${active ? 'is-active' : ''} ${className}`}
      aria-label={label}
      title={label}
      aria-pressed={active === undefined ? undefined : active}
      {...props}
    >
      {icon}
      {!compact && <span>{label}</span>}
    </button>
  )
}
