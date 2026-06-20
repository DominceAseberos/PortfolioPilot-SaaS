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
import { TermsModal } from '@/components/legal/TermsModal'
import { PrivacyModal } from '@/components/legal/PrivacyModal'

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

  // Modals
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

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
      const errorMsg = err instanceof Error ? err.message : 'Invalid email or password'
      toast.error(errorMsg)
      setLoginError(errorMsg)
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
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong.'
      toast.error(errorMsg)
      setRegisterError(errorMsg)
    } finally {
      setIsRegisterLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await authService.signInWithGoogle(nextPath)
    } catch (err) {
      toast.error('Failed to initialize Google sign in')
    }
  }

  const handleGithubSignIn = async () => {
    try {
      await authService.signInWithGithub(nextPath)
    } catch (err) {
      toast.error('Failed to initialize GitHub sign in')
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
      
      {/* Premium Background Engine */}
      <div className="absolute inset-0 -z-10 bg-slate-50 dark:bg-[#0B0F19] overflow-hidden">
         {/* SVG Grid Lines */}
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]"></div>
         
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-70 mix-blend-multiply dark:mix-blend-screen pointer-events-none transition-transform duration-1000 ease-in-out">
            <div className={cn(
              "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.35)_0%,transparent_50%)] blur-[80px] transition-all duration-1000",
              isLogin ? "translate-x-1/4 scale-110" : "-translate-x-1/4 scale-90"
            )} />
            <div className={cn(
              "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.35)_0%,transparent_50%)] blur-[80px] transition-all duration-1000 delay-100",
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
              <h2 className="text-3xl font-bold text-foreground mb-2">Sign in to PortfolioPilot</h2>
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

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full h-12 bg-transparent border-border hover:bg-muted text-foreground rounded-xl" onClick={handleGoogleSignIn}>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
              </Button>
              <Button variant="outline" className="w-full h-12 bg-transparent border-border hover:bg-muted text-foreground rounded-xl" onClick={handleGithubSignIn}>
                <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </Button>
            </div>
            
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

              <div className="flex items-start gap-2 pt-2 pb-1">
                <div className="flex h-5 items-center">
                  <input
                    id="acceptTerms"
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-purple-600 focus:ring-purple-600 focus:ring-offset-background bg-background"
                    {...registerForm.register('acceptTerms')}
                  />
                </div>
                <div className="text-sm text-muted-foreground leading-tight">
                  <label htmlFor="acceptTerms">
                    I agree to the{' '}
                  </label>
                  <button type="button" onClick={() => setShowTermsModal(true)} className="text-purple-600 dark:text-purple-400 font-medium hover:underline">
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-purple-600 dark:text-purple-400 font-medium hover:underline">
                    Privacy Policy
                  </button>
                  .
                </div>
              </div>
              {registerForm.formState.errors.acceptTerms && (
                <p className="text-sm font-medium text-red-500 mt-[-8px]">
                  {registerForm.formState.errors.acceptTerms.message}
                </p>
              )}

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

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full h-12 bg-transparent border-border hover:bg-muted text-foreground rounded-xl px-0" onClick={handleGoogleSignIn}>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
              </Button>
              <Button variant="outline" className="w-full h-12 bg-transparent border-border hover:bg-muted text-foreground rounded-xl px-0" onClick={handleGithubSignIn}>
                <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </Button>
            </div>
            
            <p className="mt-8 text-center text-sm text-muted-foreground md:hidden">
              Already have an account? <button onClick={handleSwitchMode} className="text-purple-600 dark:text-purple-400 font-bold hover:underline">Sign in</button>
            </p>
          </div>
        </div>

      </div>

      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
    </div>
  )
}
