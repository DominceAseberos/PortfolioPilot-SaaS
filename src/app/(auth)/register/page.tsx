import { AuthScreen } from '@/components/auth/AuthScreen'
import { Suspense } from 'react'

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthScreen initialMode="register" />
    </Suspense>
  )
}
