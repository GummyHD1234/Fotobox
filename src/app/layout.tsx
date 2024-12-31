import * as React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './print.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Photo Booth App',
  description: 'A modern photo booth application with camera selection and printing capabilities',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-background">
          {children}
        </main>
      </body>
    </html>
  )
} 