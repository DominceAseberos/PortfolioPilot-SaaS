import { redirect } from 'next/navigation'
import { ROUTES } from '@/constants'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  redirect(ROUTES.settings)
}
