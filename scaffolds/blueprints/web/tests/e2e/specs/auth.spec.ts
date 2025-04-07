/**
 * Resources
 */
import { expect, Page, Route, test } from '@playwright/test'

/**
 * Dependencies
 */
import { selectors, testApi, testData } from '../selectors/auth.se'
import { setupApiInterceptor } from '../utils/api-interceptor'

/**
 * Types
 */
interface CustomPage extends Page {
  mockRoute: (url: string, handler: (route: Route) => Promise<void>) => Promise<void>
}

/**
 * Tests
 */
test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API interceptor to avoid accidental API calls
    await setupApiInterceptor(page, testApi.interceptorURL)

    /**
     * Mock the guest endpoint by default
     */
    await (page as CustomPage).mockRoute(testApi.guest.URL, async (route) => {
      await route.fulfill({
        status: testApi.guest.success.status,
        contentType: 'application/json',
        body: JSON.stringify(testApi.guest.success.body)
      })
    })

    await page.goto('/')
  })

  test('should display all required elements on signin page', async ({ page }) => {
    await page.goto(selectors.signIn.URL)

    // Wait for guest access to be loaded
    await page.waitForFunction(
      () => {
        const guestAccess = localStorage.getItem('guestAccess')
        return guestAccess !== null
      },
      { timeout: 5000 }
    )

    // Verify that texts don't contain translation keys
    const elements = await page.$$('text=/.tk_/')
    expect(elements.length).toBe(0)

    // Check for the presence of elements
    await expect(page.getByRole('heading', selectors.signIn.title)).toBeVisible()
    await expect(page.getByLabel(selectors.fields.email)).toBeVisible()
    await expect(page.getByLabel(selectors.fields.password)).toBeVisible()
    await expect(page.getByRole('button', selectors.signIn.cta.validate)).toBeVisible()
    await expect(page.getByRole('link', selectors.signIn.cta.forgotPassword)).toBeVisible()
    await expect(page.getByRole('link', selectors.signIn.cta.signUp)).toBeVisible()
  })

  test('should handle signin errors', async ({ page }) => {
    const signInButton = page.getByRole('button', selectors.signIn.cta.validate)
    await page.goto(selectors.signIn.URL)

    /**
     * Mock the signin endpoint for invalid credentials
     */
    await (page as CustomPage).mockRoute(testApi.signIn.URL, async (route) => {
      const json = await route.request().postDataJSON()

      // If email is invalid, return validation error
      if (json.email === testData.emailInvalid) {
        await route.fulfill({
          status: testApi.signIn.error.status,
          contentType: 'application/json',
          body: JSON.stringify(testApi.signIn.error.body)
        })
        return
      }

      // If credentials are incorrect, return unauthorized error
      if (json.email === testData.email && json.password === testData.passwordInvalid) {
        await route.fulfill({
          status: testApi.signIn.error.status,
          contentType: 'application/json',
          body: JSON.stringify(testApi.signIn.error.body)
        })
        return
      }

      // For other cases, let the request pass through
      await route.continue()
    })

    // Test with empty fields
    await signInButton.click()
    await expect(page.getByText(selectors.errors.requiredEmail)).toBeVisible()
    await expect(page.getByText(selectors.errors.requiredPassword)).toBeVisible()

    // Test with invalid email
    await page.getByLabel(selectors.fields.email).fill(testData.emailInvalid)
    await page.getByLabel(selectors.fields.password).fill(testData.passwordValid)
    await signInButton.click()
    await expect(page.getByText(selectors.errors.invalidEmail)).toBeVisible()

    // Test with incorrect credentials
    await page.getByLabel(selectors.fields.email).fill(testData.email)
    await page.getByLabel(selectors.fields.password).fill(testData.passwordInvalid)
    await signInButton.click()
    await expect(page.getByText(selectors.errors.incorrectCredentials)).toBeVisible()
  })

  test('should handle signup flow', async ({ page }) => {
    /**
     * Mock the guest endpoint
     */
    await (page as CustomPage).mockRoute(testApi.guest.URL, async (route) => {
      await route.fulfill({
        status: testApi.guest.success.status,
        contentType: 'application/json',
        body: JSON.stringify(testApi.guest.success.body)
      })
    })

    const signUpButton = page.getByRole('button', selectors.signUp.cta.validate)
    await page.goto(selectors.signUp.URL)

    // Verify that texts don't contain translation keys
    const elements = await page.$$('text=/.tk_/')
    expect(elements.length).toBe(0)

    // Check for the presence of elements
    await expect(page.getByRole('heading', selectors.signUp.title)).toBeVisible()
    await expect(page.getByLabel(selectors.fields.firstName)).toBeVisible()
    await expect(page.getByLabel(selectors.fields.lastName)).toBeVisible()
    await expect(page.getByLabel(selectors.fields.email)).toBeVisible()
    await expect(page.getByLabel(selectors.fields.password)).toBeVisible()
    await expect(signUpButton).toBeVisible()

    // Test with empty fields
    await signUpButton.click()
    await expect(page.getByText(selectors.errors.requiredFirstName)).toBeVisible()
    await expect(page.getByText(selectors.errors.requiredLastName)).toBeVisible()
    await expect(page.getByText(selectors.errors.requiredEmail)).toBeVisible()
    await expect(page.getByText(selectors.errors.shortPassword)).toBeVisible()

    // Test with invalid password (without uppercase, lowercase and number)
    await page.getByLabel(selectors.fields.email).fill(testData.email)
    await page.getByLabel(selectors.fields.password).fill(testData.passwordInvalid)
    await signUpButton.click()
    await expect(page.getByText(selectors.errors.passwordComplexity)).toBeVisible()

    // Test with password too short
    await page.getByLabel(selectors.fields.email).fill(testData.email)
    await page.getByLabel(selectors.fields.password).fill(testData.passwordShort)
    await signUpButton.click()
    await expect(page.getByText(selectors.errors.shortPassword)).toBeVisible()

    // Test successful creation
    await page.getByLabel(selectors.fields.firstName).fill(testData.firstName)
    await page.getByLabel(selectors.fields.lastName).fill(testData.lastName)
    await page.getByLabel(selectors.fields.email).fill(testData.email)
    await page.getByLabel(selectors.fields.password).fill(testData.passwordValid)

    /**
     * Mock the signup endpoint
     */
    await page.route('**/auth/signup', async (route) => {
      await route.fulfill({
        status: testApi.signUp.success.status,
        contentType: 'application/json',
        body: JSON.stringify(testApi.signUp.success.body)
      })
    })
    await signUpButton.click()

    // Wait for success message to be visible with increased timeout
    await expect(page.getByText(selectors.signUp.success.title)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(selectors.signUp.success.subtitle)).toBeVisible()
    await expect(page.getByText(selectors.signUp.success.description)).toBeVisible()
    await expect(page.getByText(testData.email)).toBeVisible()
    await expect(page.getByText(selectors.signUp.success.subdescription)).toBeVisible()
  })

  test('should handle signin with token in URL', async ({ page }) => {
    const signInButton = page.getByRole('button', selectors.signIn.cta.validate)

    /**
     * Mock the signin endpoint
     */
    await (page as CustomPage).mockRoute(testApi.signIn.URL, async (route) => {
      const json = await route.request().postDataJSON()
      expect(json.confirmAccountToken).toBe(testData.confirmAccountToken)

      await route.fulfill({
        status: testApi.signIn.success.status,
        contentType: 'application/json',
        body: JSON.stringify(testApi.signIn.success.body)
      })
    })

    /**
     * Mock the user endpoint
     */
    await (page as CustomPage).mockRoute(testApi.me.URL, async (route) => {
      await route.fulfill({
        status: testApi.me.success.status,
        contentType: 'application/json',
        body: JSON.stringify(testApi.me.success.body)
      })
    })

    // Navigate to the signin page and fill the form
    await page.goto(`${selectors.signIn.URL}?confirmAccountToken=${testData.confirmAccountToken}`)
    await page.getByLabel(selectors.fields.email).fill(testData.email)
    await page.getByLabel(selectors.fields.password).fill(testData.passwordValid)

    // Submit and validate
    await signInButton.click()
    await expect(page).toHaveURL(selectors.signIn.successURL)
  })

  test('should handle signout', async ({ page }) => {
    /**
     * Mock the user endpoint
     */
    await (page as CustomPage).mockRoute(testApi.me.URL, async (route) => {
      await route.fulfill({
        status: testApi.me.success.status,
        contentType: 'application/json',
        body: JSON.stringify(testApi.me.success.body)
      })
    })

    await (page as CustomPage).mockRoute(testApi.signOut.URL, async (route) => {
      await route.fulfill({
        status: testApi.signOut.success.status,
        contentType: 'application/json',
        body: JSON.stringify(testApi.signOut.success.body)
      })
    })

    /**
     * Simulate a logged in user
     */
    await page.evaluate((userData) => {
      localStorage.setItem('authMe', JSON.stringify(userData))
    }, testApi.me.success.body)

    // Navigate to the dashboard
    await page.goto(selectors.dashboard.URL)

    // Verify that the user is logged in
    await expect(page.getByText(testApi.me.success.body.email)).toBeVisible()

    // Click on the user menu and sign out
    await page.getByRole('button', selectors.dashboard.cta.userMenu).click()
    await page.getByRole('menuitem', selectors.dashboard.cta.signOut).click()

    // Verify that the user is redirected to the signin page
    await expect(page).toHaveURL(selectors.signIn.URL)
  })

  test('should handle password reset request', async ({ page }) => {
    /**
     * Mock the reset password request endpoint
     */
    await (page as CustomPage).mockRoute(testApi.resetPasswordRequest.URL, async (route) => {
      const request = route.request()
      const email = (await request.postDataJSON())?.email

      if (email === testData.emailInvalid) {
        await route.fulfill({
          status: testApi.resetPasswordRequest.error.status,
          contentType: 'application/json',
          body: JSON.stringify(testApi.resetPasswordRequest.error.body)
        })
      } else {
        await route.fulfill({
          status: testApi.resetPasswordRequest.success.status,
          contentType: 'application/json',
          body: JSON.stringify(testApi.resetPasswordRequest.success.body)
        })
      }
    })

    await page.goto(selectors.resetPasswordRequest.URL)

    // Wait for guest access to be loaded
    await page.waitForFunction(
      () => {
        const guestAccess = localStorage.getItem('guestAccess')
        return guestAccess !== null
      },
      { timeout: 5000 }
    )

    // Verify that texts don't contain translation keys
    const elements = await page.$$('text=/.tk_/')
    expect(elements.length).toBe(0)

    // Verify presence of elements
    await expect(page.getByRole('heading', selectors.resetPasswordRequest.title)).toBeVisible()
    await expect(page.getByLabel(selectors.fields.email)).toBeVisible()
    await expect(page.getByRole('button', selectors.resetPasswordRequest.cta.validate)).toBeVisible()
    await expect(page.getByRole('link', selectors.resetPasswordRequest.cta.backToSignIn)).toBeVisible()

    // Test with empty email
    await page.getByRole('button', selectors.resetPasswordRequest.cta.validate).click()
    await expect(page.getByText(selectors.errors.requiredEmail)).toBeVisible()

    // Test with invalid email
    await page.getByLabel(selectors.fields.email).fill(testData.emailInvalid)
    await page.getByRole('button', selectors.resetPasswordRequest.cta.validate).click()
    await expect(page.getByText(selectors.errors.invalidEmail)).toBeVisible()

    // Test that user can't know if email exists in DB on reset password request
    await page.getByLabel(selectors.fields.email).fill('nonexistent@example.com')
    await page.getByRole('button', selectors.resetPasswordRequest.cta.validate).click()
    await expect(page.getByText(selectors.resetPasswordRequest.success.title)).toBeVisible()

    // Test refreshing the page to return to initial state
    await page.goto(selectors.resetPasswordRequest.URL)
    await expect(page.getByRole('heading', selectors.resetPasswordRequest.title)).toBeVisible()

    // Test successful reset password request
    await page.getByLabel(selectors.fields.email).fill(testData.email)
    await page.getByRole('button', selectors.resetPasswordRequest.cta.validate).click()

    // Verify success page is displayed
    await expect(page.getByText(selectors.resetPasswordRequest.success.title)).toBeVisible()
    await expect(page.getByText(selectors.resetPasswordRequest.success.subtitle)).toBeVisible()
    await expect(page.getByText(testData.email)).toBeVisible()
    await expect(page.getByText(selectors.resetPasswordRequest.success.description)).toBeVisible()
    await expect(page.getByRole('link', selectors.resetPasswordRequest.cta.backToSignIn)).toBeVisible()
  })

  test('should handle password reset with token', async ({ page }) => {
    /**
     * Mock the reset password endpoint
     */
    await (page as CustomPage).mockRoute(testApi.resetPassword.URL, async (route) => {
      await route.fulfill({
        status: testApi.resetPassword.success.status,
        contentType: 'application/json',
        body: JSON.stringify(testApi.resetPassword.success.body)
      })
    })

    // Test without token
    await page.goto(selectors.resetPassword.URL)

    // Wait for guest access to be loaded
    await page.waitForFunction(
      () => {
        const guestAccess = localStorage.getItem('guestAccess')
        return guestAccess !== null
      },
      { timeout: 5000 }
    )

    // Verify that texts don't contain translation keys
    const elements = await page.$$('text=/.tk_/')
    expect(elements.length).toBe(0)

    await expect(page.getByText(selectors.errors.missingToken)).toBeVisible()
    await expect(page.getByRole('link', selectors.resetPassword.cta.askForNewLink)).toBeVisible()

    // Test with invalid token (too short)
    await page.goto(`${selectors.resetPassword.URL}?resetPasswordToken=short`)
    await expect(page.getByText(selectors.errors.invalidToken)).toBeVisible()
    await expect(page.getByRole('link', selectors.resetPassword.cta.askForNewLink)).toBeVisible()

    // Test with valid token
    await page.goto(`${selectors.resetPassword.URL}?resetPasswordToken=${testData.resetPasswordToken}`)

    // Verify the presence of elements
    await expect(page.getByRole('heading', selectors.resetPassword.title)).toBeVisible()
    await expect(page.getByText(selectors.resetPassword.description)).toBeVisible()
    await expect(page.getByLabel(selectors.fields.newPassword)).toBeVisible()
    await expect(page.getByLabel(selectors.fields.confirmPassword)).toBeVisible()
    await expect(page.getByRole('button', selectors.resetPassword.cta.validate)).toBeVisible()

    // Test with different passwords
    await page.getByLabel(selectors.fields.newPassword).fill(testData.passwordValid)
    await page.getByLabel(selectors.fields.confirmPassword).fill(testData.passwordInvalid)
    await page.getByRole('button', selectors.resetPassword.cta.validate).click()
    await expect(page.getByText(selectors.errors.passwordsDoNotMatch)).toBeVisible()

    // Test with a password not respecting the complexity
    await page.getByLabel(selectors.fields.newPassword).fill(testData.passwordInvalid)
    await page.getByLabel(selectors.fields.confirmPassword).fill(testData.passwordInvalid)
    await page.getByRole('button', selectors.resetPassword.cta.validate).click()
    await expect(page.getByText(selectors.errors.passwordComplexity)).toBeVisible()

    // Test with a password too short
    await page.getByLabel(selectors.fields.newPassword).fill(testData.passwordShort)
    await page.getByLabel(selectors.fields.confirmPassword).fill(testData.passwordShort)
    await page.getByRole('button', selectors.resetPassword.cta.validate).click()
    await expect(page.getByText(selectors.errors.shortPassword)).toBeVisible()

    // Test successful reset password
    await page.getByLabel(selectors.fields.newPassword).fill(testData.passwordValid)
    await page.getByLabel(selectors.fields.confirmPassword).fill(testData.passwordValid)
    await page.getByRole('button', selectors.resetPassword.cta.validate).click()

    // Verify the success page is displayed
    await expect(page.getByText(selectors.resetPassword.success.title)).toBeVisible()
    await expect(page.getByText(selectors.resetPassword.success.subtitle)).toBeVisible()
    await expect(page.getByText(selectors.resetPassword.success.description)).toBeVisible()
    await expect(page.getByRole('link', selectors.resetPassword.cta.backToSignIn)).toBeVisible()
  })

  test('should initialize guest access when not logged in', async ({ page }) => {
    // Clear any existing auth data
    await page.evaluate(() => {
      localStorage.removeItem('authMe')
      localStorage.removeItem('guestAccess')
    })

    /**
     * Mock the guest endpoint
     */
    await (page as CustomPage).mockRoute(testApi.guest.URL, async (route) => {
      await route.fulfill({
        status: testApi.guest.success.status,
        contentType: 'application/json',
        body: JSON.stringify(testApi.guest.success.body)
      })
    })

    // Navigate to signin page and wait for the guest access to be initialized
    await page.goto(selectors.signIn.URL)

    // Wait for the guest access to be initialized
    await page.waitForFunction(
      () => {
        const guestAccess = localStorage.getItem('guestAccess')
        return guestAccess !== null
      },
      { timeout: 5000 }
    )

    // Verify guest access is initialized
    const guestAccess = await page.evaluate(() => {
      return localStorage.getItem('guestAccess')
    })
    expect(guestAccess).toBeTruthy()
    expect(JSON.parse(guestAccess!)).toEqual(testApi.guest.success.body)
  })

  test('should not initialize guest access when logged in', async ({ page }) => {
    // Clear any existing auth data
    await page.evaluate(() => {
      localStorage.removeItem('authMe')
      localStorage.removeItem('guestAccess')
    })

    /**
     * Mock the user endpoint
     */
    await (page as CustomPage).mockRoute(testApi.me.URL, async (route) => {
      await route.fulfill({
        status: testApi.me.success.status,
        contentType: 'application/json',
        body: JSON.stringify(testApi.me.success.body)
      })
    })

    /**
     * Mock the guest endpoint to not be called
     */
    await (page as CustomPage).mockRoute(testApi.guest.URL, async (route) => {
      await route.abort()
    })

    // Simulate a logged in user
    await page.evaluate((userData) => {
      localStorage.setItem('authMe', JSON.stringify(userData))
      localStorage.removeItem('guestAccess')
    }, testApi.me.success.body)

    // Navigate to signin page and wait for any potential guest access initialization
    await page.goto(selectors.signIn.URL)

    // Wait a bit to ensure any async operations are complete
    await page.waitForTimeout(1000)

    // Verify guest access is not initialized
    const guestAccess = await page.evaluate(() => {
      return localStorage.getItem('guestAccess')
    })
    expect(guestAccess).toBeNull()
  })
})
