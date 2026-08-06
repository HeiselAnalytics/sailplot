import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SailPlotApp } from '../src/app/SailPlotApp'

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../src/app/App', () => ({
  default: () => <div data-testid="editor">SailPlot editor</div>,
}))

let container: HTMLDivElement
let root: Root

const render = async (node: React.ReactNode) => {
  await act(async () => root.render(node))
}

beforeEach(() => {
  window.history.replaceState({}, '', '/')
  window.localStorage.clear()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

describe('SailPlotApp', () => {
  it('renders the standalone editor with the standard configuration and no extensions', async () => {
    await render(<SailPlotApp />)
    expect(container.querySelector('[data-testid="editor"]')?.textContent).toBe('SailPlot editor')
  })

  it('applies a changed logo and theme colors', async () => {
    await render(
      <SailPlotApp
        config={{
          branding: { logo: '/generic-logo.svg', logoDark: '/generic-logo.svg' },
          theme: { mode: 'light', light: { background: '#eef6ff', accent: '#0066cc' } },
          ui: { home: true },
          defaults: { startPage: 'home' },
        }}
      />,
    )

    expect(container.querySelector<HTMLImageElement>('.extension-shell-logo img')?.src).toContain(
      '/generic-logo.svg',
    )
    expect(
      container
        .querySelector<HTMLElement>('.extension-page-shell')
        ?.style.getPropertyValue('--background'),
    ).toBe('#eef6ff')
  })

  it('renders an additional route', async () => {
    window.history.replaceState({}, '', '/guide')
    const Guide = () => <h1>Generic guide</h1>
    await render(<SailPlotApp extensions={{ routes: [{ path: '/guide', component: Guide }] }} />)
    expect(container.querySelector('h1')?.textContent).toBe('Generic guide')
  })

  it('renders navigation items and navigates without a second router', async () => {
    window.history.replaceState({}, '', '/home')
    const Extra = () => <h1>Extra page</h1>
    await render(
      <SailPlotApp
        config={{ ui: { home: true } }}
        extensions={{
          routes: [{ path: '/extra', component: Extra }],
          navigationItems: [
            { id: 'extra', label: 'Extra', path: '/extra' },
            { id: 'website', label: 'Website', href: 'https://example.com', external: true },
          ],
        }}
      />,
    )

    const navigation = container.querySelector('.sailplot-navigation')
    expect(navigation?.querySelector('a')?.getAttribute('href')).toBe('https://example.com')
    await act(async () => navigation?.querySelector<HTMLButtonElement>('button')?.click())
    expect(container.querySelector('h1')?.textContent).toBe('Extra page')
    expect(window.location.pathname).toBe('/extra')
  })
})
