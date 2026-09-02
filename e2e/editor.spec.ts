import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function openMobileProperties(page: Page) {
  const toggle = page.locator('.mobile-properties-toggle:visible')
  if (!(await toggle.count())) return
  await expect(toggle).toHaveAccessibleName('Expand properties')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.mobile-properties-body')).toBeHidden()
  await toggle.click()
  await expect(toggle).toHaveAccessibleName('Collapse properties')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('.mobile-properties-body')).toBeVisible()
}

async function countDifferentPixels(page: Page, first: Buffer, second: Buffer) {
  return page.evaluate(
    async ({ firstUrl, secondUrl }) => {
      const readPixels = async (source: string) => {
        const image = new Image()
        image.src = source
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d')!
        context.drawImage(image, 0, 0)
        return context.getImageData(0, 0, image.width, image.height).data
      }
      const [firstPixels, secondPixels] = await Promise.all([
        readPixels(firstUrl),
        readPixels(secondUrl),
      ])
      let differentPixels = 0
      for (let index = 0; index < firstPixels.length; index += 4) {
        if (
          firstPixels[index] !== secondPixels[index] ||
          firstPixels[index + 1] !== secondPixels[index + 1] ||
          firstPixels[index + 2] !== secondPixels[index + 2] ||
          firstPixels[index + 3] !== secondPixels[index + 3]
        ) {
          differentPixels += 1
        }
      }
      return differentPixels
    },
    {
      firstUrl: `data:image/png;base64,${first.toString('base64')}`,
      secondUrl: `data:image/png;base64,${second.toString('base64')}`,
    },
  )
}

test('switches the complete interface between German and English and remembers it', async ({
  page,
}, testInfo) => {
  await page.goto('/')

  const compact = testInfo.project.name !== 'desktop-chrome'
  if (compact) await page.getByRole('button', { name: 'Menu', exact: true }).click()
  const language = page.getByRole('group', { name: 'Language' })
  await expect(language).toBeVisible()
  await language.getByRole(compact ? 'menuitemradio' : 'button', { name: 'Deutsch' }).click()

  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page).toHaveTitle('SailPlot.app')
  if (compact) await page.getByRole('button', { name: 'Menü', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Sprache' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Boot' }).first()).toBeVisible()
  await expect(page.locator('.statusbar')).toContainText('Bereit')
  await page.getByRole('button', { name: 'Hellen Modus verwenden' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sailing-language'))).toBe('de')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  if (compact) await page.getByRole('button', { name: 'Menü', exact: true }).click()
  await page
    .getByRole('group', { name: 'Sprache' })
    .getByRole(compact ? 'menuitemradio' : 'button', { name: 'English' })
    .click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle('SailPlot.app')
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
  const boat = toolsPanel.getByRole('button', { name: 'Boat', exact: true })
  const leeMark = toolsPanel.getByRole('button', { name: 'Lee mark', exact: true })
  const gate = toolsPanel.getByRole('button', { name: 'Gate', exact: true })
  await expect(gate.locator('svg')).toHaveAttribute('data-icon', 'sailing-gate')
  const startLine = toolsPanel.getByRole('button', { name: 'Start line', exact: true })
  const finishLine = toolsPanel.getByRole('button', { name: 'Finish line', exact: true })
  const boatBounds = await boat.boundingBox()
  const leeMarkBounds = await leeMark.boundingBox()
  const markBounds = await mark.boundingBox()
  const gateBounds = await gate.boundingBox()
  const startLineBounds = await startLine.boundingBox()
  const finishLineBounds = await finishLine.boundingBox()
  expect(boatBounds).not.toBeNull()
  expect(leeMarkBounds).not.toBeNull()
  expect(markBounds).not.toBeNull()
  expect(gateBounds).not.toBeNull()
  expect(startLineBounds).not.toBeNull()
  expect(finishLineBounds).not.toBeNull()
  expect(Math.abs(leeMarkBounds!.height - boatBounds!.height)).toBeLessThan(1)
  expect(gateBounds!.y).toBeGreaterThan(boatBounds!.y)
  expect(startLineBounds!.y).toBeGreaterThan(markBounds!.y)
  expect(finishLineBounds!.y).toBeGreaterThanOrEqual(startLineBounds!.y)

  const toggles = toolsPanel.locator('.scene-toggle-grid .check-row')
  const firstToggle = await toggles.nth(0).boundingBox()
  const secondToggle = await toggles.nth(1).boundingBox()
  expect(firstToggle).not.toBeNull()
  expect(secondToggle).not.toBeNull()
  expect(Math.abs(firstToggle!.y - secondToggle!.y)).toBeLessThan(1)
  expect(secondToggle!.x).toBeGreaterThan(firstToggle!.x)

  const plotBackground = toolsPanel.getByRole('group', { name: 'Plot background' })
  const lightBackground = plotBackground.getByRole('button', { name: 'Light' })
  const darkBackground = plotBackground.getByRole('button', { name: 'Dark' })
  await expect(lightBackground).toHaveAttribute('aria-pressed', 'true')
  await expect(darkBackground).toHaveAttribute('aria-pressed', 'false')
  await toolsPanel.getByRole('checkbox', { name: 'Show grid' }).uncheck()
  await darkBackground.click()
  await expect(darkBackground).toHaveAttribute('aria-pressed', 'true')
  await expect(toolsPanel.getByLabel('Grid visibility value')).toHaveValue('40')
  await expect
    .poll(() =>
      page
        .locator('.editor-canvas canvas')
        .first()
        .evaluate((canvas: HTMLCanvasElement) => {
          const context = canvas.getContext('2d')
          return context
            ? Array.from(
                context.getImageData(
                  Math.floor(canvas.width / 2),
                  Math.floor(canvas.height / 2),
                  1,
                  1,
                ).data,
              ).slice(0, 3)
            : []
        }),
    )
    .toEqual([38, 38, 38])
  await lightBackground.click()
  await expect(lightBackground).toHaveAttribute('aria-pressed', 'true')
  await expect(toolsPanel.getByLabel('Grid visibility value')).toHaveValue('100')
  const boatLegend = toolsPanel.getByRole('group', { name: 'Boat legend' })
  const boatLegendOn = boatLegend.getByRole('button', { name: 'On' })
  const boatLegendOff = boatLegend.getByRole('button', { name: 'Off' })
  await expect(boatLegendOn).toHaveAttribute('aria-pressed', 'true')
  await expect(boatLegendOff).toHaveAttribute('aria-pressed', 'false')
  await boatLegendOff.click()
  await expect(boatLegendOff).toHaveAttribute('aria-pressed', 'true')

  await expect(toolsPanel.getByText('1 BL · ILCA', { exact: true })).toBeVisible()
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
  const boatLengthBasis = toolsPanel.getByLabel('Boat-length basis')
  await expect(boatLengthBasis).toHaveValue('')
  await expect(boatLengthBasis.locator('option').first()).toHaveText('Default - ILCA')
  await expect(boatLengthBasis.locator('option[value="Committee boat"]')).toHaveCount(0)
  await expect(boatLengthBasis.locator('option[value="Coachboat"]')).toHaveCount(0)
  const basisInfoButton = toolsPanel.getByRole('button', { name: 'How BL is calculated' })
  await expect(basisInfoButton).toHaveAttribute('aria-expanded', 'false')
  await basisInfoButton.click()
  await expect(basisInfoButton).toHaveAttribute('aria-expanded', 'true')
  await expect(toolsPanel.getByText(/Current basis: ILCA/)).toBeVisible()
  await boatLengthBasis.selectOption('Optimist')
  await expect(boatLengthBasis).toHaveValue('Optimist')
  await expect(toolsPanel.getByText('1 BL · Optimist', { exact: true })).toBeVisible()
  for (const label of ['Grid visibility', 'Wind direction', 'Layline angle']) {
    const valueBox = await toolsPanel.getByLabel(`${label} value`).boundingBox()
    const sliderBox = await toolsPanel.getByLabel(`${label} slider`).boundingBox()
    expect(valueBox).not.toBeNull()
    expect(sliderBox).not.toBeNull()
    expect(sliderBox!.x).toBeGreaterThan(valueBox!.x)
  }
  const windFieldBounds = await toolsPanel
    .getByLabel('Wind direction slider')
    .locator('xpath=ancestor::label[contains(@class, "scene-range-field")]')
    .boundingBox()
  const gridSpacingFieldBounds = await toolsPanel.locator('.grid-spacing-field').boundingBox()
  expect(windFieldBounds).not.toBeNull()
  expect(gridSpacingFieldBounds).not.toBeNull()
  expect(gridSpacingFieldBounds!.y).toBeLessThan(windFieldBounds!.y)
  await expect(toolsPanel.getByText('Additional information', { exact: true })).toHaveCount(0)
  await expect(toolsPanel.getByText('Wind strength (general)', { exact: true })).toHaveCount(0)
  const boatNumbers = toolsPanel.getByRole('checkbox', { name: 'Show boat numbers' })
  await expect(boatNumbers).toBeChecked()
  await boatNumbers.uncheck()
  await expect(boatNumbers).not.toBeChecked()
})

test('keeps breathing room around German function buttons', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Desktop sidebar spacing check')
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.addInitScript(() => localStorage.setItem('sailing-language', 'de'))
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')

  const toolsPanel = page.locator('.tools-panel')
  const toolButtons = toolsPanel.locator('.tool-grid:not(.tool-grid--compact) .icon-button')
  const panelBounds = await toolsPanel.boundingBox()
  const firstBounds = await toolButtons.first().boundingBox()
  const secondBounds = await toolButtons.nth(1).boundingBox()
  expect(panelBounds).not.toBeNull()
  expect(firstBounds).not.toBeNull()
  expect(secondBounds).not.toBeNull()
  expect(firstBounds!.x - panelBounds!.x).toBeGreaterThanOrEqual(16)
  expect(
    panelBounds!.x + panelBounds!.width - (secondBounds!.x + secondBounds!.width),
  ).toBeGreaterThanOrEqual(16)
  expect(
    await toolButtons.evaluateAll((buttons) =>
      buttons.every((button) => button.scrollWidth <= button.clientWidth),
    ),
  ).toBe(true)
})

test('shows the boat legend by default and toggles it from the scene sidebar', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Desktop scene sidebar check')
  await page.goto('/')
  const toolsPanel = page.locator('.tools-panel')
  const legendSwitch = toolsPanel.getByRole('group', { name: 'Boat legend' })
  const legendOn = legendSwitch.getByRole('button', { name: 'On' })
  const legendOff = legendSwitch.getByRole('button', { name: 'Off' })
  await expect(legendOn).toHaveAttribute('aria-pressed', 'true')

  await toolsPanel.getByRole('button', { name: 'Boat', exact: true }).click()
  const canvas = page.locator('.editor-canvas canvas').first()
  await canvas.click({ position: { x: 260, y: 220 } })
  const visibleLegend = await canvas.screenshot()

  await legendOff.click()
  await expect(legendOff).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await canvas.screenshot()).equals(visibleLegend)).toBe(false)

  await legendOn.click()
  await expect(legendOn).toHaveAttribute('aria-pressed', 'true')
  await expect
    .poll(async () => countDifferentPixels(page, await canvas.screenshot(), visibleLegend))
    .toBeLessThanOrEqual(2)
})

test('uses a dedicated boat palette for the dark plot', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Desktop sidebar is hidden in compact mode')
  await page.goto('/')

  const plotBackground = page
    .locator('.tools-panel')
    .getByRole('group', { name: 'Plot background' })
  await plotBackground.getByRole('button', { name: 'Dark' }).click()
  await page.getByRole('button', { name: 'Boat', exact: true }).first().click()
  await page
    .locator('canvas')
    .first()
    .click({ position: { x: 320, y: 240 } })

  const colorSelector = page.locator('button[aria-label="Open Hull color selector"]:visible')
  await colorSelector.click()
  await expect(page.getByLabel('Heisel dark sailing palette')).toBeVisible()
  await page.getByRole('button', { name: 'Use palette color Glacier blue #79B8D1' }).click()
  await expect(colorSelector).toContainText('#79B8D1')

  await plotBackground.getByRole('button', { name: 'Light' }).click()
  await expect(colorSelector).toContainText('#18324A')
  await plotBackground.getByRole('button', { name: 'Dark' }).click()
  await expect(colorSelector).toContainText('#79B8D1')
})

test('uses clear compact tool buttons without a separate Lee mark', async ({ page }, testInfo) => {
  await page.goto('/')
  if (testInfo.project.name === 'desktop-chrome') {
    await expect(page.locator('.document-save-status')).toHaveAttribute('data-state', 'browser')
    await page.getByRole('button', { name: 'View: Auto layout' }).click()
  }

  const compactTools = page.locator('.tool-grid--compact:visible')
  await expect(compactTools).toBeVisible()
  const compactToolbar = page.locator('.mobile-toolbar-inner:visible')
  const returnToSelect = compactToolbar.getByRole('button', { name: 'Return to Select' })
  const deleteSelection = compactToolbar.getByRole('button', { name: 'Delete selection' })
  const sceneSettings = compactToolbar.getByRole('button', { name: 'Scene settings' })
  const settingsDivider = compactToolbar.locator('.mobile-toolbar-divider')
  await expect(returnToSelect).toHaveCount(0)
  await expect(deleteSelection).toHaveCount(0)
  await expect(sceneSettings).toBeVisible()
  await expect(settingsDivider).toBeVisible()
  const settingsBounds = await sceneSettings.boundingBox()
  const dividerBounds = await settingsDivider.boundingBox()
  const selectBounds = await compactTools.getByRole('button', { name: 'Select' }).boundingBox()
  expect(settingsBounds).not.toBeNull()
  expect(dividerBounds).not.toBeNull()
  expect(selectBounds).not.toBeNull()
  expect(dividerBounds!.x).toBeGreaterThan(settingsBounds!.x + settingsBounds!.width)
  expect(dividerBounds!.x + dividerBounds!.width).toBeLessThan(selectBounds!.x)
  await sceneSettings.click()
  const settingsDialog = page.getByRole('dialog', { name: 'Scene settings' })
  await expect(settingsDialog).toBeVisible()
  await expect(settingsDialog.getByLabel('Wind direction slider')).toBeVisible()
  await expect(settingsDialog.getByLabel('Grid visibility slider')).toBeVisible()
  await settingsDialog.getByRole('button', { name: 'Close dialog' }).click()
  await expect(settingsDialog).toHaveCount(0)
  await expect(compactTools.getByRole('button', { name: 'Lee mark', exact: true })).toHaveCount(0)
  const compactGate = compactTools.getByRole('button', { name: 'Gate', exact: true })
  await expect(compactGate.locator('svg')).toHaveAttribute('data-icon', 'sailing-gate')
  await expect(compactGate).toHaveCSS('border-top-width', '1px')
  await expect(compactGate).toHaveCSS('background-color', 'rgb(64, 64, 64)')

  const compactBoat = compactTools.getByRole('button', { name: 'Boat', exact: true })
  await compactBoat.click()
  await expect(returnToSelect).toBeVisible()
  await expect(returnToSelect).toHaveCSS('border-top-color', 'rgb(223, 63, 63)')
  const returnBounds = await returnToSelect.boundingBox()
  const firstToolBounds = await compactTools.getByRole('button').first().boundingBox()
  expect(returnBounds).not.toBeNull()
  expect(firstToolBounds).not.toBeNull()
  expect(returnBounds!.x).toBeLessThan(firstToolBounds!.x)
  expect(returnBounds!.height).toBe(firstToolBounds!.height)

  await page
    .locator('canvas')
    .first()
    .click({ position: { x: 220, y: 180 } })
  await expect(deleteSelection).toBeVisible()
  await expect(deleteSelection.locator('svg')).toHaveClass(/lucide-trash2/)
  const deleteBounds = await deleteSelection.boundingBox()
  expect(deleteBounds).not.toBeNull()
  expect(deleteBounds!.x).toBeGreaterThan(returnBounds!.x)
  expect(deleteBounds!.x).toBeLessThan(firstToolBounds!.x)
  await returnToSelect.click()
  await expect(compactTools.getByRole('button', { name: 'Select' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(returnToSelect).toHaveCount(0)
  await deleteSelection.click()
  await expect(page.locator('.statusbar')).toContainText('0 objects')
  await expect(deleteSelection).toHaveCount(0)
})

test('anchors equal-width mobile properties at the top right and names the selection', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone', 'Mobile properties layout check')
  await page.goto('/')

  const compactTools = page.locator('.tool-grid--compact:visible')
  const canvas = page.locator('canvas').first()
  await compactTools.getByRole('button', { name: 'Boat', exact: true }).click()
  await canvas.click({ position: { x: 220, y: 180 } })

  const panel = page.locator('.mobile-properties:visible')
  let toggle = panel.locator('.mobile-properties-toggle')
  await expect(toggle).toContainText('Properties – ILCA')
  await expect(toggle.locator('svg')).toHaveClass(/lucide-chevron-down/)
  const closedBounds = await panel.boundingBox()
  const headerBounds = await page.locator('.topbar').boundingBox()
  const viewport = page.viewportSize()
  expect(closedBounds).not.toBeNull()
  expect(headerBounds).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(Math.abs(closedBounds!.y - (headerBounds!.y + headerBounds!.height))).toBeLessThanOrEqual(
    1,
  )
  expect(viewport!.width - (closedBounds!.x + closedBounds!.width)).toBeLessThanOrEqual(9)

  await toggle.click()
  await expect(toggle.locator('svg')).toHaveClass(/lucide-chevron-up/)
  await panel.getByRole('textbox', { name: 'Sail no.' }).fill('SUI 123')
  await panel.getByRole('textbox', { name: 'Name' }).fill('Alpha')
  await expect(toggle.locator('.mobile-properties-title')).toHaveText(
    'Properties – ILCA – SUI 123 – Alpha',
  )
  const openBounds = await panel.boundingBox()
  expect(openBounds).not.toBeNull()
  expect(Math.abs(openBounds!.width - closedBounds!.width)).toBeLessThan(1)
  expect(Math.abs(openBounds!.x - closedBounds!.x)).toBeLessThan(1)
  await expect(panel.locator('.mobile-properties-body .panel-heading')).toBeHidden()

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')

  await compactTools.getByRole('button', { name: 'Mark', exact: true }).click()
  await canvas.click({ position: { x: 260, y: 220 } })
  toggle = page.locator('.mobile-properties:visible .mobile-properties-toggle')
  await expect(toggle).toContainText('Properties – Mark 1')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')

  await compactTools.getByRole('button', { name: 'Line', exact: true }).click()
  await canvas.click({ position: { x: 120, y: 120 } })
  await canvas.click({ position: { x: 220, y: 180 } })
  await expect(page.locator('.mobile-properties:visible .mobile-properties-toggle')).toContainText(
    'Properties – Line',
  )
})

test('creates lines and shapes by dragging or with two clicks and a shared editable stroke width', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Desktop drawing interaction check')
  await page.goto('/')

  const canvas = page.locator('canvas').first()
  const tools = page.locator('.tools-panel')
  const properties = page.locator('.properties-panel')
  const status = page.locator('.statusbar')
  const drawWithTwoClicks = async (
    tool: 'Line' | 'Arrow' | 'Rectangle' | 'Circle',
    start: { x: number; y: number },
    end: { x: number; y: number },
    previousCount: number,
  ) => {
    const toolButton = tools.getByRole('button', { name: tool, exact: true })
    await toolButton.click()
    await canvas.click({ position: start })
    await expect(status).toContainText(`${previousCount} object${previousCount === 1 ? '' : 's'}`)
    await expect(toolButton).toHaveAttribute('aria-pressed', 'true')
    await canvas.click({ position: end })
    await expect(status).toContainText(`${previousCount + 1} object${previousCount ? 's' : ''}`)
    await expect(properties.getByRole('heading', { name: tool, level: 2 })).toBeVisible()
    const strokeWidth = properties.getByRole('spinbutton', { name: 'Stroke width' })
    await expect(strokeWidth).toHaveValue('3')
    return strokeWidth
  }
  const drawByDragging = async (
    tool: 'Line' | 'Rectangle',
    start: { x: number; y: number },
    end: { x: number; y: number },
    previousCount: number,
  ) => {
    const toolButton = tools.getByRole('button', { name: tool, exact: true })
    const bounds = await canvas.boundingBox()
    expect(bounds).not.toBeNull()
    await toolButton.click()
    await page.mouse.move(bounds!.x + start.x, bounds!.y + start.y)
    await page.mouse.down()
    await page.mouse.move(bounds!.x + end.x, bounds!.y + end.y)
    await expect(status).toContainText(`${previousCount} object${previousCount === 1 ? '' : 's'}`)
    await page.mouse.up()
    await expect(status).toContainText(`${previousCount + 1} object${previousCount ? 's' : ''}`)
    await expect(properties.getByRole('heading', { name: tool, level: 2 })).toBeVisible()
    const strokeWidth = properties.getByRole('spinbutton', { name: 'Stroke width' })
    await expect(strokeWidth).toHaveValue('3')
    return strokeWidth
  }

  const lineStrokeWidth = await drawByDragging('Line', { x: 120, y: 120 }, { x: 220, y: 120 }, 0)
  await lineStrokeWidth.fill('6')
  await expect(lineStrokeWidth).toHaveValue('6')

  const canvasBounds = await canvas.boundingBox()
  expect(canvasBounds).not.toBeNull()
  await page.mouse.move(canvasBounds!.x + 220, canvasBounds!.y + 120)
  await page.mouse.down()
  await page.mouse.move(canvasBounds!.x + 250, canvasBounds!.y + 120)
  await page.mouse.up()
  await expect(status).toContainText('Moved line endpoint')

  await page.mouse.move(canvasBounds!.x + 185, canvasBounds!.y + 136)
  await page.mouse.down()
  await page.mouse.move(canvasBounds!.x + 215, canvasBounds!.y + 156)
  await page.mouse.up()
  await expect(status).toContainText('Moved line')

  await drawWithTwoClicks('Arrow', { x: 300, y: 120 }, { x: 410, y: 180 }, 1)
  const rectangleTopLeftBefore = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(300, 320, 1, 1).data),
  )
  const oldCenteredRectangleCornerBefore = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(240, 270, 1, 1).data),
  )
  const rectangleRotationGuideBefore = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(330, 295, 1, 1).data),
  )
  await drawByDragging('Rectangle', { x: 300, y: 320 }, { x: 360, y: 370 }, 2)
  await page.waitForTimeout(100)
  const rectangleTopLeftAfter = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(300, 320, 1, 1).data),
  )
  const oldCenteredRectangleCornerAfter = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(240, 270, 1, 1).data),
  )
  const rectangleRotationGuideAfter = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(330, 295, 1, 1).data),
  )
  expect(rectangleTopLeftAfter).not.toEqual(rectangleTopLeftBefore)
  expect(oldCenteredRectangleCornerAfter).toEqual(oldCenteredRectangleCornerBefore)
  expect(rectangleRotationGuideAfter).toEqual(rectangleRotationGuideBefore)

  await page.mouse.move(canvasBounds!.x + 360, canvasBounds!.y + 370)
  await page.mouse.down()
  await page.mouse.move(canvasBounds!.x + 400, canvasBounds!.y + 390)
  await page.mouse.up()
  await expect(status).toContainText('Resized rectangle')

  const circleCenterBefore = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(500, 250, 1, 1).data),
  )
  const circleEdgeBefore = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(550, 250, 1, 1).data),
  )
  const circleRotationGuideBefore = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(500, 175, 1, 1).data),
  )
  const enlargedCircleRightBefore = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(575, 250, 1, 1).data),
  )
  const enlargedCircleBottomBefore = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(500, 325, 1, 1).data),
  )
  await drawWithTwoClicks('Circle', { x: 500, y: 250 }, { x: 550, y: 250 }, 3)
  await page.waitForTimeout(100)
  const circleCenterAfter = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(500, 250, 1, 1).data),
  )
  const circleEdgeAfter = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(550, 250, 1, 1).data),
  )
  const circleRotationGuideAfter = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(500, 175, 1, 1).data),
  )
  expect(circleCenterAfter).toEqual(circleCenterBefore)
  expect(circleEdgeAfter).not.toEqual(circleEdgeBefore)
  expect(circleRotationGuideAfter).toEqual(circleRotationGuideBefore)

  const fillColor = properties.getByRole('button', { name: 'Open Fill color selector' })
  await expect(fillColor).toContainText('No fill')
  await fillColor.click()
  const fillDialog = page.getByRole('dialog', { name: 'Fill color colors' })
  await expect(fillDialog.getByRole('button', { name: 'No fill' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await fillDialog.getByRole('button', { name: 'Use palette color Heisel amber #FFAA00' }).click()
  await expect(fillColor).toContainText('#FFAA00')

  await page.mouse.move(canvasBounds!.x + 550, canvasBounds!.y + 300)
  await page.mouse.down()
  await page.mouse.move(canvasBounds!.x + 580, canvasBounds!.y + 330)
  await page.mouse.up()
  const enlargedCircleRightAfter = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(575, 250, 1, 1).data),
  )
  const enlargedCircleBottomAfter = await canvas.evaluate((element: HTMLCanvasElement) =>
    Array.from(element.getContext('2d')!.getImageData(500, 325, 1, 1).data),
  )
  expect(enlargedCircleRightAfter).not.toEqual(enlargedCircleRightBefore)
  expect(enlargedCircleBottomAfter).not.toEqual(enlargedCircleBottomBefore)
})

test('keeps desktop logo spacing in compact layout', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Compact desktop header check')
  await page.goto('/')
  await expect(page.locator('.document-save-status')).toHaveAttribute('data-state', 'browser')
  const layoutButton = page.locator('.layout-cycle-button')
  await expect(layoutButton).toHaveAccessibleName('View: Auto layout')
  await expect(layoutButton.locator('svg')).toHaveClass(/lucide-view/)
  await expect(layoutButton).toHaveAttribute('data-layout-preference', 'auto')
  await layoutButton.click()
  await expect(layoutButton).toHaveAccessibleName('View: Compact layout')
  await expect(page.locator('.app-shell')).toHaveAttribute('data-layout', 'compact')
  await layoutButton.click()
  await expect(layoutButton).toHaveAccessibleName('View: Desktop layout')
  await expect(page.locator('.app-shell')).toHaveAttribute('data-layout', 'desktop')
  await layoutButton.click()
  await expect(layoutButton).toHaveAccessibleName('View: Auto layout')
  await expect(page.locator('.app-shell')).toHaveAttribute('data-layout', 'auto')
  await layoutButton.click()
  await expect(page.locator('.app-shell')).toHaveAttribute('data-layout', 'compact')

  const headerBounds = await page.locator('.topbar').boundingBox()
  const logoBounds = await page.locator('.app-logo--on-dark').boundingBox()
  expect(headerBounds).not.toBeNull()
  expect(logoBounds).not.toBeNull()
  expect(Math.round(headerBounds!.height)).toBe(52)
  expect(Math.round(logoBounds!.height)).toBe(32)
  const topGap = logoBounds!.y - headerBounds!.y
  const bottomGap = headerBounds!.y + headerBounds!.height - (logoBounds!.y + logoBounds!.height)
  expect(topGap).toBeGreaterThanOrEqual(9)
  expect(bottomGap).toBeGreaterThanOrEqual(9)
  expect(Math.abs(topGap - bottomGap)).toBeLessThanOrEqual(1)
})

test('keeps a long centered title clear of file actions in a narrow desktop header', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Narrow desktop header check')
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.goto('/')

  await page.getByRole('button', { name: 'Rename plot' }).click()
  const details = page.getByRole('dialog', { name: 'Plot details' })
  await details
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('International championship start-line training and tactical preparation')
  await details.getByRole('button', { name: 'Done' }).click()

  const title = page.locator('.topbar-document')
  const exportButton = page.getByRole('button', { name: 'Export / Share' })
  const rightActions = page.locator('.topbar > .topbar-actions:not(.topbar-actions--file)')
  const titleBounds = await title.boundingBox()
  const exportBounds = await exportButton.boundingBox()
  const rightBounds = await rightActions.boundingBox()
  expect(titleBounds).not.toBeNull()
  expect(exportBounds).not.toBeNull()
  expect(rightBounds).not.toBeNull()
  expect(exportBounds!.x + exportBounds!.width).toBeLessThanOrEqual(titleBounds!.x)
  expect(titleBounds!.x + titleBounds!.width).toBeLessThanOrEqual(rightBounds!.x)
  await expect(exportButton.locator('span')).toBeHidden()
})

test('renames the plot from the centered title and keeps import inside Projects', async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === 'desktop-chrome') {
    await page.setViewportSize({ width: 1440, height: 900 })
  }
  await page.goto('/')
  const header = page.locator('.topbar')
  await expect(header.getByRole('button', { name: 'Plot details' })).toHaveCount(0)
  await expect(header.getByRole('button', { name: 'Import JSON' })).toHaveCount(0)

  await header.getByRole('button', { name: 'Rename plot' }).click()
  const details = page.getByRole('dialog')
  await expect(details).toContainText('Plot details')
  await expect(details.getByText('Additional information', { exact: true })).toBeVisible()
  const ruleReferences = details.getByRole('textbox', { name: 'Rule references' })
  await ruleReferences.fill('10,')
  await expect(details.locator('.rule-reference-chip')).toHaveText(['RRS 10'])
  await ruleReferences.fill('18.2a')
  await ruleReferences.press('Enter')
  await expect(details.locator('.rule-reference-chip')).toHaveText(['RRS 10', 'RRS 18.2(a)'])
  await details.getByRole('button', { name: 'Remove rule reference RRS 10' }).click()
  await expect(details.locator('.rule-reference-chip')).toHaveText(['RRS 18.2(a)'])
  const firstInformationName = details.getByRole('textbox', {
    name: 'Information name 1',
  })
  const firstInformationValue = details.getByRole('textbox', {
    name: 'Information value 1',
  })
  await expect(firstInformationName).toHaveAttribute('placeholder', 'Wind strength')
  await firstInformationValue.fill('12 kn')
  await details.getByRole('textbox', { name: 'Title', exact: true }).fill('Start practice')
  await details.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('.topbar-document-title')).toHaveText('Start practice')

  await header.getByRole('button', { name: 'Rename plot' }).click()
  const reopenedDetails = page.getByRole('dialog')
  await expect(reopenedDetails.locator('.rule-reference-chip')).toHaveText(['RRS 18.2(a)'])
  await expect(reopenedDetails.getByRole('textbox', { name: 'Information name 1' })).toHaveValue(
    'Wind strength',
  )
  await expect(reopenedDetails.getByRole('textbox', { name: 'Information value 1' })).toHaveValue(
    '12 kn',
  )
  await reopenedDetails.getByRole('textbox', { name: 'Information name 1' }).fill('Wave height')
  await reopenedDetails.getByRole('textbox', { name: 'Information value 1' }).fill('0.5 m')
  await reopenedDetails.getByRole('button', { name: 'Done' }).click()

  await header.getByRole('button', { name: 'Open projects & templates' }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Import JSON' })).toBeVisible()
})

test('adds, replaces and removes up to ten additional information fields', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone', 'Mobile additional-information workflow')
  await page.goto('/')
  await page.getByRole('button', { name: 'Rename plot' }).click()

  const details = page.getByRole('dialog', { name: 'Plot details' })
  const firstName = details.getByRole('textbox', { name: 'Information name 1' })
  const firstValue = details.getByRole('textbox', { name: 'Information value 1' })
  await expect(firstName).toHaveAttribute('placeholder', 'Wind strength')
  await firstName.fill('Wave height')
  await firstValue.fill('0.5 m')

  const addInformation = details.getByRole('button', { name: 'Add information' })
  for (let index = 1; index < 10; index += 1) await addInformation.click()
  await expect(details.locator('.additional-information-row')).toHaveCount(10)
  await expect(details.getByText('10 of 10')).toBeVisible()
  await expect(addInformation).toBeDisabled()
  await expect
    .poll(() =>
      details.locator('.modal-body').evaluate((body) => body.scrollWidth <= body.clientWidth),
    )
    .toBe(true)

  await details.getByRole('button', { name: 'Remove information 10' }).click()
  await expect(details.locator('.additional-information-row')).toHaveCount(9)
  await expect(addInformation).toBeEnabled()
  await details.getByRole('button', { name: 'Done' }).click()

  await page.getByRole('button', { name: 'Rename plot' }).click()
  const reopenedDetails = page.getByRole('dialog', { name: 'Plot details' })
  await expect(reopenedDetails.locator('.additional-information-row')).toHaveCount(1)
  await expect(reopenedDetails.getByRole('textbox', { name: 'Information name 1' })).toHaveValue(
    'Wave height',
  )
  await reopenedDetails.getByRole('button', { name: 'Remove information 1' }).click()
  await expect(reopenedDetails.getByText('No additional information.')).toBeVisible()
  await reopenedDetails.getByRole('button', { name: 'Done' }).click()

  await page.getByRole('button', { name: 'Rename plot' }).click()
  await expect(page.getByRole('dialog').locator('.additional-information-row')).toHaveCount(0)
})

test('keeps an empty mobile title draft editable and provides a clear button', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone', 'Mobile title editing check')
  await page.goto('/')

  await page.getByRole('button', { name: 'Rename plot' }).click()
  const dialog = page.getByRole('dialog', { name: 'Plot details' })
  const titleInput = dialog.getByRole('textbox', { name: 'Title', exact: true })
  const clearTitle = dialog.getByRole('button', { name: 'Clear title' })
  const titleBox = dialog.locator('.clearable-input')

  const boxBounds = await titleBox.boundingBox()
  const inputBounds = await titleInput.boundingBox()
  const clearBounds = await clearTitle.boundingBox()
  expect(boxBounds).not.toBeNull()
  expect(inputBounds).not.toBeNull()
  expect(clearBounds).not.toBeNull()
  expect(clearBounds!.x).toBeGreaterThan(inputBounds!.x)
  expect(
    Math.abs(clearBounds!.x + clearBounds!.width - (boxBounds!.x + boxBounds!.width)),
  ).toBeLessThanOrEqual(1)

  await titleInput.fill('')
  await page.waitForTimeout(500)
  await expect(titleInput).toHaveValue('')
  await titleInput.fill('Temporary title')
  await expect(clearTitle).toBeEnabled()
  await clearTitle.click()
  await expect(titleInput).toBeFocused()
  await expect(titleInput).toHaveValue('')

  await titleInput.fill('Mobile start training')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('.topbar-document-title')).toHaveText('Mobile start training')
})

test('keeps the saved state stable while autosaving and marks downloads', async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === 'desktop-chrome') {
    await page.setViewportSize({ width: 1440, height: 900 })
  }
  await page.goto('/')
  const documentStatus = page.locator('.document-save-status')

  await expect(documentStatus).toHaveAttribute('data-state', 'browser')
  await expect(documentStatus).toHaveAttribute('title', 'Saved in browser')
  await expect(documentStatus.locator('.document-save-status-dot')).toHaveCSS(
    'background-color',
    'rgb(34, 197, 94)',
  )

  if (testInfo.project.name === 'iphone') {
    await expect(page.locator('.statusbar')).toBeHidden()
    await expect(documentStatus).toBeVisible()
    await expect(documentStatus.locator('.document-save-status-label')).toBeHidden()
  }

  await page.getByRole('button', { name: 'Rename plot' }).click()
  const details = page.getByRole('dialog')
  await details.getByRole('textbox', { name: 'Title', exact: true }).fill('Status test')
  await expect(documentStatus).toHaveAttribute('data-state', 'browser')
  await page.waitForTimeout(1000)
  await expect(documentStatus).toHaveAttribute('data-state', 'browser')
  await details.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('.statusbar')).toContainText('Saved locally', { timeout: 5000 })

  await page.getByRole('button', { name: 'Export / Share' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('dialog').getByRole('button', { name: 'Download JSON' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('status-test.sailplot.json')
  await expect(documentStatus).toHaveAttribute('data-state', 'downloaded')
  await expect(documentStatus).toHaveAttribute('title', 'Downloaded')
})

test('exports watermarked images, copies share URLs and downloads an A4 landscape PDF', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => sessionStorage.setItem('copied-export-url', value),
      },
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Boat', exact: true }).first().click()
  await page
    .locator('.editor-canvas canvas')
    .first()
    .click({ position: { x: 260, y: 220 } })
  await page.getByRole('button', { name: 'Export / Share' }).click()

  const dialog = page.getByRole('dialog', { name: 'Export & share' })
  await expect(dialog.locator('.export-option-title strong')).toHaveText([
    'Share link',
    'Plot JSON',
    'PNG image',
    'Transparent PNG',
    'PDF document',
  ])
  const infoButtons = dialog.locator('.export-info-button')
  await expect(infoButtons).toHaveCount(5)
  await infoButtons.nth(2).hover()
  await expect(dialog.getByRole('tooltip').nth(2)).toContainText(
    'Choose 2× for screens and everyday use, or 4× for sharper print and detailed output.',
  )

  const pngActions = dialog.getByRole('group', { name: 'PNG resolution' })
  const png2x = pngActions.getByRole('button', { name: 'Download PNG at 2×' })
  const png4x = pngActions.getByRole('button', { name: 'Download PNG at 4×' })
  const png2xBounds = await png2x.boundingBox()
  const png4xBounds = await png4x.boundingBox()
  expect(png2xBounds).not.toBeNull()
  expect(png4xBounds).not.toBeNull()
  expect(Math.abs(png2xBounds!.y - png4xBounds!.y)).toBeLessThan(1)
  expect(png4xBounds!.x).toBeGreaterThan(png2xBounds!.x)
  await expect(dialog.getByRole('button', { name: 'Download transparent PNG at 4×' })).toBeVisible()

  const copyButton = dialog.locator('.export-copy-button')
  await expect(copyButton).toHaveAccessibleName('Copy URL with project')
  await copyButton.click()
  await expect(copyButton).toHaveText('Copied')
  await expect(copyButton).toHaveCSS('background-color', 'rgb(34, 197, 94)')
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('copied-export-url')))
    .toContain('#1')
  const copiedPlotUrl = await page.evaluate(() => sessionStorage.getItem('copied-export-url'))
  expect(copiedPlotUrl).not.toBeNull()

  const watermarkLogoResponse = await page.request.get('/assets/heisel-analytics-logo-on-light.png')
  expect(watermarkLogoResponse.ok()).toBe(true)
  const productLogoResponse = await page.request.get('/icons/sailplot-logo-on-light.svg')
  expect(productLogoResponse.ok()).toBe(true)
  const pngDownloadPromise = page.waitForEvent('download')
  await png2x.click()
  const pngDownload = await pngDownloadPromise
  expect(pngDownload.suggestedFilename()).toBe('untitled-plot-2x.png')
  const pngPath = await pngDownload.path()
  expect(pngPath).not.toBeNull()
  if (await page.evaluate(() => 'BarcodeDetector' in window)) {
    const pngDataUrl = `data:image/png;base64,${(await readFile(pngPath!)).toString('base64')}`
    const decodedQrValues = await page.evaluate(async (source) => {
      const image = new Image()
      image.src = source
      await image.decode()
      const BarcodeDetectorClass = (
        window as unknown as {
          BarcodeDetector: new (options: { formats: string[] }) => {
            detect: (image: HTMLImageElement) => Promise<Array<{ rawValue: string }>>
          }
        }
      ).BarcodeDetector
      const detector = new BarcodeDetectorClass({ formats: ['qr_code'] })
      return (await detector.detect(image)).map((result) => result.rawValue)
    }, pngDataUrl)
    expect(decodedQrValues).toContain(copiedPlotUrl)
  }

  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.printCalled = 'true'
    }
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
  })
  await expect.poll(() => page.evaluate(() => window.isSecureContext)).toBe(false)
  const pdfDownloadPromise = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download PDF', exact: true }).click()
  const pdfDownload = await pdfDownloadPromise
  expect(pdfDownload.suggestedFilename()).toBe('untitled-plot.pdf')
  const pdfPath = await pdfDownload.path()
  expect(pdfPath).not.toBeNull()
  const pdfContents = await readFile(pdfPath!)
  expect(pdfContents.subarray(0, 5).toString()).toBe('%PDF-')
  const pdfText = pdfContents.toString('latin1')
  expect(pdfText).toContain('https://sailplot.app/')
  expect(pdfText).toContain('https://heiselanalytics.one/')
  expect(pdfText).toContain('#1')
  await expect(page.locator('html')).not.toHaveAttribute('data-print-called', 'true')
  await expect(page.locator('.statusbar')).toContainText('Downloaded PDF')

  const reopenedPage = await page.context().newPage()
  await reopenedPage.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => sessionStorage.setItem('copied-export-url', value),
      },
    })
  })
  await reopenedPage.goto(copiedPlotUrl!)
  await reopenedPage.getByRole('button', { name: 'Export / Share' }).click()
  await reopenedPage.getByRole('button', { name: 'Copy URL with project' }).click()
  await expect
    .poll(() => reopenedPage.evaluate(() => sessionStorage.getItem('copied-export-url')))
    .toBe(copiedPlotUrl)
  await reopenedPage.close()
})

test('shows the export branding on the plot canvas', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'desktop-chrome') {
    await page.setViewportSize({ width: 1440, height: 900 })
  }
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
  const headerBounds = await page.locator('.topbar').boundingBox()
  const titleBounds = await page.locator('.topbar-document').boundingBox()
  const viewport = page.viewportSize()
  expect(logoBounds).not.toBeNull()
  expect(headerBounds).not.toBeNull()
  expect(titleBounds).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(logoBounds!.x).toBeLessThanOrEqual(12)
  expect(logoBounds!.width).toBeGreaterThanOrEqual(testInfo.project.name === 'iphone' ? 34 : 160)
  if (testInfo.project.name === 'iphone') {
    const logoCenter = logoBounds!.y + logoBounds!.height / 2
    const headerCenter = headerBounds!.y + headerBounds!.height / 2
    expect(Math.abs(logoCenter - headerCenter)).toBeLessThanOrEqual(1)
  }
  const fileActions = page.locator('.topbar-actions--file')
  const newPlot = fileActions.getByRole('button', { name: 'New', exact: true })
  const openProjects = fileActions.getByRole('button', { name: 'Open projects & templates' })
  const download = fileActions.getByRole('button', { name: 'Export / Share' })
  if (testInfo.project.name === 'iphone') await expect(newPlot).toBeHidden()
  else await expect(newPlot).toBeVisible()
  await expect(openProjects).toBeVisible()
  await expect(download).toBeVisible()
  if (testInfo.project.name !== 'desktop-chrome') {
    await expect(openProjects.locator('span')).toBeHidden()
    await expect(download.locator('span')).toBeHidden()
  } else {
    await expect(newPlot.locator('span')).toHaveText('New')
    await expect(openProjects.locator('span')).toHaveText('Open projects & templates')
    await expect(download.locator('span')).toHaveText('Export / Share')
  }
  if (testInfo.project.name === 'desktop-chrome') {
    const fileActionBounds = await fileActions.boundingBox()
    expect(fileActionBounds).not.toBeNull()
    expect(fileActionBounds!.x - (logoBounds!.x + logoBounds!.width)).toBeGreaterThanOrEqual(28)
  }
  expect(Math.abs(titleBounds!.x + titleBounds!.width / 2 - viewport!.width / 2)).toBeLessThan(1)
  const verticallyAligned = [
    page.locator('.topbar-document'),
    ...(testInfo.project.name === 'iphone' ? [] : [newPlot]),
    openProjects,
    download,
    testInfo.project.name === 'desktop-chrome'
      ? page.locator('.language-switch')
      : page.getByRole('button', { name: 'Menu', exact: true }),
  ]
  const verticalCenters = await Promise.all(
    verticallyAligned.map(async (element) => {
      const bounds = await element.boundingBox()
      if (!bounds) throw new Error('Header control bounds are unavailable')
      return bounds.y + bounds.height / 2
    }),
  )
  expect(Math.max(...verticalCenters) - Math.min(...verticalCenters)).toBeLessThan(1)
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

  if (testInfo.project.name !== 'desktop-chrome') {
    await expect(credit).toHaveClass(/mobile-branding-bar/)
    await expect(credit).toHaveCSS('display', 'grid')
    await expect(page.locator('.canvas-branding')).toHaveCount(0)
    await expect(credit.getByRole('img', { name: 'SailPlot' })).toBeVisible()
    await expect(credit.getByRole('link', { name: 'SailPlot' })).toHaveAttribute(
      'href',
      'https://sailplot.app/',
    )
    await expect(credit.locator('.mobile-branding-menu-trigger')).toHaveCount(0)
    const partnerLogoMenu = credit.getByRole('button', { name: /Open menu/ })
    await expect(partnerLogoMenu.locator('img')).toBeVisible()
    const compactBounds = await credit.boundingBox()
    expect(compactBounds).not.toBeNull()
    expect(compactBounds!.x + compactBounds!.width).toBeCloseTo(viewport!.width, 0)

    await partnerLogoMenu.click()
    const brandingMenu = credit.getByRole('menu')
    await expect(brandingMenu).toHaveCSS('z-index', '50')
    await expect(page.locator('.mobile-properties')).toHaveCSS('z-index', '40')
    await expect(brandingMenu.getByRole('menuitem', { name: 'Information' })).toBeVisible()
    await expect(brandingMenu.getByRole('menuitem', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://heiselanalytics.one/',
    )
    await expect(brandingMenu.getByRole('menuitem', { name: 'Legal Notice' })).toHaveAttribute(
      'href',
      'https://heiselanalytics.one/impressum',
    )
    await brandingMenu.getByRole('menuitem', { name: 'Information' }).click()
    await expect(page.getByRole('dialog')).toContainText('Help & information')
    return
  }

  await expect(credit).toHaveCSS('display', 'flex')
  await expect(credit).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.86)')
  await expect(page.locator('.brand-credit')).toHaveCount(0)
  await expect(credit.getByRole('img', { name: 'SailPlot' })).toBeVisible()
  await expect(credit.getByRole('img', { name: 'Heisel Analytics' })).toBeVisible()
  const partnerMenuButton = credit.getByRole('button', {
    name: /Heisel Analytics: Open menu/,
  })
  await expect(partnerMenuButton).toBeVisible()
  await partnerMenuButton.hover()
  await expect(credit.getByRole('link', { name: 'SailPlot' })).toHaveAttribute(
    'href',
    'https://sailplot.app/',
  )
  const plotButton = page.getByRole('button', { name: 'Open this plot' })
  await expect(plotButton.getByRole('img', { name: 'QR code for this plot' })).toHaveAttribute(
    'src',
    /^data:image\/svg\+xml/,
  )
  await plotButton.click()
  let qrDialog = page.getByRole('dialog', { name: 'QR code for this plot' })
  await expect(qrDialog.getByRole('img', { name: 'QR code for this plot' })).toHaveAttribute(
    'src',
    /^data:image\/svg\+xml/,
  )
  const [initialSharedPlot] = await Promise.all([
    page.context().waitForEvent('page'),
    qrDialog.getByRole('button', { name: 'Duplicate into new tab' }).click(),
  ])
  await initialSharedPlot.waitForLoadState()
  const plotHrefAt100Percent = initialSharedPlot.url()
  expect(plotHrefAt100Percent).toMatch(/#1/)
  await expect(initialSharedPlot.locator('.statusbar')).toContainText('100%')
  await initialSharedPlot.close()
  await qrDialog.getByRole('button', { name: 'Close dialog' }).click()

  await partnerMenuButton.click()
  const partnerMenu = credit.getByRole('menu')
  await expect(partnerMenu.getByRole('menuitem', { name: 'Information' })).toBeVisible()
  await expect(partnerMenu.getByRole('menuitem', { name: 'Website' })).toHaveAttribute(
    'href',
    'https://heiselanalytics.one/',
  )
  await expect(partnerMenu.getByRole('menuitem', { name: 'Legal Notice' })).toHaveAttribute(
    'href',
    'https://heiselanalytics.one/impressum',
  )
  await page.keyboard.press('Escape')
  await expect(partnerMenu).toBeHidden()

  const bounds = await credit.boundingBox()
  const visualBounds = await credit.locator('.canvas-branding-visual').boundingBox()
  const logoColumnBounds = await credit.locator('.canvas-branding-logos').boundingBox()
  const qrBounds = await page.locator('.canvas-top-right-overlay').boundingBox()
  const poweredByBounds = await credit.locator('.canvas-branding-partner span').boundingBox()
  const partnerLogoBounds = await credit.locator('.canvas-branding-partner img').boundingBox()
  const productRowBounds = await credit.locator('.canvas-branding-product').boundingBox()
  const productLogoBounds = await credit.locator('.canvas-branding-product img').boundingBox()
  const canvasBounds = await page.locator('.canvas-area').boundingBox()
  expect(bounds).not.toBeNull()
  expect(visualBounds).not.toBeNull()
  expect(logoColumnBounds).not.toBeNull()
  expect(qrBounds).not.toBeNull()
  expect(poweredByBounds).not.toBeNull()
  expect(partnerLogoBounds).not.toBeNull()
  expect(productRowBounds).not.toBeNull()
  expect(productLogoBounds).not.toBeNull()
  expect(canvasBounds).not.toBeNull()
  expect(visualBounds!.width / visualBounds!.height).toBeCloseTo(40 / 25, 1)
  expect(Math.abs(visualBounds!.height - logoColumnBounds!.height)).toBeLessThan(1)
  expect(
    Math.abs(
      poweredByBounds!.y +
        poweredByBounds!.height -
        (partnerLogoBounds!.y + partnerLogoBounds!.height),
    ),
  ).toBeLessThan(1)
  const fitScale = Math.min(canvasBounds!.width / 1920, canvasBounds!.height / 1080)
  const fittedPlotWidth = 1920 * fitScale
  const fittedPlotHeight = 1080 * fitScale
  const fittedPlotRight = canvasBounds!.x + (canvasBounds!.width + fittedPlotWidth) / 2
  const fittedPlotTop = canvasBounds!.y + (canvasBounds!.height - fittedPlotHeight) / 2
  const fittedPlotBottom = fittedPlotTop + fittedPlotHeight
  expect(fittedPlotRight - (bounds!.x + bounds!.width)).toBeCloseTo(12, 0)
  expect(fittedPlotBottom - (bounds!.y + bounds!.height)).toBeCloseTo(12, 0)
  expect(fittedPlotRight - (qrBounds!.x + qrBounds!.width)).toBeCloseTo(12, 0)
  expect(qrBounds!.y - fittedPlotTop).toBeCloseTo(12, 0)

  if (testInfo.project.name === 'desktop-chrome') {
    await page.mouse.move(
      canvasBounds!.x + canvasBounds!.width / 2,
      canvasBounds!.y + canvasBounds!.height / 2,
    )
    await page.mouse.wheel(0, -800)
    await expect
      .poll(async () => {
        const zoomedBounds = await credit.boundingBox()
        if (!zoomedBounds) return false
        return (
          zoomedBounds.x >= canvasBounds!.x + 5 &&
          zoomedBounds.y >= canvasBounds!.y + 5 &&
          zoomedBounds.x + zoomedBounds.width <= canvasBounds!.x + canvasBounds!.width - 5 &&
          zoomedBounds.y + zoomedBounds.height <= canvasBounds!.y + canvasBounds!.height - 5
        )
      })
      .toBe(true)
    await plotButton.click()
    qrDialog = page.getByRole('dialog', { name: 'QR code for this plot' })
    const [zoomedSharedPlot] = await Promise.all([
      page.context().waitForEvent('page'),
      qrDialog.getByRole('button', { name: 'Duplicate into new tab' }).click(),
    ])
    await zoomedSharedPlot.waitForLoadState()
    expect(zoomedSharedPlot.url()).toBe(plotHrefAt100Percent)
    await expect(zoomedSharedPlot.locator('.statusbar')).toContainText('100%')
    await zoomedSharedPlot.close()
    await qrDialog.getByRole('button', { name: 'Close dialog' }).click()
  }

  await partnerMenuButton.click()
  await credit.getByRole('menuitem', { name: 'Information' }).click()
  await expect(page.getByRole('dialog')).toContainText('Help & information')
})

test('creates a clean plot from New before Open projects', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chrome',
    'New text button is a desktop header action',
  )
  await page.goto('/')
  await expect(page.locator('.document-save-status')).toHaveAttribute('data-state', 'browser')

  const fileActions = page.locator('.topbar-actions--file')
  const newPlot = fileActions.getByRole('button', { name: 'New', exact: true })
  const openProjects = fileActions.getByRole('button', { name: 'Open projects & templates' })
  const newBounds = await newPlot.boundingBox()
  const openBounds = await openProjects.boundingBox()
  expect(newBounds).not.toBeNull()
  expect(openBounds).not.toBeNull()
  expect(newBounds!.x).toBeLessThan(openBounds!.x)

  await page.getByRole('button', { name: 'Boat', exact: true }).first().click()
  await page
    .locator('canvas')
    .first()
    .click({ position: { x: 320, y: 240 } })
  await expect(page.locator('.statusbar')).toContainText('1 object')
  await newPlot.click()

  await expect(page.locator('.topbar-document-title')).toHaveText('Untitled plot 1')
  await expect(page.locator('.statusbar')).toContainText('0 objects')
  await expect(
    page.locator('.tools-panel').getByRole('button', { name: 'Select' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled()

  await newPlot.click()
  await expect(page.locator('.topbar-document-title')).toHaveText('Untitled plot 2')
})

test('creates a boat and exposes touch-friendly editor controls', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.topbar-document-title')).toHaveText('Untitled plot')
  await page.getByRole('button', { name: 'Boat' }).first().click()
  const canvas = page.locator('canvas').first()
  await canvas.click({ position: { x: 320, y: 240 } })
  await openMobileProperties(page)
  const boatBadge = page.locator('.badge:visible')
  if (await boatBadge.count()) {
    await expect(boatBadge).toHaveText('boat')
    await expect(boatBadge).toHaveCSS('background-color', 'rgb(255, 170, 0)')
    await expect(boatBadge).toHaveCSS('color', 'rgb(23, 23, 23)')
  } else {
    await expect(page.locator('.mobile-properties-toggle:visible')).toContainText(
      'Properties – ILCA',
    )
  }
  await expect(page.locator('.property-section-title:visible')).toHaveText('Sails')
  await expect(page.getByText('Canvas label', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Static state marker', { exact: true })).toHaveCount(0)
  const boatProperties = page.locator('.properties-content:visible')
  await expect(boatProperties.getByRole('button', { name: 'Hide' })).toHaveCount(0)
  await expect(boatProperties.getByRole('button', { name: 'Add static position' })).toHaveCount(0)
  const bringForward = boatProperties.getByRole('button', { name: 'Forward' })
  const sendBackward = boatProperties.getByRole('button', { name: 'Backward' })
  const deleteBoat = boatProperties.getByRole('button', { name: 'Delete' })
  const bringForwardBounds = await bringForward.boundingBox()
  const sendBackwardBounds = await sendBackward.boundingBox()
  const deleteBoatBounds = await deleteBoat.boundingBox()
  const layerOrderHeading = boatProperties.getByRole('heading', {
    name: 'Layer order',
    level: 3,
  })
  const layerOrderBounds = await layerOrderHeading.boundingBox()
  expect(bringForwardBounds).not.toBeNull()
  expect(sendBackwardBounds).not.toBeNull()
  expect(deleteBoatBounds).not.toBeNull()
  expect(layerOrderBounds).not.toBeNull()
  expect(Math.abs(bringForwardBounds!.y - sendBackwardBounds!.y)).toBeLessThan(1)
  expect(bringForwardBounds!.y).toBeGreaterThan(deleteBoatBounds!.y)
  expect(layerOrderBounds!.y).toBeGreaterThan(deleteBoatBounds!.y)
  expect(layerOrderBounds!.y).toBeLessThan(bringForwardBounds!.y)
  await expect(bringForward.locator('span')).toHaveCSS('white-space', 'nowrap')
  await expect(sendBackward.locator('span')).toHaveCSS('white-space', 'nowrap')
  await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled()
  await expect(
    page.getByRole('button', { name: 'Use palette color Heisel amber #FFAA00' }),
  ).toHaveCount(0)
  const colorSelector = page.locator('button[aria-label="Open Hull color selector"]:visible')
  await expect(colorSelector).toContainText('#FFAA00')
  await colorSelector.click()
  await expect(
    page.getByRole('button', { name: 'Use palette color Heisel amber #FFAA00' }),
  ).toBeVisible()
  await expect(page.getByLabel('Heisel sailing palette')).toBeVisible()
  await expect(page.locator('.sail-status:visible')).toHaveText('Luffing')

  const mainsailTrim = page.locator('.angle-control input[type="range"]:visible').first()
  await mainsailTrim.fill('45')
  await expect(page.locator('.sail-status:visible')).toHaveCount(0)
  await mainsailTrim.fill('0')
  await expect(page.locator('.sail-status:visible')).toHaveText('Luffing')

  const hullColor = page.locator('input[aria-label="Hull color custom color"]:visible')
  await hullColor.fill('#df3f3f')
  await colorSelector.click()
  await expect(page.getByRole('button', { name: 'Use recent color #FFAA00' })).toBeVisible()
  await page.getByRole('button', { name: 'Use recent color #FFAA00' }).click()
  await expect(colorSelector).toContainText('#FFAA00')
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('sailing-scenario-editor:recent-colors')))
    .toContain('#DF3F3F')

  await page.locator('input[aria-label="Heading slider"]:visible').fill('45')
  await expect(page.locator('input[aria-label="Mainsail · 11° slider"]:visible')).toBeVisible()
  await page.locator('input[aria-label="Heading slider"]:visible').fill('179')
  await page.locator('input[aria-label="Heading slider"]:visible').fill('180')
  await expect(page.locator('input[aria-label="Mainsail · 90° slider"]:visible')).toBeVisible()
  await page.locator('input[aria-label="Heading slider"]:visible').fill('181')
  await page.locator('input[aria-label="Heading slider"]:visible').fill('180')
  await expect(page.locator('input[aria-label="Mainsail · -90° slider"]:visible')).toBeVisible()
  await expect(page.locator('.sail-status:visible')).toHaveCount(0)
})

test('uses boat lengths for mark zones and supports Lacustre', async ({ page }, testInfo) => {
  await page.goto('/')
  const canvas = page.locator('canvas').first()
  await page.getByRole('button', { name: 'Boat' }).first().click()
  await canvas.click({ position: { x: 240, y: 200 } })
  await openMobileProperties(page)

  const boatClass = page
    .locator('.properties-content:visible label.field')
    .filter({ hasText: 'Boat class' })
    .locator('select')
  const heading = page.locator('input[aria-label="Heading slider"]:visible')
  await boatClass.selectOption('470')
  await heading.fill('100')
  await page.locator('label:visible').filter({ hasText: 'Spinnaker' }).getByRole('checkbox').check()
  const spinnakerSlider = page.locator('input[type="range"][aria-label^="Spinnaker ·"]:visible')
  await expect(spinnakerSlider).toHaveAttribute('aria-label', 'Spinnaker · 80° slider')
  await expect(
    spinnakerSlider
      .locator('xpath=ancestor::label[contains(@class, "field")]')
      .locator('.sail-status'),
  ).toHaveCount(0)
  await heading.fill('70')
  await expect(spinnakerSlider).toHaveAttribute('aria-label', 'Spinnaker · 70° slider')
  await expect(
    spinnakerSlider
      .locator('xpath=ancestor::label[contains(@class, "field")]')
      .locator('.sail-status'),
  ).toHaveText('Luffing')
  await heading.fill('45')
  await boatClass.selectOption('420')
  await expect(page.locator('input[aria-label="Mainsail · 7° slider"]:visible')).toBeVisible()
  await expect(page.locator('input[aria-label="Jib · 10° slider"]:visible')).toBeVisible()
  await boatClass.selectOption('470')
  await expect(page.locator('input[aria-label="Mainsail · 7° slider"]:visible')).toBeVisible()
  await expect(page.locator('input[aria-label="Jib · 10° slider"]:visible')).toBeVisible()
  await boatClass.selectOption('29er')
  await expect(page.locator('input[aria-label="Mainsail · 6° slider"]:visible')).toBeVisible()
  await expect(page.locator('input[aria-label="Jib · 8° slider"]:visible')).toBeVisible()
  await boatClass.selectOption('49er')
  await expect(page.locator('input[aria-label="Mainsail · 6° slider"]:visible')).toBeVisible()
  await expect(page.locator('input[aria-label="Jib · 8° slider"]:visible')).toBeVisible()
  await boatClass.selectOption('Windsurf')
  await expect(page.locator('input[aria-label="Mainsail · 15° slider"]:visible')).toBeVisible()
  await expect(page.locator('label:visible').filter({ hasText: 'Jib' })).toHaveCount(0)
  await expect(boatClass.locator('option[value="Wingfoil"]')).toHaveCount(0)
  await expect(boatClass.locator('option[value="kitefoil"]')).toHaveCount(0)
  await boatClass.selectOption('Tornado')
  await expect(page.locator('input[aria-label="Mainsail · 3° slider"]:visible')).toBeVisible()
  await boatClass.selectOption('Generic keelboat')
  await expect(page.locator('input[aria-label="Genoa · 15° slider"]:visible')).toBeVisible()
  await boatClass.selectOption('Lacustre')
  await expect(page.locator('input[aria-label="Mainsail · 6° slider"]:visible')).toBeVisible()
  await expect(page.locator('input[aria-label="Genoa · 9° slider"]:visible')).toBeVisible()
  await heading.fill('46')
  await expect(page.locator('input[aria-label="Genoa · 9.1° slider"]:visible')).toBeVisible()
  await heading.fill('45')
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
  await openMobileProperties(page)
  const markBadge = page.locator('.badge:visible')
  if (await markBadge.count()) {
    await expect(markBadge).toHaveCSS('background-color', 'rgb(255, 170, 0)')
  } else {
    await expect(page.locator('.mobile-properties-toggle:visible')).toContainText(
      'Properties – Mark 1',
    )
  }
  const markNumber = page.getByRole('textbox', { name: 'Mark number' })
  await expect(markNumber).toHaveValue('1')
  await markNumber.fill('18z')
  await expect(markNumber).toHaveValue('18z')
  const markHeading = page.locator('.panel-heading:visible h2')
  if (await markHeading.count()) {
    await expect(markHeading).toHaveText('Mark 18z')
  } else {
    await expect(page.locator('.mobile-properties-toggle:visible')).toContainText(
      'Properties – Mark 18z',
    )
  }
  await expect(page.getByText('Mark type', { exact: true })).toHaveCount(0)
  const orientation = page.getByRole('group', { name: 'Mark orientation' })
  const leewardMark = orientation.getByRole('button', { name: 'Leeward mark' })
  const windwardMark = orientation.getByRole('button', { name: 'Windward mark' })
  await expect(leewardMark).toHaveAttribute('aria-pressed', 'false')
  await expect(windwardMark).toHaveAttribute('aria-pressed', 'true')
  const orientationBounds = await orientation.boundingBox()
  const zone = page.getByRole('group', { name: 'Zone' })
  const showZone = zone.getByRole('button', { name: 'Show zone' })
  const hideZone = zone.getByRole('button', { name: 'Hide zone' })
  await expect(showZone).toHaveAttribute('aria-pressed', 'true')
  await expect(hideZone).toHaveAttribute('aria-pressed', 'false')
  const zoneControlBounds = await zone.boundingBox()
  const markNumberBounds = await markNumber.boundingBox()
  expect(orientationBounds).not.toBeNull()
  expect(zoneControlBounds).not.toBeNull()
  expect(markNumberBounds).not.toBeNull()
  expect(Math.abs(orientationBounds!.width - markNumberBounds!.width)).toBeLessThan(1)
  expect(Math.abs(zoneControlBounds!.width - markNumberBounds!.width)).toBeLessThan(1)
  expect(zoneControlBounds!.y).toBeGreaterThan(orientationBounds!.y)
  expect(orientationBounds!.y).toBeLessThan(markNumberBounds!.y)
  expect(zoneControlBounds!.y).toBeLessThan(markNumberBounds!.y)
  await leewardMark.click()
  await expect(leewardMark).toHaveAttribute('aria-pressed', 'true')
  const zoneRadius = page.locator('input[aria-label="Zone radius in boat lengths"]:visible')
  await expect(zoneRadius).toHaveValue('3')
  const zoneBounds = await zoneRadius.locator('..').boundingBox()
  const colorSelector = page.locator('button[aria-label="Open Mark color selector"]:visible')
  const colorBounds = await colorSelector.boundingBox()
  expect(zoneBounds).not.toBeNull()
  expect(colorBounds).not.toBeNull()
  expect(zoneBounds!.x).toBeLessThan(colorBounds!.x)
  expect(Math.abs(zoneBounds!.height - colorBounds!.height)).toBeLessThan(1)
  await expect(
    page.locator('.properties-content:visible').getByRole('button', { name: 'Hide', exact: true }),
  ).toHaveCount(0)
  await colorSelector.click()
  const colorPopover = page.getByRole('dialog', { name: 'Mark color colors' })
  await expect(colorPopover).toBeVisible()
  const popoverBounds = await colorPopover.boundingBox()
  const propertyPanelBounds = await page
    .locator('.properties-panel:visible, .mobile-properties:visible')
    .first()
    .boundingBox()
  expect(popoverBounds).not.toBeNull()
  expect(propertyPanelBounds).not.toBeNull()
  expect(popoverBounds!.x).toBeGreaterThanOrEqual(propertyPanelBounds!.x)
  expect(popoverBounds!.x + popoverBounds!.width).toBeLessThanOrEqual(
    propertyPanelBounds!.x + propertyPanelBounds!.width,
  )
  await colorSelector.click()
  await expect(page.locator('.field-help:visible')).toContainText('Longest class: Lacustre (9.5 m)')
  if (testInfo.project.name === 'desktop-chrome') {
    await page.getByLabel('Boat-length basis').selectOption('Optimist')
    await expect(page.locator('.field-help:visible')).toContainText('Selected basis: Optimist')
  }
})

test('creates a numbered downwind mark from its own tool', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chrome',
    'The dedicated Lee mark tool is intentionally omitted in compact mode',
  )
  await page.goto('/')
  const canvas = page.locator('canvas').first()

  await page.getByRole('button', { name: 'Mark', exact: true }).first().click()
  await canvas.click({ position: { x: 220, y: 160 } })
  await page.getByRole('button', { name: 'Lee mark', exact: true }).first().click()
  await canvas.click({ position: { x: 360, y: 260 } })
  await openMobileProperties(page)

  await expect(page.getByRole('textbox', { name: 'Mark number' })).toHaveValue('2')
  await expect(
    page
      .getByRole('group', { name: 'Mark orientation' })
      .getByRole('button', { name: 'Leeward mark' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.statusbar')).toContainText('Added downwind mark')
})

test('opens project templates', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open projects & templates' }).click()
  const dialog = page.getByRole('dialog', { name: 'Projects & templates' })
  const templateCards = dialog.locator('.template-grid button')
  await expect(templateCards).toHaveCount(6)
  await expect(dialog.getByRole('button', { name: /Empty plot/ })).toHaveCSS(
    'background-color',
    'rgb(255, 170, 0)',
  )
  await expect(dialog).toContainText('Windward mark')
  await expect(dialog).toContainText('Port–starboard')
  await expect(dialog.locator('.template-grid .rule-reference-bubble')).toHaveText([
    'RRS 18',
    'RRS 10',
    'RRS 11',
    'RRS 12',
  ])
  const situationBubbles = dialog.locator('.template-grid .rule-reference-bubble').filter({
    hasText: /RRS 1[0-2]/,
  })
  const situationBubbleBounds = await situationBubbles.evaluateAll((bubbles) =>
    bubbles.map((bubble) => bubble.getBoundingClientRect().toJSON()),
  )
  expect(situationBubbleBounds.every((bounds) => bounds.height >= 28)).toBe(true)
  if (testInfo.project.name === 'desktop-chrome') {
    expect(
      situationBubbleBounds.every((bounds) => Math.abs(bounds.y - situationBubbleBounds[0].y) <= 1),
    ).toBe(true)
    const importBounds = await dialog.getByRole('button', { name: 'Import JSON' }).boundingBox()
    const lastTemplateBounds = await templateCards.last().boundingBox()
    expect(importBounds).not.toBeNull()
    expect(lastTemplateBounds).not.toBeNull()
    expect(importBounds!.y).toBeGreaterThan(lastTemplateBounds!.y + lastTemplateBounds!.height)
  }
  if (testInfo.project.name === 'iphone') {
    const modalBody = dialog.locator('.modal-body')
    await expect
      .poll(() => modalBody.evaluate((body) => body.scrollHeight > body.clientHeight))
      .toBe(true)
    await modalBody.evaluate((body) => body.scrollTo({ top: body.scrollHeight }))
    await expect
      .poll(() =>
        modalBody.evaluate(
          (body) => Math.abs(body.scrollHeight - body.clientHeight - body.scrollTop) <= 1,
        ),
      )
      .toBe(true)
    await expect(dialog.getByText('Recent local projects')).toBeVisible()
  }
  await page.getByRole('button', { name: /Windward mark/ }).click()
  await expect(page.locator('.statusbar')).toContainText('4 objects')
})

test('shows saved-project rule bubbles and deletes all local projects together', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open projects & templates' }).click()
  await page.getByRole('button', { name: /Windward mark/ }).click()
  await page
    .getByRole('button', { name: 'Rename plot' })
    .evaluate((button: HTMLButtonElement) => button.click())
  const details = page.getByRole('dialog', { name: 'Plot details' })
  const ruleReferenceInput = details.getByRole('textbox', { name: 'Rule references' })
  await ruleReferenceInput.fill('10,11,12,13,14,')
  await details.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('.statusbar')).toContainText('Saved locally', { timeout: 5000 })

  await page.getByRole('button', { name: 'Open projects & templates' }).click()
  const dialog = page.getByRole('dialog', { name: 'Projects & templates' })
  const projectBubbles = dialog.locator(
    '.project-list article > .rule-reference-bubbles > .rule-reference-bubble',
  )
  await expect(projectBubbles).toHaveCount(4)
  await expect(projectBubbles.nth(0)).toHaveText('RRS 18')
  await expect(projectBubbles.nth(1)).toHaveText('RRS 10')
  await expect(projectBubbles.nth(2)).toHaveText('RRS 11')
  const overflowBubble = projectBubbles.last()
  await expect(overflowBubble.locator(':scope > [aria-hidden="true"]')).toHaveText('...')
  const overflowPopover = overflowBubble.locator('.rule-reference-overflow-popover')
  await expect(overflowPopover).toBeHidden()
  if (testInfo.project.name === 'iphone') {
    await overflowBubble.focus()
  } else {
    await overflowBubble.hover()
  }
  await expect(overflowPopover).toBeVisible()
  await expect(overflowPopover.locator('.rule-reference-overflow-item')).toHaveText([
    'RRS 12',
    'RRS 13',
    'RRS 14',
  ])
  const importBounds = await dialog.getByRole('button', { name: 'Import JSON' }).boundingBox()
  const deleteAllBounds = await dialog
    .getByRole('button', { name: 'Delete all', exact: true })
    .boundingBox()
  expect(importBounds).not.toBeNull()
  expect(deleteAllBounds).not.toBeNull()
  expect(Math.abs(importBounds!.y - deleteAllBounds!.y)).toBeLessThanOrEqual(1)
  const projectOpenBounds = await dialog.locator('.project-open').first().boundingBox()
  const projectBubbleBounds = await dialog
    .locator('.project-list .rule-reference-bubble')
    .first()
    .boundingBox()
  const duplicateBounds = await dialog
    .getByRole('button', { name: 'Duplicate', exact: true })
    .first()
    .boundingBox()
  expect(projectOpenBounds).not.toBeNull()
  expect(projectBubbleBounds).not.toBeNull()
  expect(duplicateBounds).not.toBeNull()
  expect(projectBubbleBounds!.x).toBeGreaterThanOrEqual(
    projectOpenBounds!.x + projectOpenBounds!.width,
  )
  expect(duplicateBounds!.x).toBeGreaterThanOrEqual(
    projectBubbleBounds!.x + projectBubbleBounds!.width,
  )
  expect(
    Math.abs(
      projectBubbleBounds!.y +
        projectBubbleBounds!.height / 2 -
        (duplicateBounds!.y + duplicateBounds!.height / 2),
    ),
  ).toBeLessThanOrEqual(1)
  await expect
    .poll(() =>
      dialog
        .locator('.project-list article')
        .first()
        .evaluate((article) => article.scrollWidth <= article.clientWidth),
    )
    .toBe(true)
  await dialog.getByRole('button', { name: 'Delete all', exact: true }).click()
  await expect(dialog.getByText('No saved projects yet. Create a plot above.')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Delete all', exact: true })).toHaveCount(0)
})

test('creates gate, start-line and finish-line layouts as single undoable actions', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  const canvas = page.locator('canvas').first()

  await page.getByRole('button', { name: 'Gate', exact: true }).click()
  await canvas.click({ position: { x: 320, y: 240 } })
  await expect(page.locator('.statusbar')).toContainText('1 object')
  await expect(page.locator('.statusbar')).toContainText('Added gate')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.locator('.statusbar')).toContainText('0 objects')

  await page.getByRole('button', { name: 'Start line', exact: true }).click()
  await canvas.click({ position: { x: 360, y: 240 } })
  await openMobileProperties(page)
  await expect(page.locator('.statusbar')).toContainText('1 object')
  await expect(page.locator('.statusbar')).toContainText('Added start line')
  const startLaylines = page.locator('.properties-content:visible').getByRole('group', {
    name: 'Laylines',
  })
  const startLaylineArea = page.locator('.properties-content:visible').getByRole('group', {
    name: 'Layline area',
  })
  await expect(startLaylines.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(startLaylineArea.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await startLaylines.getByRole('button', { name: 'On', exact: true }).click()
  await expect(startLaylines.getByRole('button', { name: 'On', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(startLaylines.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.locator('.statusbar')).toContainText('0 objects')

  await page.getByRole('button', { name: 'Start line', exact: true }).click()
  await canvas.click({ position: { x: 360, y: 240 } })
  await openMobileProperties(page)
  const startEnd = page
    .locator('label.field:visible')
    .filter({ hasText: 'Start-boat end' })
    .locator('select')
  const pinEnd = page
    .locator('label.field:visible')
    .filter({ hasText: 'Pin end' })
    .locator('select')
  const pinFlagColor = page.locator('button[aria-label="Open Pin end flag color selector"]:visible')
  await expect(pinFlagColor).toContainText('#FF5E00')
  await startEnd.selectOption('flag')
  const startFlagColor = page.locator(
    'button[aria-label="Open Start-boat end flag color selector"]:visible',
  )
  await expect(startFlagColor).toContainText('#FF5E00')
  await startFlagColor.click()
  await expect(page.getByLabel('Sailing signal flag palette')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Use palette color Signal red #D72638' }),
  ).toBeVisible()
  await page
    .locator('input[aria-label="Start-boat end flag color custom color"]:visible')
    .fill('#df3f3f')
  await expect(startFlagColor).toContainText('#DF3F3F')
  await pinFlagColor.click()
  await page.locator('input[aria-label="Pin end flag color custom color"]:visible').fill('#1f6d68')
  await expect(pinFlagColor).toContainText('#1F6D68')
  const laylineArea = page.locator('.properties-content:visible').getByRole('group', {
    name: 'Layline area',
  })
  await laylineArea.getByRole('button', { name: 'On', exact: true }).click()
  await expect(laylineArea.getByRole('button', { name: 'On', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(
    page.locator('button[aria-label="Open Layline area color selector"]:visible'),
  ).toContainText('#FFAA00')
  await startEnd.selectOption('coach-boat')
  await pinEnd.selectOption('buoy')
  await expect(startEnd).toHaveValue('coach-boat')
  await expect(pinEnd).toHaveValue('buoy')
  await expect(startEnd.locator('option[value="slim-coach-boat"]')).toHaveCount(0)
  await expect(startEnd.locator('option', { hasText: 'Coachboat' })).toHaveCount(2)
  await expect(
    page.locator('.properties-content:visible').getByRole('button', { name: /^(Hide|Show)$/ }),
  ).toHaveCount(0)

  if (testInfo.project.name === 'desktop-chrome') {
    const canvasBounds = await canvas.boundingBox()
    expect(canvasBounds).not.toBeNull()
    await page.mouse.move(canvasBounds!.x + 360, canvasBounds!.y + 256)
    await page.mouse.down()
    await page.mouse.move(canvasBounds!.x + 390, canvasBounds!.y + 276)
    await page.mouse.up()
    await expect(page.locator('.statusbar')).toContainText('Moved start-line')
  }

  await page.getByRole('button', { name: 'Finish line', exact: true }).click()
  await canvas.click({ position: { x: 300, y: 280 } })
  await openMobileProperties(page)
  await expect(page.locator('.statusbar')).toContainText('2 objects')
  await expect(page.locator('.statusbar')).toContainText('Added finish line')
  const finishLaylines = page.locator('.properties-content:visible').getByRole('group', {
    name: 'Laylines',
  })
  const finishLaylineArea = page.locator('.properties-content:visible').getByRole('group', {
    name: 'Layline area',
  })
  await expect(finishLaylines.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(finishLaylineArea.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await finishLaylineArea.getByRole('button', { name: 'On', exact: true }).click()
  await expect(
    page.locator('button[aria-label="Open Layline area color selector"]:visible'),
  ).toContainText('#168DDD')
  await expect(
    page.locator('label.field:visible').filter({ hasText: 'Finish-boat end' }).locator('select'),
  ).toHaveValue('committee-boat')
  await expect(
    page.locator('label.field:visible').filter({ hasText: 'Outer end' }).locator('select'),
  ).toHaveValue('flag')
  await expect(
    page.locator('button[aria-label="Open Outer end flag color selector"]:visible'),
  ).toContainText('#168DDD')
  await expect(
    page.locator('.object-meta:visible > div').filter({ hasText: 'Length' }),
  ).toContainText('BL')
  await expect(
    page.locator('.object-meta:visible > div').filter({ hasText: 'Angle to wind' }),
  ).toContainText('0°')
  await expect(
    page
      .locator('.object-meta:visible > div')
      .filter({ hasText: 'Angle to wind' })
      .locator('strong'),
  ).toHaveCSS('white-space', 'nowrap')

  if (testInfo.project.name === 'desktop-chrome') {
    const lengthValue = page
      .locator('.object-meta:visible > div')
      .filter({ hasText: 'Length' })
      .locator('strong')
    const angleValue = page
      .locator('.object-meta:visible > div')
      .filter({ hasText: 'Angle to wind' })
      .locator('strong')
    const initialLength = await lengthValue.textContent()
    const initialAngle = await angleValue.textContent()
    const canvasBounds = await canvas.boundingBox()
    expect(canvasBounds).not.toBeNull()
    const canvasScale = canvasBounds!.width / 1920
    const endpoint = {
      x: canvasBounds!.x + 300 + 200 * canvasScale,
      y: canvasBounds!.y + 280,
    }

    await page.mouse.move(endpoint.x, endpoint.y)
    await page.mouse.down()
    await page.mouse.move(endpoint.x + 48, endpoint.y - 52, { steps: 8 })
    await expect.poll(() => lengthValue.textContent()).not.toBe(initialLength)
    await expect.poll(() => angleValue.textContent()).not.toBe(initialAngle)
    await page.mouse.up()
  }
})

test('places consecutive boats as numbered chain positions', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Boat' }).first().click()
  const canvas = page.locator('canvas').first()
  await canvas.click({ position: { x: 280, y: 260 } })
  const secondBoatPosition =
    testInfo.project.name === 'iphone' ? { x: 10, y: 40 } : { x: 380, y: 200 }
  await canvas.click({ position: secondBoatPosition })
  await openMobileProperties(page)
  await expect(page.locator('.statusbar')).toContainText('2 objects')
  await expect(page.locator('.statusbar')).toContainText('100%')
  await expect(
    page.locator('.object-meta:visible > div').filter({ hasText: 'Position' }),
  ).toContainText('2')
  const overlapLine = page.locator('.properties-content:visible').getByRole('group', {
    name: 'Overlap line',
  })
  await expect(overlapLine.getByRole('button', { name: 'None', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await overlapLine.getByRole('button', { name: 'Port', exact: true }).click()
  await expect(overlapLine.getByRole('button', { name: 'Port', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await overlapLine.getByRole('button', { name: 'Starboard', exact: true }).click()
  await expect(overlapLine.getByRole('button', { name: 'Starboard', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

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
  const selectionPanelToggle = page.locator('.mobile-properties-toggle:visible')
  if (await selectionPanelToggle.count()) await selectionPanelToggle.click()
  await canvas.click({ position: { x: 280, y: 260 } })
  await openMobileProperties(page)
  await expect(
    page.locator('.object-meta:visible > div').filter({ hasText: 'Position' }),
  ).toContainText('1')

  await page.locator('button[aria-label="Select"]:visible').click()
  await expect(
    page.locator('.object-meta:visible > div').filter({ hasText: 'Position' }),
  ).toContainText('1')
  await boatTool.click()
  const mobilePropertiesToggle = page.locator('.mobile-properties-toggle:visible')
  if (await mobilePropertiesToggle.count()) {
    await mobilePropertiesToggle.click()
    await expect(mobilePropertiesToggle).toHaveAttribute('aria-expanded', 'false')
  }
  const continuedBoatPosition =
    testInfo.project.name === 'iphone' ? { x: 60, y: 100 } : { x: 480, y: 160 }
  await canvas.click({ position: continuedBoatPosition })
  await openMobileProperties(page)
  await expect(
    page.locator('.object-meta:visible > div').filter({ hasText: 'Position' }),
  ).toContainText('3')
  await expect(
    page
      .locator('.properties-content:visible')
      .getByRole('group', { name: 'Overlap line' })
      .getByRole('button', { name: 'None', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')

  // Clicking the already-active creation tool starts a fresh creation series.
  await boatTool.click()
  await expect(boatTool).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.object-meta:visible')).toHaveCount(0)
  await canvas.click({ position: { x: 180, y: 340 } })
  await openMobileProperties(page)
  await expect(
    page.locator('.object-meta:visible > div').filter({ hasText: 'Position' }),
  ).toContainText('1')
  await expect(page.locator('button[aria-label="Open Hull color selector"]:visible')).toContainText(
    '#18324A',
  )
})

test('replays numbered boat positions with controls in place of the desktop toolbar', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Desktop player sidebar check')
  await page.goto('/')
  const playerMode = page.getByRole('button', { name: 'Player mode' })
  await expect(playerMode).toBeDisabled()
  await expect(playerMode).toContainText('Player')

  await page.getByRole('button', { name: 'Boat', exact: true }).first().click()
  const canvas = page.locator('canvas').first()
  await canvas.click({ position: { x: 300, y: 280 } })
  await canvas.click({ position: { x: 520, y: 190 } })
  await expect(playerMode).toBeEnabled()
  await playerMode.click()

  await expect(page.locator('.app-shell')).toHaveAttribute('data-player-mode', 'true')
  await expect(page.locator('.player-mode-toggle')).toHaveAccessibleName('Back to editor')
  await expect(page.locator('.properties-panel')).toHaveCount(0)
  const controls = page.getByRole('region', { name: 'Player controls' })
  await expect(controls).toBeVisible()
  await expect(page.locator('.tools-panel').getByRole('heading', { name: 'Player' })).toBeVisible()
  await expect(page.locator('.tools-panel').getByRole('button', { name: 'Boat' })).toHaveCount(0)

  const timeline = controls.getByRole('slider', { name: 'Playback timeline' })
  await expect(timeline).toHaveValue('1')
  const speed = controls.getByRole('group', { name: 'Playback speed' })
  await expect(speed.getByRole('button', { name: '1×' })).toHaveAttribute('aria-pressed', 'true')
  await speed.getByRole('button', { name: '2×' }).click()
  await expect(speed.getByRole('button', { name: '2×' })).toHaveAttribute('aria-pressed', 'true')
  const tails = controls.getByRole('group', { name: 'Boat tails' })
  await expect(tails.getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true')
  await tails.getByRole('button', { name: 'Off' }).click()
  await expect(tails.getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true')
  await tails.getByRole('button', { name: 'On' }).click()
  await timeline.fill('1.5')
  await expect(controls).toContainText('Position 1 → 2 of 2')
  await controls.getByRole('button', { name: 'Previous position' }).click()
  await expect(timeline).toHaveValue('1')
  await controls.getByRole('button', { name: 'Play' }).click()
  await expect(controls.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect.poll(async () => Number(await timeline.inputValue())).toBeGreaterThan(1)
  await controls.getByRole('button', { name: 'Pause' }).click()

  await controls.getByRole('button', { name: 'Back to editor' }).click()
  await expect(page.locator('.app-shell')).toHaveAttribute('data-player-mode', 'false')
  await expect(page.locator('.properties-panel')).toBeVisible()
  await expect(page.locator('.tools-panel').getByRole('button', { name: 'Boat' })).toBeVisible()
})

test('keeps the mobile player beside the menu and its controls free of horizontal scrolling', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone', 'Phone player layout check')
  await page.goto('/')

  await expect(page.locator('.topbar-actions > .language-switch')).toBeHidden()
  const playerMode = page.getByRole('button', { name: 'Player mode' })
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  const playerBounds = await playerMode.boundingBox()
  const menuBounds = await menu.boundingBox()
  expect(playerBounds).not.toBeNull()
  expect(menuBounds).not.toBeNull()
  expect(playerBounds!.x + playerBounds!.width).toBeLessThanOrEqual(menuBounds!.x)
  expect(menuBounds!.x - (playerBounds!.x + playerBounds!.width)).toBeLessThanOrEqual(8)

  await menu.click()
  await expect(page.getByRole('group', { name: 'Language' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Boat', exact: true }).first().click()
  const canvas = page.locator('canvas').first()
  await canvas.click({ position: { x: 120, y: 220 } })
  await canvas.click({ position: { x: 270, y: 150 } })
  await playerMode.click()

  const mobileToolbar = page.locator('.mobile-toolbar')
  const controls = page.getByRole('region', { name: 'Player controls' })
  await expect(controls).toBeVisible()
  await expect
    .poll(() =>
      mobileToolbar.evaluate((element) => ({
        clientWidth: element.clientWidth,
        overflowX: getComputedStyle(element).overflowX,
        scrollWidth: element.scrollWidth,
      })),
    )
    .toMatchObject({ overflowX: 'hidden' })
  const toolbarSize = await mobileToolbar.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(toolbarSize.scrollWidth).toBeLessThanOrEqual(toolbarSize.clientWidth)

  const exit = controls.getByRole('button', { name: 'Back to editor' })
  await expect(exit.locator('svg')).toBeVisible()
  await expect(exit).toHaveCSS('color', 'rgb(223, 63, 63)')
  const exitBounds = await exit.boundingBox()
  expect(exitBounds).not.toBeNull()
  expect(exitBounds!.width).toBeLessThanOrEqual(44)
  await exit.click()
  await expect(page.locator('.app-shell')).toHaveAttribute('data-player-mode', 'false')
})

test('places a new boat close beside an existing hull', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Precise boat hit-area check')
  await page.goto('/')
  const canvas = page.locator('canvas').first()
  await page.getByRole('button', { name: 'Boat', exact: true }).first().click()
  await canvas.click({ position: { x: 360, y: 260 } })
  await expect(page.locator('.statusbar')).toContainText('1 object')

  // This point was inside the old 104 × 128 invisible selection rectangle,
  // but is outside the visible ILCA hull and must create the next chain position.
  await canvas.click({ position: { x: 388, y: 260 } })
  await expect(page.locator('.statusbar')).toContainText('2 objects')
  await expect(page.locator('.properties-content:visible .object-meta')).toContainText('2')
})
