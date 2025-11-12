'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  // Ensure theme is applied on mount, especially for MetaMask browser
  React.useEffect(() => {
    setMounted(true)
    
    // Force dark mode if it's the default and not set
    if (props.defaultTheme === 'dark') {
      const root = document.documentElement
      const currentTheme = root.classList.contains('dark') ? 'dark' : 'light'
      
      // If dark mode isn't applied, force it
      if (currentTheme !== 'dark') {
        root.classList.add('dark')
      }
    }
  }, [])

  // Render with dark class immediately to prevent flash
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
