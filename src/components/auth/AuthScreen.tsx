'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@/validations/auth'
import { authService } from '@/features/auth/services/auth.service'
import { ROUTES } from '@/constants'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { AlertCircle, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AuthScreenProps {
  initialMode: 'login' | 'register'
}

export function AuthScreen({ initialMode }: AuthScreenProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const nextPath = searchParams?.get('next') || undefined
  
  const [isLogin, setIsLogin] = useState(initialMode === 'login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Login State
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  
  // Register State
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [isRegisterLoading, setIsRegisterLoading] = useState(false)
  const [registerSuccess, setRegisterSuccess] = useState(false)

  // Sync state if user uses browser back/forward buttons
  useEffect(() => {
    setIsLogin(pathname === '/login')
  }, [pathname])

  const handleSwitchMode = () => {
    const newMode = !isLogin
    setIsLogin(newMode)
    const newUrl = (newMode ? ROUTES.login : ROUTES.register) + (nextPath ? `?next=${nextPath}` : '')
    window.history.pushState(null, '', newUrl)
  }

  // --- Forms Setup ---
  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  // --- Submit Handlers ---
  const onLoginSubmit = async (data: LoginInput) => {
    setIsLoginLoading(true)
    setLoginError(null)
    try {
      await authService.signIn(data.email, data.password)
      try { await fetch('/api/auth/merge', { method: 'POST' }) } catch (e) {}
      toast.success('Signed in successfully')
      router.push(nextPath || ROUTES.dashboard)
      router.refresh()
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Invalid email or password')
    } finally {
      setIsLoginLoading(false)
    }
  }

  const onRegisterSubmit = async (data: RegisterInput) => {
    setIsRegisterLoading(true)
    setRegisterError(null)
    try {
      const result = await authService.signUp(data.email, data.password, data.fullName)
      if (result?.user) {
        try { await fetch('/api/auth/merge', { method: 'POST' }) } catch (e) {}
        toast.success('Account created successfully')
        router.push(nextPath || ROUTES.dashboard)
      } else {
        toast.success('Account created! Check your email to confirm.')
        setRegisterSuccess(true)
      }
    } catch (err: unknown) {
      setRegisterError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsRegisterLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await authService.signInWithGoogle(nextPath)
    } catch {
      toast.error('Google sign in failed')
    }
  }

  if (registerSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
        <Link href="/" className="absolute left-4 top-4 md:left-8 md:top-8 flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-emerald-500/10 p-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-muted-foreground">
              We've sent a confirmation link to your email. Click the link to activate your account.
            </p>
          </div>
          <button onClick={() => { setRegisterSuccess(false); setIsLogin(true); window.history.pushState(null, '', ROUTES.login) }} className="inline-block text-sm text-primary hover:underline font-medium">
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background flex items-center justify-center text-foreground">
      
      {/* Background Mesh (Global) */}
      <div className="absolute inset-0 -z-10 bg-background overflow-hidden">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-40 mix-blend-screen pointer-events-none transition-transform duration-1000 ease-in-out">
            <div className={cn(
              "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.3)_0%,transparent_50%)] blur-[80px] transition-all duration-1000",
              isLogin ? "translate-x-1/4 scale-110" : "-translate-x-1/4 scale-90"
            )} />
            <div className={cn(
              "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.3)_0%,transparent_50%)] blur-[80px] transition-all duration-1000 delay-100",
              isLogin ? "-translate-x-1/4 translate-y-1/4 scale-90" : "translate-x-1/4 -translate-y-1/4 scale-110"
            )} />
         </div>
      </div>

      <Link href="/" className="absolute left-6 top-6 z-50 flex items-center text-sm font-medium text-foreground/60 hover:text-foreground transition-colors bg-background/20 backdrop-blur-md px-4 py-2 rounded-full border border-border/50 hover:bg-background/40">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Home
      </Link>

      {/* Main Container */}
      <div className="relative w-full max-w-[1200px] h-[750px] max-h-[90vh] bg-background/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-3xl border border-border/50 shadow-[0_0_80px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row mx-4">
        
        {/* SLIDING OVERLAY PANEL */}
        <div className={cn(
          "hidden md:flex absolute top-0 w-1/2 h-full bg-gradient-to-br from-blue-600 to-purple-600 z-20 items-center justify-center flex-col text-white transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl",
          isLogin ? "translate-x-full rounded-l-[40px]" : "translate-x-0 rounded-r-[40px]"
        )}>
          {/* Overlay Content: Register (Shows when on Login side) */}
          <div className={cn(
            "absolute inset-0 flex flex-col items-center justify-center p-16 text-center transition-all duration-700 delay-100",
            isLogin ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 -translate-x-20 pointer-events-none"
          )}>
            <div className="relative w-64 h-64 mb-8">
              {/* Subtle pulsing glow behind the image */}
              <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full mix-blend-overlay animate-pulse" />
              <img 
                src="/auth-hero.png" 
                alt="PortfolioPilot Dashboard Graphic" 
                className="relative z-10 w-full h-full object-contain animate-float"
              />
            </div>
            <h2 className="text-4xl font-extrabold mb-4 tracking-tight drop-shadow-sm">New Here?</h2>
            <p className="text-lg text-white/80 mb-10 leading-relaxed font-medium">
              Join thousands of candidates optimizing their portfolios with our AI orchestrator.
            </p>
            <Button onClick={handleSwitchMode} variant="outline" size="lg" className="rounded-full px-12 border-2 border-white/40 text-white bg-transparent hover:bg-white hover:text-blue-600 font-bold transition-all duration-300">
              Create Account
            </Button>
          </div>

          {/* Overlay Content: Login (Shows when on Register side) */}
          <div className={cn(
            "absolute inset-0 flex flex-col items-center justify-center p-16 text-center transition-all duration-700 delay-100",
            !isLogin ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 translate-x-20 pointer-events-none"
          )}>
            <div className="relative w-64 h-64 mb-8">
              {/* Subtle pulsing glow behind the image */}
              <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full mix-blend-overlay animate-[pulse_4s_ease-in-out_infinite]" />
              <img 
                src="/auth-hero.png" 
                alt="PortfolioPilot Dashboard Graphic" 
                className="relative z-10 w-full h-full object-contain animate-float"
              />
            </div>
            <h2 className="text-4xl font-extrabold mb-4 tracking-tight drop-shadow-sm">Welcome Back</h2>
            <p className="text-lg text-white/80 mb-10 leading-relaxed font-medium">
              To keep connected with us please login with your personal info.
            </p>
            <Button onClick={handleSwitchMode} variant="outline" size="lg" className="rounded-full px-12 border-2 border-white/40 text-white bg-transparent hover:bg-white hover:text-purple-600 font-bold transition-all duration-300">
              Sign In
            </Button>
          </div>
        </div>

        {/* LOGIN FORM PANEL */}
        <div className={cn(
          "absolute top-0 left-0 w-full md:w-1/2 h-full p-8 sm:p-16 flex flex-col justify-center transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] z-10",
          isLogin ? "opacity-100 pointer-events-auto md:translate-x-0 scale-100" : "opacity-0 pointer-events-none md:-translate-x-12 md:scale-95"
        )}>
          <div className="w-full max-w-sm mx-auto">
            <div className="text-center md:text-left mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Sign in to Pilot</h2>
              <p className="text-muted-foreground">Welcome back! Please enter your details.</p>
            </div>

            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={loginForm.formState.errors.email?.message}
                {...loginForm.register('email')}
              />
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={loginForm.formState.errors.password?.message}
                rightElement={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...loginForm.register('password')}
              />

              <div className="flex justify-between items-center pb-2">
                <Link href={ROUTES.forgotPassword} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors">
                  Forgot password?
                </Link>
              </div>

              {loginError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] transition-all" isLoading={isLoginLoading}>
                Sign In
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground font-medium tracking-wider">Or continue with</span></div>
            </div>

            <Button variant="outline" className="w-full h-12 bg-transparent border-border hover:bg-muted text-foreground rounded-xl" onClick={handleGoogleSignIn}>
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </Button>
            
            <p className="mt-8 text-center text-sm text-muted-foreground md:hidden">
              Don't have an account? <button onClick={handleSwitchMode} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Sign up</button>
            </p>
          </div>
        </div>

        {/* REGISTER FORM PANEL */}
        <div className={cn(
          "absolute top-0 right-0 w-full md:w-1/2 h-full p-8 sm:p-16 flex flex-col justify-center transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] z-10",
          !isLogin ? "opacity-100 pointer-events-auto md:translate-x-0 scale-100" : "opacity-0 pointer-events-none md:translate-x-12 md:scale-95"
        )}>
          <div className="w-full max-w-sm mx-auto">
            <div className="text-center md:text-left mb-6">
              <h2 className="text-3xl font-bold text-foreground mb-2">Create Account</h2>
              <p className="text-muted-foreground">Join PortfolioPilot today.</p>
            </div>

            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3">
              <Input
                label="Full Name"
                placeholder="John Doe"
                error={registerForm.formState.errors.fullName?.message}
                {...registerForm.register('fullName')}
              />
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={registerForm.formState.errors.email?.message}
                {...registerForm.register('email')}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  error={registerForm.formState.errors.password?.message}
                  {...registerForm.register('password')}
                />
                <Input
                  label="Confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  error={registerForm.formState.errors.confirmPassword?.message}
                  {...registerForm.register('confirmPassword')}
                />
              </div>

              {registerError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400 mt-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{registerError}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-12 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-[0_0_20px_-5px_rgba(147,51,234,0.4)] transition-all mt-4" isLoading={isRegisterLoading}>
                Sign Up
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground font-medium tracking-wider">Or</span></div>
            </div>

            <Button variant="outline" className="w-full h-12 bg-transparent border-border hover:bg-muted text-foreground rounded-xl" onClick={handleGoogleSignIn}>
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign up with Google
            </Button>
            
            <p className="mt-8 text-center text-sm text-muted-foreground md:hidden">
              Already have an account? <button onClick={handleSwitchMode} className="text-purple-600 dark:text-purple-400 font-bold hover:underline">Sign in</button>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
