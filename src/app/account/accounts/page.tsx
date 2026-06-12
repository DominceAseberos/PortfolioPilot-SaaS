export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
        Connected Accounts
      </h1>
      <div className="rounded-xl border bg-card p-6">
        <p className="text-muted-foreground">Manage your connected identity providers (Google, GitHub, etc) here.</p>
      </div>
    </div>
  )
}
