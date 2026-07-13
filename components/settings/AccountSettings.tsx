import ChangePasswordForm from './ChangePasswordForm'
import ChangeEmailForm from './ChangeEmailForm'
import ConnectedAccounts from './ConnectedAccounts'
import DeleteAccountDanger from './DeleteAccountDanger'

/** Account tab (§3.3): password, email, connected accounts, danger zone. */
export default function AccountSettings() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
      <ChangePasswordForm />
      <ChangeEmailForm />
      <ConnectedAccounts />
      <DeleteAccountDanger />
    </div>
  )
}
