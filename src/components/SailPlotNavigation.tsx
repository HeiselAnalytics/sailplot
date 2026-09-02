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
  const { language, setLanguage, t } = useI18n()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLElement>(null)
  const languageSelectionAvailable = context.config.localization.languageMode === 'both'

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

  if (!items.length && !languageSelectionAvailable) return null
  return (
    <nav
      ref={menuRef}
      className={`sailplot-navigation sailplot-menu ${items.length ? '' : 'sailplot-menu--language-only'}`}
      aria-label={t('Navigation')}
    >
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
          {items.map((item) => {
            const className = [
              item.separatorBefore ? 'sailplot-menu-item--separator' : '',
              item.muted ? 'sailplot-menu-item--muted' : '',
              item.version ? 'sailplot-menu-item--version' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return item.href ? (
              <a
                key={item.id}
                className={className || undefined}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                {t(item.label)}
              </a>
            ) : (
              <button
                key={item.id}
                type="button"
                className={className || undefined}
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  context.navigate(item.path ?? '/')
                }}
              >
                {t(item.label)}
              </button>
            )
          })}
          {languageSelectionAvailable && (
            <div className="sailplot-menu-language" role="group" aria-label={t('Language')}>
              <span>{t('Language')}</span>
              <div className="sailplot-menu-language-options">
                {(['de', 'en'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={language === code}
                    className={language === code ? 'is-active' : ''}
                    aria-label={code === 'de' ? 'Deutsch' : 'English'}
                    onClick={() => {
                      setLanguage(code)
                      setOpen(false)
                    }}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
