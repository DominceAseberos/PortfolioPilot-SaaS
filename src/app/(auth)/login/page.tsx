import { AuthScreen } from '@/components/auth/AuthScreen'
import { Suspense } from 'react'

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthScreen initialMode="login" />
    </Suspense>
  )
}
