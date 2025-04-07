import { Page, Route } from '@playwright/test'

// Extend Page type to include our custom method
export interface CustomPage extends Page {
  mockRoute: (url: string, handler: (route: Route) => Promise<void>) => Promise<void>
}

/**
 * Setup API request interceptor to catch unmocked API calls
 */
export const setupApiInterceptor = async (page: Page, interceptorURL: string) => {
  // Keep track of mocked routes with patterns
  const mockedRoutes = new Set<RegExp>()

  // Intercept all API calls that are not explicitly mocked
  await page.route(interceptorURL, async (route) => {
    const request = route.request()
    const url = request.url()

    // Only catch fetch and xhr requests
    const requestType = request.resourceType()
    if (requestType !== 'fetch' && requestType !== 'xhr') {
      await route.continue()
      return
    }

    // Check if any mocked pattern matches this URL
    const isMocked = Array.from(mockedRoutes).some((pattern) => {
      const matches = pattern.test(url)
      return matches
    })
    if (isMocked) {
      await route.continue()
      return
    }

    // Log and abort unauthorized requests
    console.error(`Unauthorized API call: ${request.method()} ${url}`)
    await route.abort('failed')
  })

  // Helper function to mock routes with pattern matching
  const mockRoute = async (urlPattern: string, handler: (route: Route) => Promise<void>) => {
    // For wildcard patterns like **/auth/signup, convert to proper regex
    let patternStr = urlPattern

    // Replace ** with .* to match any characters
    if (urlPattern.includes('**')) {
      patternStr = urlPattern.replace(/\*\*/g, '.*')
    } else {
      // For regular patterns, escape special characters
      patternStr = urlPattern.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
    }

    const pattern = new RegExp(patternStr)

    mockedRoutes.add(pattern)
    await page.route(pattern, handler)
  }

  // Store the helper function on the page object for use in tests
  ;(page as CustomPage).mockRoute = mockRoute

  // Wait a bit to ensure the interceptor is ready
  await page.waitForTimeout(100)
}
