const { chromium } = require('playwright')
const path = require('node:path')
const fs = require('node:fs')

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5173'
const ARTIFACT_DIR = path.resolve(process.cwd(), 'playwright-artifacts')

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
}

async function runTests() {
  console.log(`Starting Playwright test suite against ${TARGET_URL}...`)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  const results = []
  function record(testName, passed, detail = '') {
    results.push({ testName, passed, detail })
    const icon = passed ? '✅' : '❌'
    console.log(`${icon} ${testName} ${detail ? `(${detail})` : ''}`)
  }

  try {
    // 1. Test Landing Page
    console.log('\n--- 1. Testing Landing Page ---')
    await page.goto(`${TARGET_URL}/`)
    await page.waitForLoadState('networkidle')
    const landingTitle = await page.title()
    record('Landing Page Loads', landingTitle.includes('BillBhai'), `Title: ${landingTitle}`)

    // Check Hero title and CTAs
    const heroTitle = await page.locator('.hero-title').textContent()
    record('Hero Headline Rendered', heroTitle.includes('Run your entire'), heroTitle.trim().replace(/\s+/g, ' '))

    // Take screenshot of Landing Page
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_landing_page.png'), fullPage: false })

    // Test Mobile Viewport on Landing Page
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_landing_mobile.png'), fullPage: false })
    await page.setViewportSize({ width: 1440, height: 900 })

    // 2. Test Login Page & Demo Role Selector
    console.log('\n--- 2. Testing Login Page & Demo Account Switcher ---')
    await page.goto(`${TARGET_URL}/login`)
    await page.waitForSelector('#loginCard')
    const loginTitle = await page.title()
    record('Login Page Loads', loginTitle.includes('Sign In'))

    // Click demo chip for Admin
    const adminChip = page.locator('.demo-chip').filter({ hasText: 'Store Admin' })
    if (await adminChip.count() > 0) {
      await adminChip.click()
      const filledUser = await page.locator('#username').inputValue()
      const filledPass = await page.locator('#password').inputValue()
      record('Demo Role Auto-fill works', filledUser === 'admin' && filledPass === 'admin123')
    } else {
      await page.fill('#username', 'admin')
      await page.fill('#password', 'admin123')
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_login_page.png') })

    // Submit login
    await page.click('#btnLogin')
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    record('Sign In Redirects to Dashboard', page.url().includes('/dashboard'))

    // 3. Test Dashboard Page
    console.log('\n--- 3. Testing Dashboard Page ---')
    await page.waitForSelector('.neu-stats-grid, .stats-grid')
    const statCards = await page.locator('.neu-stat-card, .stat-card').count()
    record('Dashboard KPI Cards Rendered', statCards >= 4, `Found ${statCards} stat cards`)

    const chartExists = await page.locator('.neu-recharts-container, .recharts-responsive-container, .empty-state').count()
    record('Dashboard Visualizations Rendered', chartExists >= 1)

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_dashboard_page.png') })

    // 4. Test Cashier POS Terminal
    console.log('\n--- 4. Testing POS Cashier Terminal ---')
    await page.goto(`${TARGET_URL}/cashier`)
    await page.waitForSelector('.product-card, .pos-layout', { timeout: 15000 })
    record('POS Terminal Loads', true)

    // Check category pills
    const catPills = await page.locator('.category-filters button').count()
    record('POS Category Filters Present', catPills > 1, `Found ${catPills} categories`)

    // Add first available product to cart
    const productCards = page.locator('.product-card')
    const productCount = await productCards.count()
    record('POS Products Grid Populated', productCount > 0, `Found ${productCount} items`)

    if (productCount > 0) {
      await productCards.first().click()
      const cartItemCount = await page.locator('.cart-item').count()
      record('Add to Cart Works', cartItemCount >= 1)

      // Test Promo code WELCOME10 or quick promo chip
      const promoChip = page.locator('.promo-chip').filter({ hasText: 'WELCOME10' })
      if (await promoChip.count() > 0) {
        await promoChip.click()
        await page.waitForTimeout(500)
        const promoApplied = await page.locator('.promo-applied').count()
        record('Promo Code WELCOME10 Applied', promoApplied >= 1)
      } else {
        const promoInputField = page.locator('.promo-text-field, .promo-input input')
        if (await promoInputField.count() > 0) {
          await promoInputField.fill('WELCOME10')
          await page.click('.promo-block button, .promo-input button')
          await page.waitForTimeout(500)
          const promoApplied = await page.locator('.promo-applied').count()
          record('Promo Code WELCOME10 Applied', promoApplied >= 1)
        }
      }

      await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_pos_cart.png') })

      // Proceed to Charge / Step 2
      await page.click('.cart-footer .btn-primary')
      await page.waitForSelector('.pay-grid', { timeout: 5000 })
      record('POS Fulfillment & Payment Step 2 Loads', true)

      // Test Exact Tender Preset
      const exactBtn = page.locator('.btn-preset').filter({ hasText: 'Exact' })
      if (await exactBtn.count() > 0) {
        await exactBtn.click()
        const tenderedVal = await page.locator('#posTendered').inputValue()
        record('Quick Tender Preset Works', Number(tenderedVal) > 0, `Tendered: ${tenderedVal}`)
      }

      await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_pos_payment.png') })

      // Complete Sale
      await page.click('.pay-cta')
      await page.waitForSelector('.success-block', { timeout: 10000 })
      record('POS Sale Complete & Invoice Generated', true)

      await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_pos_receipt.png') })
    }

    // 5. Test Inventory Page
    console.log('\n--- 5. Testing Inventory Page ---')
    await page.goto(`${TARGET_URL}/inventory`)
    await page.waitForSelector('.tbl-wrap', { timeout: 10000 })
    const inventoryRows = await page.locator('tbody tr').count()
    record('Inventory Table Loaded', inventoryRows > 0, `Rows: ${inventoryRows}`)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '07_inventory_page.png') })

    // 6. Test Orders Page
    console.log('\n--- 6. Testing Orders Page ---')
    await page.goto(`${TARGET_URL}/orders`)
    await page.waitForSelector('.tbl-wrap', { timeout: 10000 })
    const orderRows = await page.locator('tbody tr').count()
    record('Orders Table Loaded', orderRows > 0, `Rows: ${orderRows}`)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_orders_page.png') })

    // 7. Test Reports Page
    console.log('\n--- 7. Testing Reports Page ---')
    await page.goto(`${TARGET_URL}/reports`)
    await page.waitForSelector('.stats-grid', { timeout: 10000 })
    record('Reports Analytics & Stats Loaded', true)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '09_reports_page.png') })

    // 8. Test Delivery Page
    console.log('\n--- 8. Testing Delivery Page ---')
    await page.goto(`${TARGET_URL}/delivery`)
    await page.waitForSelector('.tbl-wrap', { timeout: 10000 })
    record('Delivery Operations Loaded', true)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '10_delivery_page.png') })

    // 9. Test Returns Page
    console.log('\n--- 9. Testing Returns Page ---')
    await page.goto(`${TARGET_URL}/returns`)
    await page.waitForSelector('.page-header', { timeout: 10000 })
    record('Returns Desk Loaded', true)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '11_returns_page.png') })

    // 10. Test Registration Page
    console.log('\n--- 10. Testing Registration Page ---')
    await page.evaluate(() => {
      localStorage.removeItem('bb_token')
      localStorage.removeItem('currentUser')
      localStorage.removeItem('userRole')
    })
    await page.goto(`${TARGET_URL}/register-business`)
    await page.waitForSelector('#registerForm', { timeout: 10000 })
    record('Business Registration Page Loaded', true)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '12_register_page.png') })

    console.log('\n========================================')
    const total = results.length
    const passed = results.filter((r) => r.passed).length
    const failed = total - passed
    console.log(`Test Summary: ${passed}/${total} passed (${failed} failed)`)
    console.log('========================================\n')

    return failed === 0
  } catch (err) {
    console.error('Test run failed with error:', err)
    return false
  } finally {
    await browser.close()
  }
}

runTests().then((success) => {
  process.exit(success ? 0 : 1)
})
