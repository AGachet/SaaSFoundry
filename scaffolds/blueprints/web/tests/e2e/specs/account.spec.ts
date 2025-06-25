/**
 * Resources
 */
import { expect, Page, Route, test } from '@playwright/test'

/**
 * Dependencies
 */
import { selectors, testApi, testData } from '../selectors/account.se'
import { selectors as authSelectors, testApi as authTestApi } from '../selectors/auth.se'
import { selectors as globaleSelectors } from '../selectors/globale.se'
import { setupApiInterceptor } from '../utils/api-interceptor'

/**
 * Types
 */
interface CustomPage extends Page {
  mockRoute: (url: string, handler: (route: Route) => Promise<void>) => Promise<void>
}

/**
 * Setup authenticated user
 */
async function setupAuthenticatedUser(page: CustomPage, user: 'admin' | 'user') {
  // First navigate to the app
  await page.goto('/')

  const meEndpoint = user === 'admin' ? authTestApi.meAdmin : authTestApi.meUser

  // Mock the user endpoint
  await page.mockRoute(meEndpoint.URL, async (route) => {
    await route.fulfill({
      status: meEndpoint.success.status,
      contentType: 'application/json',
      body: JSON.stringify(meEndpoint.success.body)
    })
  })

  // Now set localStorage after the page is loaded
  await page.evaluate((userData) => {
    localStorage.setItem('authMe', JSON.stringify(userData))
  }, meEndpoint.success.body)
}

/**
 * Tests
 */
test.describe('Account Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API interceptor to avoid accidental API calls
    await setupApiInterceptor(page, testApi.interceptorURL)

    // Mock account data by default
    await (page as CustomPage).mockRoute(testApi.account.URL, async (route) => {
      await route.fulfill({
        status: testApi.account.success.status,
        contentType: 'application/json',
        body: JSON.stringify(testApi.account.success.body)
      })
    })
  })

  test('should not display account menu item if user has no permission', async ({ page }) => {
    // Setup authenticated user
    await setupAuthenticatedUser(page as CustomPage, 'user')
    await page.goto(authSelectors.dashboard.URL)

    // Navigate to the account page
    await page.getByRole('button', authSelectors.dashboard.cta.userMenu).click()
    await expect(page.getByRole('menuitem', authSelectors.dashboard.cta.account)).not.toBeVisible()

    // Check page access
    await page.goto(selectors.URL)
    await expect(page).toHaveURL(authSelectors.dashboard.URL)
  })

  test('should display account tabs with overview tab active for admin user', async ({ page }) => {
    // Setup authenticated user
    await setupAuthenticatedUser(page as CustomPage, 'admin')
    await page.goto(authSelectors.dashboard.URL)

    // Navigate to the account page
    await page.getByRole('button', authSelectors.dashboard.cta.userMenu).click()
    await page.getByRole('menuitem', authSelectors.dashboard.cta.account).click()

    // Check for the success URL
    await expect(page).toHaveURL(selectors.accountOverview.successURL)

    // Check for the overview tab being active
    await expect(page.getByRole('tab', selectors.sectionTabs.overview)).toHaveAttribute('data-state', 'active')
    await expect(page.getByRole('tab', selectors.sectionTabs.entities)).toBeVisible()
    await expect(page.getByRole('tab', selectors.sectionTabs.users)).toBeVisible()

    // Check overview tab content
    await expect(page.getByTestId(selectors.accountOverview.accountInfo.blockId)).toBeVisible()
    await expect(page.getByTestId(selectors.accountOverview.statisticsCards.blockId)).toBeVisible()
    await expect(page.getByTestId(selectors.accountOverview.recentUsers.blockId)).toBeVisible()
    await expect(page.getByTestId(selectors.accountOverview.recentEntities.blockId)).toBeVisible()
    await expect(page.getByTestId(selectors.accountOverview.recentRoles.blockId)).toBeVisible()
  })

  test('should not have translation keys in the page', async ({ page }) => {
    const elements = await page.$$('text=/.tk_/')
    expect(elements.length).toBe(0)
  })

  test.describe('Account Overview', () => {
    test.beforeEach(async ({ page }) => {
      // Setup authenticated user
      await setupAuthenticatedUser(page as CustomPage, 'admin')
      await page.goto(selectors.URL)
    })

    test('should display correct breadcrumb', async ({ page }) => {
      const breadcrumb = page.getByLabel(globaleSelectors.breadcrumb.ariaLabel.name)
      const pageDescription = page.getByTestId(globaleSelectors.breadcrumb.blockId)
      await expect(breadcrumb).toBeVisible()
      await expect(breadcrumb.locator('li')).toHaveCount(3)
      await expect(breadcrumb.locator('li').nth(0)).toHaveText('Account')
      await expect(breadcrumb.locator('li').nth(2)).toHaveText('Overview')
      await expect(pageDescription).toHaveText('View and manage your account details')
    })

    test('should not have translation keys in the page', async ({ page }) => {
      const elements = await page.$$('text=/.tk_/')
      expect(elements.length).toBe(0)
    })

    test('should display account information correctly', async ({ page }) => {
      const accountBlock = page.getByTestId(selectors.accountOverview.accountInfo.blockId)

      // Check account title
      await expect(accountBlock.getByText(selectors.accountOverview.accountInfo.title)).toBeVisible()

      // Check account subtitle
      await expect(accountBlock.getByText(selectors.accountOverview.accountInfo.subtitle)).toBeVisible()

      // Check account name
      await expect(accountBlock.getByText(testApi.account.success.body.name)).toBeVisible()

      // Check account ID
      await expect(accountBlock.getByText(testApi.account.success.body.id)).toBeVisible()

      // Check active badge
      await expect(accountBlock.getByText('Active')).toBeVisible()

      // Check created at
      const createdAt = new Date(testApi.account.success.body.createdAt).toLocaleString('en-US')
      await expect(accountBlock.getByText(new RegExp(`Created at\\s*${createdAt}`))).toBeVisible()

      // Check updated at
      const updatedAt = new Date(testApi.account.success.body.updatedAt).toLocaleString('en-US')
      await expect(accountBlock.getByText(new RegExp(`Updated at\\s*${updatedAt}`))).toBeVisible()
    })

    test('should display statistics cards correctly', async ({ page }) => {
      const statisticsBlock = page.getByTestId(selectors.accountOverview.statisticsCards.blockId)

      // Check statistics title
      await expect(statisticsBlock.getByText(selectors.accountOverview.statisticsCards.title)).toBeVisible()

      // Check statistics subtitle
      await expect(statisticsBlock.getByText(selectors.accountOverview.statisticsCards.subtitle)).toBeVisible()

      // Check users count
      const usersStats = statisticsBlock.getByLabel(selectors.accountOverview.statisticsCards.users.ariaLabel.name)
      await expect(usersStats.getByText(testApi.account.success.body.users.count.toString())).toBeVisible()
      await expect(usersStats.getByText(selectors.accountOverview.statisticsCards.users.label)).toBeVisible()

      // Check entities count
      const entitiesStats = statisticsBlock.getByLabel(selectors.accountOverview.statisticsCards.entities.ariaLabel.name)
      await expect(entitiesStats.getByText(testApi.account.success.body.entities.count.toString())).toBeVisible()
      await expect(entitiesStats.getByText(selectors.accountOverview.statisticsCards.entities.label)).toBeVisible()

      // Check roles count
      const rolesStats = statisticsBlock.getByLabel(selectors.accountOverview.statisticsCards.roles.ariaLabel.name)
      await expect(rolesStats.getByText(testApi.account.success.body.roles.count.toString())).toBeVisible()
      await expect(rolesStats.getByText(selectors.accountOverview.statisticsCards.roles.label)).toBeVisible()
    })

    test('should display recent users correctly', async ({ page }) => {
      const recentUsersBlock = page.getByTestId(selectors.accountOverview.recentUsers.blockId)

      // Check users title
      await expect(recentUsersBlock.getByText(selectors.accountOverview.recentUsers.title)).toBeVisible()

      // Check users subtitle
      await expect(recentUsersBlock.getByText(selectors.accountOverview.recentUsers.subtitle)).toBeVisible()

      // Check that display as many users as the account (because we have 2 users in the account)
      await expect(recentUsersBlock.locator('li')).toHaveCount(testApi.account.success.body.users.values.length)

      // Check that display correct information in user
      const firstUserApi = testApi.account.success.body.users.values[0]
      const firstUserUI = recentUsersBlock.locator('li').first()
      const createdAt = new Date(firstUserApi.createdAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      })

      await expect(firstUserUI.getByText(new RegExp(firstUserApi.people?.firstname))).toBeVisible()
      await expect(firstUserUI.getByText(new RegExp(firstUserApi.people?.lastname))).toBeVisible()
      await expect(firstUserUI.getByText(new RegExp(firstUserApi.email))).toBeVisible()
      await expect(firstUserUI.getByText(new RegExp(createdAt))).toBeVisible()

      // Check "View all users" link
      await expect(recentUsersBlock.getByRole('link', selectors.accountOverview.recentUsers.cta.viewAll)).toBeVisible()
    })

    test('should display recent entities correctly', async ({ page }) => {
      const recentEntitiesBlock = page.getByTestId(selectors.accountOverview.recentEntities.blockId)

      // Check users title
      await expect(recentEntitiesBlock.getByText(selectors.accountOverview.recentEntities.title)).toBeVisible()

      // Check users subtitle
      await expect(recentEntitiesBlock.getByText(selectors.accountOverview.recentEntities.subtitle)).toBeVisible()

      // Check that display as many users as the account (because we have 2 users in the account)
      await expect(recentEntitiesBlock.locator('li')).toHaveCount(testApi.account.success.body.entities.values.length)

      // Check that display correct information in user
      const firstEntityApi = testApi.account.success.body.entities.values[0]
      const firstEntityUI = recentEntitiesBlock.locator('li').first()
      const createdAt = new Date(firstEntityApi.createdAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      })

      await expect(firstEntityUI.getByText(new RegExp(firstEntityApi.name))).toBeVisible()
      await expect(firstEntityUI.getByText(new RegExp(firstEntityApi.organization?.name))).toBeVisible()
      await expect(firstEntityUI.getByText(new RegExp(createdAt))).toBeVisible()

      // Check "View all users" link
      await expect(recentEntitiesBlock.getByRole('link', selectors.accountOverview.recentEntities.cta.viewAll)).toBeVisible()
    })

    test('should display recent roles correctly', async ({ page }) => {
      const recentRolesBlock = page.getByTestId(selectors.accountOverview.recentRoles.blockId)

      // Check users title
      await expect(recentRolesBlock.getByText(selectors.accountOverview.recentRoles.title)).toBeVisible()

      // Check users subtitle
      await expect(recentRolesBlock.getByText(selectors.accountOverview.recentRoles.subtitle)).toBeVisible()

      // Check that display as many users as the account (because we have 2 users in the account)
      await expect(recentRolesBlock.locator('li')).toHaveCount(testApi.account.success.body.roles.values.length)

      // Check that display correct information in user
      const firstRoleApi = testApi.account.success.body.roles.values[0]
      const firstRoleUI = recentRolesBlock.locator('li').first()
      const createdAt = new Date(firstRoleApi.createdAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      })

      await expect(firstRoleUI.getByText(new RegExp(firstRoleApi.name))).toBeVisible()
      await expect(firstRoleUI.getByText(new RegExp(firstRoleApi.description))).toBeVisible()
      await expect(firstRoleUI.getByText(new RegExp(createdAt))).toBeVisible()
    })
  })

  test.describe('Account Entities', () => {
    test.beforeEach(async ({ page }) => {
      // Setup authenticated user
      await setupAuthenticatedUser(page as CustomPage, 'admin')

      // First navigate to the account page
      await page.goto(selectors.URL)

      // Mock entities data by default
      await (page as CustomPage).mockRoute(testApi.entities.URL, async (route) => {
        await route.fulfill({
          status: testApi.entities.success.status,
          contentType: 'application/json',
          body: JSON.stringify(testApi.entities.success.body)
        })
      })

      // Then click on the entities tab
      await page.getByRole('tab', selectors.sectionTabs.entities).click()
    })

    test('should display correct breadcrumb', async ({ page }) => {
      const breadcrumb = page.getByLabel(globaleSelectors.breadcrumb.ariaLabel.name)
      const pageDescription = page.getByTestId(globaleSelectors.breadcrumb.blockId)
      await expect(breadcrumb).toBeVisible()
      await expect(breadcrumb.locator('li')).toHaveCount(3)
      await expect(breadcrumb.locator('li').nth(0)).toHaveText('Account')
      await expect(breadcrumb.locator('li').nth(2)).toHaveText('Entities')
      await expect(pageDescription).toHaveText('Manage your business entities and their settings')
      await expect(page).toHaveURL(selectors.accountEntities.successURL)
    })

    test('should not have translation keys in the page', async ({ page }) => {
      const elements = await page.$$('text=/.tk_/')
      expect(elements.length).toBe(0)
    })

    test('should display filters and action button', async ({ page }) => {
      // Check search & status filters
      await expect(page.getByTestId(globaleSelectors.filters.search.blockId)).toBeVisible()
      await expect(page.getByTestId(globaleSelectors.filters.status.blockId)).toBeVisible()
      // Check create entity button
      await expect(page.getByRole('button', selectors.accountEntities.cta.createEntity)).toBeVisible()
    })

    test('should display table with correct columns', async ({ page }) => {
      const headers = selectors.accountEntities.table.headers
      await expect(page.getByRole('cell', headers.entity)).toBeVisible()
      await expect(page.getByRole('cell', headers.status)).toBeVisible()
      await expect(page.getByRole('cell', headers.organization)).toBeVisible()
      await expect(page.getByRole('cell', headers.createdAt)).toBeVisible()
    })

    test('should display correct entity row with all data', async ({ page }) => {
      const rows = page.locator('tbody tr')
      await expect(rows).toHaveCount(testApi.entities.success.body.items.length)

      const firstEntity = testApi.entities.success.body.items[0]
      const firstRow = rows.first()

      // Check entity name and description
      await expect(firstRow.getByText(new RegExp(firstEntity.name))).toBeVisible()
      await expect(firstRow.getByText(new RegExp(firstEntity.description))).toBeVisible()

      // Check status
      await expect(firstRow.getByText(/Active/i)).toBeVisible()

      // Check organization
      await expect(firstRow.getByText(new RegExp(firstEntity.organization.name))).toBeVisible()

      // Check created at
      const createdAt = new Date(firstEntity.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
      // Check created at format (ex: Jun 2, 2025)
      await expect(firstRow.getByText(new RegExp(createdAt))).toBeVisible()
    })

    test.describe('Create entity', () => {
      test('should display create entity modal', async ({ page }) => {
        const dialog = page.getByRole('dialog')
        await page.getByRole('button', selectors.accountEntities.cta.createEntity).click()
        await expect(dialog).toBeVisible()

        // Check dialog header
        await expect(dialog.getByText(new RegExp(selectors.accountEntities.newEntityDialog.title.name))).toBeVisible()
        await expect(dialog.getByText(new RegExp(selectors.accountEntities.newEntityDialog.subtitle.name))).toBeVisible()
        // Check create button
        await expect(page.getByRole('button', selectors.accountEntities.newEntityDialog.cta.create)).toBeVisible()
        // Check entity content
        const entityContent = dialog.getByTestId(selectors.accountEntities.newEntityDialog.entity.blockId)
        await expect(entityContent.getByText(new RegExp(selectors.accountEntities.newEntityDialog.entity.title.name))).toBeVisible()
        await expect(entityContent.getByLabel(globaleSelectors.fields.name)).toBeVisible()
        await expect(entityContent.getByLabel(globaleSelectors.fields.description)).toBeVisible()
        // Check organization content
        const organizationContent = dialog.getByTestId(selectors.accountEntities.newEntityDialog.organization.blockId)
        await expect(organizationContent.getByText(new RegExp(selectors.accountEntities.newEntityDialog.organization.title.name))).toBeVisible()
        await expect(organizationContent.getByLabel(globaleSelectors.fields.name)).toBeVisible()
        await expect(organizationContent.getByLabel(globaleSelectors.fields.description)).toBeVisible()
        await expect(organizationContent.getByLabel(globaleSelectors.fields.type)).toBeVisible()
        await expect(organizationContent.getByLabel(globaleSelectors.fields.website)).toBeVisible()

        // Check organization type
        await organizationContent.getByRole('combobox', selectors.accountEntities.newEntityDialog.organization.types.cta).click()
        await expect(page.getByRole('listbox').getByText(selectors.accountEntities.newEntityDialog.organization.types.list.name)).toBeVisible()
      })

      test('should not create entity if form is invalid & rise error messages', async ({ page }) => {
        const dialog = page.getByRole('dialog')
        await page.getByRole('button', selectors.accountEntities.cta.createEntity).click()
        await expect(dialog).toBeVisible()

        // Check error message
        dialog.getByRole('button', selectors.accountEntities.newEntityDialog.cta.create).click()
        const entityContent = dialog.getByTestId(selectors.accountEntities.newEntityDialog.entity.blockId)
        await expect(entityContent.getByText(globaleSelectors.fields.errors.minLength)).toBeVisible()

        const organizationContent = dialog.getByTestId(selectors.accountEntities.newEntityDialog.organization.blockId)
        await expect(organizationContent.getByText(globaleSelectors.fields.errors.minLength)).toBeVisible()
      })

      test('should create entity with organization', async ({ page }) => {
        // Mock create organization
        await (page as CustomPage).mockRoute(testApi.createOrganization.URL, async (route) => {
          await route.fulfill({
            status: testApi.createOrganization.success.status,
            contentType: 'application/json',
            body: JSON.stringify(testApi.createOrganization.success.body)
          })
        })

        // Mock create entity
        await (page as CustomPage).mockRoute(testApi.createEntity.URL, async (route) => {
          await route.fulfill({
            status: testApi.createEntity.success.status,
            contentType: 'application/json',
            body: JSON.stringify(testApi.createEntity.success.body)
          })
        })

        // Mock entities data by default
        await (page as CustomPage).mockRoute(testApi.entities.URL, async (route) => {
          await route.fulfill({
            status: testApi.entities.success.status,
            contentType: 'application/json',
            body: JSON.stringify(testApi.entities.success.body2)
          })
        })

        const dialog = page.getByRole('dialog')
        await page.getByRole('button', selectors.accountEntities.cta.createEntity).click()
        await expect(dialog).toBeVisible()

        // Fill Entity form with valid data
        const entityContent = dialog.getByTestId(selectors.accountEntities.newEntityDialog.entity.blockId)
        await entityContent.getByLabel(globaleSelectors.fields.name).fill(testData.entityName2)
        await entityContent.getByLabel(globaleSelectors.fields.description).fill(testData.entityDescription2)

        // Fill Organization form with valid data
        const organizationContent = dialog.getByTestId(selectors.accountEntities.newEntityDialog.organization.blockId)
        await organizationContent.getByLabel(globaleSelectors.fields.name).fill(testData.organizationName2)
        await organizationContent.getByLabel(globaleSelectors.fields.description).fill(testData.organizationDescription2)

        // Click on create button
        await page.getByRole('button', selectors.accountEntities.newEntityDialog.cta.create).click()
        await expect(dialog).not.toBeVisible({ timeout: 5000 })

        // Check that the entity is created
        const rows = page.locator('tbody tr')
        await expect(rows).toHaveCount(testApi.entities.success.body2.items.length)
      })
    })
  })

  test.describe('Account Users', () => {
    test.beforeEach(async ({ page }) => {
      // Setup authenticated user
      await setupAuthenticatedUser(page as CustomPage, 'admin')

      // First navigate to the account page
      await page.goto(selectors.URL)

      // Mock entities data by default
      await (page as CustomPage).mockRoute(testApi.entities.URL, async (route) => {
        await route.fulfill({
          status: testApi.entities.success.status,
          contentType: 'application/json',
          body: JSON.stringify(testApi.entities.success.body)
        })
      })

      // Mock roles data for roles filter
      await (page as CustomPage).mockRoute(testApi.roles.URL, async (route) => {
        await route.fulfill({
          status: testApi.roles.success.status,
          contentType: 'application/json',
          body: JSON.stringify(testApi.roles.success.body)
        })
      })

      // Mock invitations data
      await (page as CustomPage).mockRoute(testApi.invitations.URL, async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: testApi.invitations.success.status,
            contentType: 'application/json',
            body: JSON.stringify(testApi.invitations.success.body)
          })
        }
      })

      // Mock users data by default
      await (page as CustomPage).mockRoute(testApi.users.URL, async (route) => {
        await route.fulfill({
          status: testApi.users.success.status,
          contentType: 'application/json',
          body: JSON.stringify(testApi.users.success.body)
        })
      })

      // Then click on the users tab
      await page.getByRole('tab', selectors.sectionTabs.users).click()
    })

    test('should display correct breadcrumb', async ({ page }) => {
      const breadcrumb = page.getByLabel(globaleSelectors.breadcrumb.ariaLabel.name)
      const pageDescription = page.getByTestId(globaleSelectors.breadcrumb.blockId)
      await expect(breadcrumb).toBeVisible()
      await expect(breadcrumb.locator('li')).toHaveCount(3)
      await expect(breadcrumb.locator('li').nth(0)).toHaveText('Account')
      await expect(breadcrumb.locator('li').nth(2)).toHaveText('Users')
      await expect(pageDescription).toHaveText('Manage your team members and their permissions')
      await expect(page).toHaveURL(selectors.accountUsers.successURL)
    })

    test('should not have translation keys in the page', async ({ page }) => {
      const elements = await page.$$('text=/.tk_/')
      expect(elements.length).toBe(0)
    })

    test('should display filters and action button', async ({ page }) => {
      // Check search & status filters
      await expect(page.getByTestId(globaleSelectors.filters.search.blockId)).toBeVisible()
      await expect(page.getByTestId(globaleSelectors.filters.status.blockId)).toBeVisible()
      await expect(page.getByTestId(globaleSelectors.filters.entities.blockId)).toBeVisible()
      await expect(page.getByTestId(globaleSelectors.filters.roles.blockId)).toBeVisible()
      await expect(page.getByTestId(globaleSelectors.filters.directUsers.blockId)).toBeVisible()
      // Check create entity button
      await expect(page.getByRole('button', selectors.accountUsers.cta.inviteUser)).toBeVisible()
    })

    test('should display table with correct columns', async ({ page }) => {
      const headers = selectors.accountUsers.table.headers
      await expect(page.getByRole('cell', headers.user)).toBeVisible()
      await expect(page.getByRole('cell', headers.status)).toBeVisible()
      await expect(page.getByRole('cell', headers.entities)).toBeVisible()
      await expect(page.getByRole('cell', headers.roles)).toBeVisible()
      await expect(page.getByRole('cell', headers.createdAt)).toBeVisible()
    })

    test('should display correct entity row with all data', async ({ page }) => {
      const rows = page.locator('tbody tr')
      await expect(rows).toHaveCount(testApi.users.success.body.items.length)

      const firstUser = testApi.users.success.body.items[0]
      const firstRow = rows.first()

      // Check entity name and description
      await expect(firstRow.getByText(`${firstUser.people.firstname} ${firstUser.people.lastname}`)).toBeVisible()
      await expect(firstRow.getByText(firstUser.email)).toBeVisible()

      // Check status
      await expect(firstRow.getByText(/Active/i)).toBeVisible()

      // Check entities
      await expect(firstRow.getByText(new RegExp(firstUser.entities[0].name))).toBeVisible()
      await expect(firstRow.getByText(new RegExp(firstUser.entities[0].organization.name))).toBeVisible()

      // Check roles
      await expect(firstRow.getByText(new RegExp(firstUser.roles[0].name))).toBeVisible()

      // Check created at
      const createdAt = new Date(firstUser.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
      // Check created at format (ex: Jun 2, 2025)
      await expect(firstRow.getByText(new RegExp(createdAt))).toBeVisible()
    })

    test.describe('Invite user', () => {
      test('should display invite user modal', async ({ page }) => {
        const dialog = page.getByRole('dialog')
        await page.getByRole('button', selectors.accountUsers.cta.inviteUser).click()
        await expect(dialog).toBeVisible()

        // Check dialog header
        await expect(dialog.getByRole('heading', selectors.accountUsers.inviteUserDialog.title)).toBeVisible()
        await expect(dialog.getByText(new RegExp(selectors.accountUsers.inviteUserDialog.subtitle.name))).toBeVisible()
        // Check create button
        await expect(page.getByRole('button', selectors.accountUsers.inviteUserDialog.cta.invite)).toBeVisible()
        // Checkform
        await expect(dialog.getByLabel(globaleSelectors.fields.email)).toBeVisible()
        await expect(dialog.getByLabel(globaleSelectors.fields.firstname)).toBeVisible()
        await expect(dialog.getByLabel(globaleSelectors.fields.lastname)).toBeVisible()

        // Check roles and entities filters
        const rolesFilter = dialog.getByTestId(selectors.accountUsers.inviteUserDialog.roles.blockId)
        const rolesData = testApi.roles.success.body.items
        await expect(rolesFilter).toBeVisible()
        await expect(rolesFilter.locator('li').nth(0)).toHaveText(new RegExp(rolesData[1].name))
        await expect(rolesFilter.locator('li').nth(1)).toHaveText(new RegExp(rolesData[2].name))

        const entitiesFilter = dialog.getByTestId(selectors.accountUsers.inviteUserDialog.entities.blockId)
        const entitiesData = testApi.entities.success.body.items
        await expect(entitiesFilter).toBeVisible()
        await expect(entitiesFilter.locator('li').nth(0)).toHaveText(new RegExp(entitiesData[0].organization.name))
      })

      test('should not invite user if form is invalid & rise error messages', async ({ page }) => {
        const dialog = page.getByRole('dialog')
        await page.getByRole('button', selectors.accountUsers.inviteUserDialog.cta.invite).click()
        await expect(dialog).toBeVisible()

        // Check error message
        dialog.getByRole('button', selectors.accountUsers.inviteUserDialog.cta.invite).click()
        const emailContent = dialog.getByLabel(globaleSelectors.fields.email)
        await expect(emailContent.locator('..').getByText(globaleSelectors.fields.errors.minLength)).toBeVisible()

        const entitiesFilter = dialog.getByTestId(selectors.accountUsers.inviteUserDialog.entities.blockId)
        await expect(entitiesFilter.locator('..').getByText(globaleSelectors.fields.errors.minOneEntityOrDirectLink)).toBeVisible()
      })

      test('should invite user in entity', async ({ page }) => {
        // Mock create organization
        await (page as CustomPage).mockRoute(testApi.inviteUser.URL, async (route) => {
          if (route.request().method() === 'POST') {
            await route.fulfill({
              status: testApi.inviteUser.success.status,
              contentType: 'application/json',
              body: JSON.stringify(testApi.inviteUser.success.body)
            })
            if (route.request().method() === 'GET') {
              await route.fulfill({
                status: testApi.invitations.success.status,
                contentType: 'application/json',
                body: JSON.stringify(testApi.invitations.success.body)
              })
            }
          }
        })

        const dialog = page.getByRole('dialog')
        await page.getByRole('button', selectors.accountUsers.cta.inviteUser).click()
        await expect(dialog).toBeVisible()

        // Fill email field
        const emailContent = dialog.getByLabel(globaleSelectors.fields.email)
        await emailContent.fill(testData.userEmail)

        // Fill firstname field
        const firstnameContent = dialog.getByLabel(globaleSelectors.fields.firstname)
        await firstnameContent.fill(testData.userFirstName)

        // Fill lastname field
        const lastnameContent = dialog.getByLabel(globaleSelectors.fields.lastname)
        await lastnameContent.fill(testData.userLastName)

        // Select first role
        const rolesFilter = dialog.getByTestId(selectors.accountUsers.inviteUserDialog.roles.blockId)
        await rolesFilter.locator('li').nth(0).click()

        // Select first entity
        const entitiesFilter = dialog.getByTestId(selectors.accountUsers.inviteUserDialog.entities.blockId)
        await entitiesFilter.locator('li').nth(0).click()

        // Click on create button
        await page.getByRole('button', selectors.accountUsers.inviteUserDialog.cta.invite).click()
        await expect(dialog).not.toBeVisible({ timeout: 5000 })
      })
    })
  })
})
