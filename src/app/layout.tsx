import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ToasterProvider } from '@/components/common/ToasterProvider'
import { GuestSessionProvider } from '@/components/providers/GuestSessionProvider'
import { SmoothScrolling } from '@/components/common/SmoothScrolling'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'PortfolioPilot - Recruiter-Style Portfolio Feedback',
  description:
    'Get recruiter-style feedback on your portfolio, GitHub profile, and resume before applying for jobs.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SmoothScrolling>
          <GuestSessionProvider>
            {children}
          </GuestSessionProvider>
          <ToasterProvider />
        </SmoothScrolling>
      </body>
    </html>
  )
}
