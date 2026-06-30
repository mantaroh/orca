import { test, expect } from './helpers/orca-app'
import { waitForSessionReady } from './helpers/store'

// Why: the status-bar re-auth entry only renders when an active Claude managed
// account exists. Seed one directly into the store so the test can assert the
// new button without needing real Claude credentials.
test.describe('claude status bar re-authenticate button', () => {
  test.beforeEach(async ({ orcaPage }) => {
    await waitForSessionReady(orcaPage)
  })

  test('renders the re-authenticate action in the Claude usage menu', async ({ orcaPage }) => {
    await orcaPage.evaluate(() => {
      const store = window.__store
      if (!store) {
        throw new Error('window.__store is not available — is the app in dev mode?')
      }
      const now = Date.now()
      const account = {
        id: 'e2e-claude-screenshot',
        email: 'screenshot@example.com',
        managedAuthPath: '/tmp/e2e-claude-auth',
        managedAuthRuntime: 'host',
        wslDistro: null,
        wslLinuxAuthPath: null,
        authMethod: 'subscription-oauth',
        organizationUuid: null,
        organizationName: 'E2E Org',
        createdAt: now,
        updatedAt: now,
        lastAuthenticatedAt: now
      }
      const state = store.getState() as unknown as { settings: Record<string, unknown> | null }
      const current = state.settings ?? {}
      store.setState({
        settings: {
          ...current,
          claudeManagedAccounts: [account],
          activeClaudeManagedAccountId: account.id,
          activeClaudeManagedAccountIdsByRuntime: { host: account.id, wsl: {} }
        }
      } as never)
    })

    const trigger = orcaPage.getByRole('button', {
      name: /Open Claude details and account switcher|Claude の詳細とアカウント切り替えを開く/
    })
    await expect(trigger).toBeVisible()
    await trigger.click()

    const reauthItem = orcaPage.getByRole('menuitem', { name: /Re-authenticate|再認証/ })
    await expect(reauthItem).toBeVisible()
  })
})
