/**
 * Account tab — connected OAuth accounts (§3.3).
 *
 * Google is the only OAuth provider wired up in this project (see
 * components/auth/GoogleButton.tsx, used at login/register). Full
 * connect/disconnect management (including the "can't disconnect the last
 * auth method" lockout guard) requires provider-linking APIs this project
 * doesn't yet exercise end-to-end, so — per this task's scope — this tab
 * is a read-only stub rather than a functional connect/disconnect flow.
 */
export default function ConnectedAccounts() {
  return (
    <div className="mb-8">
      <h3 className="text-base font-semibold text-gray-900 mb-3">Connected accounts</h3>
      <div className="max-w-md flex items-center justify-between border border-gray-200 rounded-lg px-4 h-14">
        <span className="text-sm text-gray-700">Google</span>
        <span className="text-xs text-gray-400">Manage from your Google account</span>
      </div>
    </div>
  )
}
