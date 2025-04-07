import { QueryProvider } from '@/lib/providers/query-provider'
import { router } from '@/router/routes'
import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'

function App() {
  if (!router) {
    return <div>Loading...</div>
  }

  return (
    <QueryProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryProvider>
  )
}

export default App
