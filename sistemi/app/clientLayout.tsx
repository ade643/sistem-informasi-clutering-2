"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ErrorBoundary } from "@/components/error-boundary"

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token")
      const loggedIn = localStorage.getItem("isLoggedIn") === "true"
      let valid = loggedIn

      // Cek token format JWT (ada 3 bagian dipisah titik)
      if (!token || token.split('.').length !== 3) {
        valid = false
      } else {
        try {
          // Decode JWT payload
          const base64Url = token.split('.')[1]
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
              })
              .join('')
          )
          const payload = JSON.parse(jsonPayload)

          // Check token expiration (exp is in seconds)
          const currentTime = Math.floor(Date.now() / 1000)
          if (payload.exp && payload.exp < currentTime) {
            valid = false
          }
        } catch (error) {
          valid = false
        }
      }

      setIsLoggedIn(valid)
      setIsLoading(false)

      if (!valid && pathname !== "/login") {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        localStorage.removeItem("isLoggedIn")
        router.push("/login")
      }
    }

    checkAuth()
  }, [pathname, router])

  if (isLoading) {
    return (
      <html lang="id">
        <body className={inter.className}>
          <div className="flex h-screen items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Memuat...</p>
            </div>
          </div>
        </body>
      </html>
    )
  }

  if (pathname === "/login") {
    return (
      <html lang="id">
        <body className={inter.className}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </body>
      </html>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <html lang="id">
      <body className={inter.className}>
        <ErrorBoundary>
          <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-auto p-6">{children}</main>
            </div>
          </div>
        </ErrorBoundary>
      </body>
    </html>
  )
}
