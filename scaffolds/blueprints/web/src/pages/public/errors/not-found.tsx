/**
 * Resources
 */
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * Dependencies
 */
import { useIsSessionActive } from '@/hooks/auth/session'

/**
 * Components
 */
import { Button } from '@/components/ui/shadcn/button'

/**
 * Icons
 */
import { DoorOpen } from 'lucide-react'

/**
 * React declaration
 */
export const NotFound = () => {
  const { isSessionActive } = useIsSessionActive()
  const { t: tPageErrors } = useTranslation('page-errors')
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center justify-center gap-8 md:flex-row">
          <div className="flex-1 text-center md:text-left">
            <h1 className="mb-4 text-8xl font-bold text-gray-900">404</h1>
            <h2 className="mb-6 text-3xl font-semibold text-gray-700">{tPageErrors('404-not-found.title')}</h2>
            <p className="mb-8 text-lg text-gray-600">{tPageErrors('404-not-found.description')}</p>
            <Button asChild>
              <Link to={isSessionActive ? '/dashboard' : '/signin'}>
                <DoorOpen className="mr-2 h-4 w-4" />
                {tPageErrors('404-not-found.button')}
              </Link>
            </Button>
          </div>

          <div className="flex-1">
            <img src="/animations/404-not-found.webp" alt="404 Animation" className="mx-auto w-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}
