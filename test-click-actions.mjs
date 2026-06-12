import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:3000'
const NAV_TIMEOUT = 60000
const SEL_TIMEOUT = 15000

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  page.setDefaultTimeout(NAV_TIMEOUT)

  let passed = 0
  let failed = 0

  function ok(name, condition) {
    if (condition) {
      console.log(`  ✅ ${name}`)
      passed++
    } else {
      console.log(`  ❌ ${name}`)
      failed++
    }
  }

  async function vis(selector, t = SEL_TIMEOUT) {
    return page
      .locator(selector)
      .first()
      .isVisible({ timeout: t })
      .catch(() => false)
  }

  async function nav(url) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
    await page.waitForTimeout(3000)
  }

  // warmup
  console.log('🌡️ Warming up...')
  await nav(`${BASE}/login`)
  await nav(`${BASE}/register`)

  console.log('\n📄 Landing Page:')
  await nav(BASE)
  ok('Page loads', await vis('h1'))
  ok('Get Started button', await vis('text=Get Started'))
  ok('Subscribe to Pro button', await vis('text=Subscribe to Pro'))
  if (await vis('text=Get Started')) {
    await page.locator('text=Get Started').first().click()
    await page.waitForURL('**/register', { timeout: NAV_TIMEOUT }).catch(() => {})
    ok('Get Started -> /register', page.url().includes('/register'))
  }

  console.log('\n📝 Register Page:')
  await nav(`${BASE}/register`)
  ok('Form visible', await vis('form'))
  ok('Full Name field', await vis('input[placeholder="John Doe"]'))
  ok('Email field', await vis('input[placeholder="you@example.com"]'))
  ok('Password field', await vis('input[placeholder="At least 8 characters"]'))
  ok('Create Account button', await vis('button:has-text("Create Account")'))
  ok('Sign in link', await vis('a:has-text("Sign in")'))
  if (await vis('a:has-text("Sign in")')) {
    await page.locator('a:has-text("Sign in")').click()
    await page.waitForURL('**/login', { timeout: NAV_TIMEOUT }).catch(() => {})
    ok('Sign in link -> /login', page.url().includes('/login'))
  }

  console.log('\n🔐 Login Page:')
  await nav(`${BASE}/login`)
  ok('Form visible', await vis('form'))
  ok('Email field', await vis('input[placeholder="you@example.com"]'))
  ok('Password field', await vis('input[type="password"]'))
  ok('Sign In button', await vis('button:has-text("Sign In")'))
  ok('Forgot password link', await vis('text=Forgot your password?'))
  ok('Sign up link', await vis('a:has-text("Sign up")'))
  ok('Google button', await vis('text=Google'))
  if (await vis('a:has-text("Sign up")')) {
    await page.locator('a:has-text("Sign up")').click()
    await page.waitForURL('**/register', { timeout: NAV_TIMEOUT }).catch(() => {})
    ok('Sign up link -> /register', page.url().includes('/register'))
  }

  console.log('\n🔑 Forgot Password:')
  await nav(`${BASE}/forgot-password`)
  ok('Form visible', await vis('form'))
  ok('Email field', await vis('input[type="email"]'))
  ok('Send Reset Link button', await vis('text=Send Reset Link'))
  ok('Sign in link', await vis('a:has-text("Sign in")'))
  if (await vis('a:has-text("Sign in")')) {
    await page.locator('a:has-text("Sign in")').click()
    await page.waitForURL('**/login', { timeout: NAV_TIMEOUT }).catch(() => {})
    ok('Sign in link -> /login', page.url().includes('/login'))
  }

  console.log('\n🏠 Auth Guards:')
  await nav(`${BASE}/dashboard`)
  ok('/dashboard redirects to login', page.url().includes('/login'))
  await nav(`${BASE}/dashboard/billing`)
  ok('/dashboard/billing redirects to login', page.url().includes('/login'))
  await nav(`${BASE}/dashboard/reviews`)
  ok('/dashboard/reviews redirects to login', page.url().includes('/login'))

  console.log('\n✅ Form Validation:')
  await nav(`${BASE}/register`)
  await page.waitForTimeout(2000)
  // Force click with JS to bypass any overlay issues
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create Account'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(1000)
  const hasErr = await page.evaluate(() => {
    return document.querySelectorAll('[role="alert"]').length > 0 || document.querySelectorAll('.text-red-500').length > 0;
  });
  ok('Validation errors shown', hasErr)

  console.log('\n👁️ Password Toggle:')
  await nav(`${BASE}/login`)
  await page.waitForTimeout(2000)
  const toggled = await page.evaluate(() => {
    const passInput = document.querySelector('input[type="password"]');
    if (!passInput) return false;
    const btn = passInput.parentElement.querySelector('button');
    if (btn) {
      btn.click();
      return document.querySelector('input[type="text"]') !== null;
    }
    return false;
  });
  ok('Toggle reveals password', toggled)

  console.log('\n🔗 Page Headings:')
  await nav(`${BASE}/login`)
  ok(
    'Login page title contains Portfolio',
    (await page.title()).toLowerCase().includes('portfolio')
  )
  ok('Welcome back visible', await vis('text=Welcome back'))
  await nav(`${BASE}/register`)
  ok('Create an account visible', await vis('text=Create an account'))
  await nav(`${BASE}/forgot-password`)
  ok('Forgot password? visible', await vis('text=Forgot password?'))

  const total = passed + failed
  console.log(`\n${'='.repeat(40)}`)
  console.log(`📊 ${passed}/${total} passed`)
  if (failed > 0) {
    console.log(`❌ ${failed} failed`)
    await browser.close()
    process.exit(1)
  } else {
    console.log('✅ All passed!')
  }
  await browser.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
