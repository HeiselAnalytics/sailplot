import { Menu as MenuIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SailPlotExtensionContext, SailPlotNavigationItem } from '../extensions/types'
import { useI18n } from '../i18n'

export function SailPlotNavigation({
  items,
  context,
}: {
  items: SailPlotNavigationItem[]
  context: SailPlotExtensionContext
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLElement>(null)

  useEffect(() => setOpen(false), [context.currentPath])

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  if (!items.length) return null
  return (
    <nav ref={menuRef} className="sailplot-navigation sailplot-menu" aria-label={t('Navigation')}>
      <button
        type="button"
        className="sailplot-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('Menu')}
        onClick={() => setOpen((current) => !current)}
      >
        <MenuIcon aria-hidden="true" />
        <span>{t('Menu')}</span>
      </button>
      {open && (
        <div className="sailplot-menu-popover" role="menu">
          {items.map((item) =>
            item.href ? (
              <a
                key={item.id}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ) : (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  context.navigate(item.path ?? '/')
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </nav>
  )
}
