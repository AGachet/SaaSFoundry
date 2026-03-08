/**
 * Resources
 */
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * Components
 */
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/shadcn/card'

/**
 * Icons
 */
import { CheckCircle } from 'lucide-react'

type AuthSuccessCardProps = {
  titleKey: string
  descriptionKey: string
  alertMessageKey: string
  alertMessageParams?: Record<string, string>
  extraTextKey?: string
}

export function AuthSuccessCard({ titleKey, descriptionKey, alertMessageKey, alertMessageParams, extraTextKey }: AuthSuccessCardProps) {
  const { t: tAuth } = useTranslation('auth')

  return (
    <div className="flex h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-4 flex justify-center">
            <CheckCircle className="h-16 w-16 text-emerald-500" />
          </div>
          <CardTitle className="text-center text-2xl">{tAuth(titleKey)}</CardTitle>
          <CardDescription className="text-center">{tAuth(descriptionKey)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <AlertDescription>{tAuth(alertMessageKey, alertMessageParams)}</AlertDescription>
          </Alert>
          {extraTextKey && <p className="text-center text-sm text-muted-foreground">{tAuth(extraTextKey)}</p>}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link to="/signin" className="font-medium text-primary hover:text-primary/80">
            {tAuth('callToAction.tk_backToSignin_')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
