import { expect, test } from '@playwright/test'

test('switches the complete interface between German and English and remembers it', async ({
  page,
}) => {
  await page.goto('/')

  const language = page.getByRole('group', { name: 'Language' })
  await expect(language).toBeVisible()
  await language.getByRole('button', { name: 'Deutsch' }).click()

  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page).toHaveTitle('Segelszenario-Editor')
  await expect(page.getByRole('group', { name: 'Sprache' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Boot' }).first()).toBeVisible()
  await expect(page.locator('.statusbar')).toContainText('Bereit')
  await page.getByRole('button', { name: 'Hellen Modus verwenden' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('sailing-language')))
    .toBe('de')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('group', { name: 'Sprache' }).getByRole('button', { name: 'English' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle('Sailing Scenario Editor')
})

test('makes the desktop tool and scene controls visibly interactive', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Desktop sidebar is hidden in compact mode')
  await page.goto('/')
  const toolsPanel = page.locator('.tools-panel')
  const returnToSelect = toolsPanel.getByRole('button', { name: 'Return to Select' })
  await expect(returnToSelect).toHaveCount(0)
  const pan = toolsPanel.getByRole('button', { name: 'Pan' })
  await expect(pan).toHaveAttribute('aria-pressed', 'false')
  await expect(pan).toHaveCSS('border-top-width', '1px')
  await pan.click()
  await expect(pan).toHaveAttribute('aria-pressed', 'true')
  await expect(returnToSelect).toBeVisible()
  await returnToSelect.click()
  await expect(toolsPanel.getByRole('button', { name: 'Select' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(returnToSelect).toHaveCount(0)

  const mark = toolsPanel.getByRole('button', { name: 'Mark', exact: true })
  await expect(mark).toBeVisible()
  await expect(mark.locator('svg')).toHaveClass(/lucide-cylinder/)

  const toggles = toolsPanel.locator('.scene-toggle-grid .check-row')
  const firstToggle = await toggles.nth(0).boundingBox()
  const secondToggle = await toggles.nth(1).boundingBox()
  expect(firstToggle).not.toBeNull()
  expect(secondToggle).not.toBeNull()
  expect(Math.abs(firstToggle!.y - secondToggle!.y)).toBeLessThan(1)
  expect(secondToggle!.x).toBeGreaterThan(firstToggle!.x)

  await toolsPanel.getByLabel('Grid size slider').fill('72')
  await expect(toolsPanel.getByLabel('Grid size value')).toHaveValue('72')
  await toolsPanel.getByLabel('Grid visibility slider').fill('65')
  await expect(toolsPanel.getByLabel('Grid visibility value')).toHaveValue('65')
  const windSlider = toolsPanel.getByLabel('Wind direction slider')
  await expect(windSlider).toHaveAttribute('min', '-180')
  await expect(windSlider).toHaveAttribute('max', '180')
  await expect(windSlider).toHaveValue('0')
  await windSlider.fill('-90')
  await expect(toolsPanel.getByLabel('Wind direction value')).toHaveValue('-90')
  await windSlider.fill('90')
  await expect(toolsPanel.getByLabel('Wind direction value')).toHaveValue('90')
  await expect(toolsPanel.getByText('−180°', { exact: true })).toBeVisible()
  await expect(toolsPanel.getByText('+180°', { exact: true })).toBeVisible()
  await toolsPanel.getByLabel('Layline angle value').fill('35')
  await expect(toolsPanel.getByLabel('Layline angle slider')).toHaveValue('35')
  for (const label of ['Grid size', 'Grid visibility', 'Wind direction', 'Layline angle']) {
    const valueBox = await toolsPanel.getByLabel(`${label} value`).boundingBox()
    const sliderBox = await toolsPanel.getByLabel(`${label} slider`).boundingBox()
    expect(valueBox).not.toBeNull()
    expect(sliderBox).not.toBeNull()
    expect(sliderBox!.x).toBeGreaterThan(valueBox!.x)
  }
  await expect(toolsPanel.getByLabel('Grid size value')).toHaveCSS('appearance', 'textfield')
  await expect(toolsPanel.getByText('Additional information', { exact: true })).toBeVisible()
  await expect(toolsPanel.getByText('Wind strength (general)', { exact: true })).toBeVisible()
  const boatNumbers = toolsPanel.getByRole('checkbox', { name: 'Show boat numbers' })
  await expect(boatNumbers).toBeChecked()
  await boatNumbers.uncheck()
  await expect(boatNumbers).not.toBeChecked()
})

test('keeps desktop logo spacing in compact layout', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Compact desktop header check')
  await page.goto('/')
  await expect(page.locator('.document-save-status')).toHaveAttribute('data-state', 'browser')
  await page.getByLabel('Layout preference').selectOption('compact')
  await expect(page.locator('.app-shell')).toHaveAttribute('data-layout', 'compact')

  const headerBounds = await page.locator('.topbar').boundingBox()
  const logoBounds = await page.locator('.app-logo--on-dark').boundingBox()
  expect(headerBounds).not.toBeNull()
  expect(logoBounds).not.toBeNull()
  expect(Math.round(headerBounds!.height)).toBe(52)
  expect(Math.round(logoBounds!.height)).toBe(32)
  const topGap = logoBounds!.y - headerBounds!.y
  const bottomGap =
    headerBounds!.y + headerBounds!.height - (logoBounds!.y + logoBounds!.height)
  expect(topGap).toBeGreaterThanOrEqual(9)
  expect(bottomGap).toBeGreaterThanOrEqual(9)
  expect(Math.abs(topGap - bottomGap)).toBeLessThanOrEqual(1)
})

test('renames from the centered title and keeps import inside Projects', async ({ page }) => {
  await page.goto('/')
  const header = page.locator('.topbar')
  await expect(header.getByRole('button', { name: 'Scenario details' })).toHaveCount(0)
  await expect(header.getByRole('button', { name: 'Import JSON' })).toHaveCount(0)

  await header.getByRole('button', { name: 'Rename scenario' }).click()
  const details = page.getByRole('dialog')
  await expect(details).toContainText('Scenario details')
  await details.getByLabel('Title').fill('Start practice')
  await details.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('.topbar-document-title')).toHaveText('Start practice')

  await header.getByRole('button', { name: 'Open projects & templates' }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Import JSON' })).toBeVisible()
})

test('keeps the saved state stable while autosaving and marks downloads', async ({ page }) => {
  await page.goto('/')
  const documentStatus = page.locator('.document-save-status')

  await expect(documentStatus).toHaveAttribute('data-state', 'browser')
  await expect(documentStatus).toHaveAttribute('title', 'Saved in browser')
  await expect(documentStatus.locator('.document-save-status-dot')).toHaveCSS(
    'background-color',
    'rgb(34, 197, 94)',
  )

  await page.getByRole('button', { name: 'Rename scenario' }).click()
  const details = page.getByRole('dialog')
  await details.getByLabel('Title').fill('Status test')
  await expect(documentStatus).toHaveAttribute('data-state', 'browser')
  await page.waitForTimeout(1000)
  await expect(documentStatus).toHaveAttribute('data-state', 'browser')
  await details.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('.statusbar')).toContainText('Saved locally', { timeout: 5000 })

  await page.getByRole('button', { name: 'Download' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('dialog').getByRole('button', { name: /Scenario JSON/ }).click()
  await downloadPromise
  await expect(documentStatus).toHaveAttribute('data-state', 'downloaded')
  await expect(documentStatus).toHaveAttribute('title', 'Downloaded')
})

test('matches the Lighthouse-style Heisel Analytics credit', async ({ page }, testInfo) => {
  await page.goto('/')
  const productLogo = page.locator('.app-symbol img:visible')
  await expect(productLogo).toBeVisible()
  await expect(page.locator('body')).toHaveCSS('font-family', /Open Sans Variable/)
  await expect(page.locator('.topbar-document-title')).toHaveCSS(
    'font-family',
    /Montserrat Variable/,
  )
  await expect(page.locator('.topbar-document-title')).toHaveCSS('font-weight', '700')
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('14px "Open Sans Variable"')))
    .toBe(true)
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('700 15px "Montserrat Variable"')))
    .toBe(true)
  await expect(productLogo).toHaveAttribute(
    'src',
    testInfo.project.name === 'iphone'
      ? /icons\/sailplot-icon\.svg$/
      : /icons\/sailplot-logo-on-dark\.svg$/,
  )
  await expect
    .poll(() => productLogo.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0)
  const logoBounds = await productLogo.boundingBox()
  const titleBounds = await page.locator('.topbar-document').boundingBox()
  const viewport = page.viewportSize()
  expect(logoBounds).not.toBeNull()
  expect(titleBounds).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(logoBounds!.x).toBeLessThanOrEqual(12)
  expect(logoBounds!.width).toBeGreaterThanOrEqual(
    testInfo.project.name === 'iphone' ? 34 : 160,
  )
  const fileActions = page.locator('.topbar-actions--file')
  const openProjects = fileActions.getByRole('button', { name: 'Open projects & templates' })
  const download = fileActions.getByRole('button', { name: 'Download' })
  await expect(openProjects).toBeVisible()
  await expect(download).toBeVisible()
  if (testInfo.project.name !== 'desktop-chrome') {
    await expect(openProjects.locator('span')).toBeHidden()
    await expect(download.locator('span')).toBeHidden()
  } else {
    await expect(openProjects.locator('span')).toHaveText('Open projects & templates')
    await expect(download.locator('span')).toHaveText('Download')
  }
  if (testInfo.project.name === 'desktop-chrome') {
    const fileActionBounds = await fileActions.boundingBox()
    expect(fileActionBounds).not.toBeNull()
    expect(fileActionBounds!.x - (logoBounds!.x + logoBounds!.width)).toBeGreaterThanOrEqual(28)
  }
  expect(Math.abs(titleBounds!.x + titleBounds!.width / 2 - viewport!.width / 2)).toBeLessThan(1)
  if (testInfo.project.name === 'desktop-chrome') {
    await page.getByRole('button', { name: 'Use light mode' }).click()
    await expect(productLogo).toHaveAttribute('src', /icons\/sailplot-logo-on-light\.svg$/)
  }
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    './icons/sailplot-icon.svg',
  )
  const credit = page.getByLabel('Powered by Heisel Analytics')
  await expect(credit).toBeVisible()
  await expect(credit).toHaveCSS('display', 'flex')
  await expect(credit).toHaveCSS('background-color', 'rgba(46, 46, 46, 0.82)')
  await expect(credit.getByRole('img', { name: 'Heisel Analytics' })).toBeVisible()
  await expect(credit.getByRole('link', { name: 'Website' })).toHaveAttribute(
    'href',
    'https://heiselanalytics.one/',
  )
  await expect(credit.getByRole('link', { name: 'Imprint' })).toHaveAttribute(
    'href',
    'https://heiselanalytics.one/impressum',
  )

  const bounds = await credit.boundingBox()
  expect(bounds).not.toBeNull()
  expect(Math.round(bounds!.height)).toBe(testInfo.project.name === 'iphone' ? 42 : 50)

  await credit.getByRole('button', { name: 'Info' }).click()
  await expect(page.getByRole('dialog')).toContainText('Help & information')
})

test('creates a boat and exposes touch-friendly editor controls', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.topbar-document-title')).toHaveText('Untitled scenario')
  await page.getByRole('button', { name: 'Boat' }).first().click()
  const canvas = page.locator('canvas').first()
  await canvas.click({ position: { x: 320, y: 240 } })
  await expect(page.locator('.badge:visible')).toHaveText('boat')
  await expect(page.locator('.property-section-title:visible')).toHaveText('Sails')
  await expect(page.getByText('Canvas label', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Static state marker', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled()
  await expect(
    page.getByRole('button', { name: 'Use palette color Ocean blue #2563EB' }),
  ).toHaveCount(0)
  const colorSelector = page.locator('button[aria-label="Open Hull color selector"]:visible')
  await colorSelector.click()
  await expect(
    page.getByRole('button', { name: 'Use palette color Ocean blue #2563EB' }),
  ).toBeVisible()
  await expect(page.locator('.sail-status:visible')).toHaveText('Luffing')

  const mainsailTrim = page.locator('.angle-control input[type="range"]:visible').first()
  await mainsailTrim.fill('45')
  await expect(page.locator('.sail-status:visible')).toHaveCount(0)
  await mainsailTrim.fill('0')
  await expect(page.locator('.sail-status:visible')).toHaveText('Luffing')

  const hullColor = page.locator('input[aria-label="Hull color custom color"]:visible')
  await hullColor.fill('#df3f3f')
  await colorSelector.click()
  await expect(page.getByRole('button', { name: 'Use recent color #2563EB' })).toBeVisible()
  await page.getByRole('button', { name: 'Use recent color #2563EB' }).click()
  await expect(colorSelector).toContainText('#2563EB')
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('sailing-scenario-editor:recent-colors')))
    .toContain('#DF3F3F')
})

test('uses boat lengths for mark zones and supports Lacustre', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('canvas').first()
  await page.getByRole('button', { name: 'Boat' }).first().click()
  await canvas.click({ position: { x: 240, y: 200 } })

  const boatClass = page
    .locator('label.field:visible')
    .filter({ hasText: 'Boat class' })
    .locator('select')
  await boatClass.selectOption('Lacustre')
  await expect(
    page.locator('label:visible').filter({ hasText: 'Jib' }).getByRole('checkbox'),
  ).not.toBeChecked()
  const genoa = page.locator('label:visible').filter({ hasText: 'Genoa' }).getByRole('checkbox')
  await expect(genoa).toBeChecked()
  await page.locator('label:visible').filter({ hasText: 'Jib' }).getByRole('checkbox').check()
  await expect(genoa).not.toBeChecked()
  await expect(
    page.locator('label:visible').filter({ hasText: 'Spinnaker' }).getByRole('checkbox'),
  ).not.toBeChecked()
  await expect(page.locator('label:visible').filter({ hasText: 'Gennaker' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Mark', exact: true }).first().click()
  await canvas.click({ position: { x: 160, y: 80 } })
  await expect(page.getByRole('spinbutton', { name: 'Mark number' })).toHaveValue('1')
  const downwind = page.getByRole('switch', { name: 'Downwind mark' })
  await expect(downwind).not.toBeChecked()
  await downwind.check()
  await expect(downwind).toBeChecked()
  await expect(page.locator('input[aria-label="Zone radius in boat lengths"]:visible')).toHaveValue(
    '3',
  )
  await expect(page.locator('.field-help:visible')).toContainText('Longest class: Lacustre (9.5 m)')
})

test('opens project templates', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open projects & templates' }).click()
  await expect(page.getByRole('dialog')).toContainText('Windward mark')
  await page.getByRole('button', { name: /Windward mark/ }).click()
  await expect(page.locator('.statusbar')).toContainText('4 objects')
})

test('places consecutive boats as numbered chain positions', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Boat' }).first().click()
  const canvas = page.locator('canvas').first()
  await canvas.click({ position: { x: 280, y: 260 } })
  const secondBoatPosition =
    testInfo.project.name === 'iphone' ? { x: 10, y: 40 } : { x: 380, y: 200 }
  await canvas.click({ position: secondBoatPosition })
  await expect(page.locator('.statusbar')).toContainText('2 objects')
  await expect(page.locator('.statusbar')).toContainText('100%')
  await expect(
    page.locator('.object-meta:visible > div').filter({ hasText: 'Position' }),
  ).toContainText('2')

  const heading = page.locator('input[aria-label="Heading slider"]:visible')
  await heading.fill('137')
  if (testInfo.project.name !== 'iphone') {
    const canvasBox = await canvas.boundingBox()
    if (!canvasBox) throw new Error('Canvas bounds are unavailable')
    await page.mouse.move(canvasBox.x + 380, canvasBox.y + 200)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + 400, canvasBox.y + 220, { steps: 4 })
    await page.mouse.up()
  }
  await expect(heading).toHaveValue('137')

  const boatTool = page.locator('button[aria-label="Boat"]:visible')
  // Clicking the already-active creation tool starts a fresh creation series.
  await boatTool.click()
  await expect(boatTool).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.object-meta:visible')).toHaveCount(0)
  await canvas.click({ position: { x: 180, y: 340 } })
  await expect(
    page.locator('.object-meta:visible > div').filter({ hasText: 'Position' }),
  ).toContainText('1')
  await expect(page.locator('button[aria-label="Open Hull color selector"]:visible')).toContainText(
    '#DF3F3F',
  )
})
