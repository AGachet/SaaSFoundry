import { ThemeProvider } from '@/components/theme/theme-provider'
import { QueryProvider } from '@/lib/providers/query-provider'
import { router } from '@/router/routes'
import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'

function App() {
  if (!router) {
    return <div>Loading...</div>
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="sf-theme">
      <QueryProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <RouterProvider router={router} />
        </Suspense>
      </QueryProvider>
    </ThemeProvider>
  )
}

export default App
