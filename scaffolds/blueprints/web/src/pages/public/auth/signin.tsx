/**
 * Resources
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

/**
 * Dependencies
 */
import { useIsSessionActive } from '@/hooks/auth/session'
import { useModuleAccess } from '@/hooks/auth/useModuleAccess'
import { extractTokenFromUrl } from '@/utils/tokenExtractor'

/**
 * Components
 */
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert'
import { Button } from '@/components/ui/shadcn/button'
import { Card } from '@/components/ui/shadcn/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/shadcn/form'
import { Input } from '@/components/ui/shadcn/input'
import { Separator } from '@/components/ui/shadcn/separator'

/**
 * Icons
 */
import { AlertCircle } from 'lucide-react'

/**
 * API
 */
import { useSignIn, useSignInSchema, type SignInPayloadDto } from '@/hooks/api/auth'

/**
 * React declaration
 */
export function SignIn() {
  const navigate = useNavigate()
  const { t: tAuth } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')
  const [authError, setAuthError] = useState<string | null>(null)
  const [confirmAccountToken] = useState(() => extractTokenFromUrl('confirmAccountToken'))

  // React Query mutation
  const signInMutation = useSignIn()
  const { isSessionActive } = useIsSessionActive()
  const { hasModuleAccess } = useModuleAccess()

  // Create form with schema
  const schemas = useSignInSchema()
  const form = useForm<SignInPayloadDto>({
    resolver: zodResolver(schemas.payload),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  // Redirect on successful login
  useEffect(() => {
    if (signInMutation.isSuccess || isSessionActive) navigate('/dashboard')
  }, [isSessionActive, signInMutation.isSuccess, navigate])

  const onSubmit = (values: SignInPayloadDto) => {
    setAuthError(null)

    // Use React Query mutation
    signInMutation.submit(
      {
        ...values,
        confirmAccountToken: confirmAccountToken || undefined
      },
      {
        onError: () => {
          setAuthError(tAuth('signin.tk_authError_'))
        }
      }
    )
  }

  // Reusable form field
  const renderFormField = ({
    name,
    label,
    placeholder = '',
    type = 'text',
    autoComplete = '',
    tabIndex
  }: {
    name: keyof SignInPayloadDto
    label: string
    placeholder?: string
    type?: string
    autoComplete?: string
    tabIndex?: number
  }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {name === 'password' ? (
            <div className="flex items-center justify-between">
              <FormLabel>{label}</FormLabel>
              {hasModuleAccess('USER_ACCOUNT_PASSWORD_RECOVERY') && (
                <Link to="/reset-password-request" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  {tAuth('callToAction.tk_forgotPassword_')}
                </Link>
              )}
            </div>
          ) : (
            <FormLabel>{label}</FormLabel>
          )}
          <FormControl>
            <Input placeholder={placeholder} type={type} autoComplete={autoComplete} tabIndex={tabIndex} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">{tAuth('signin.tk_title_')}</h2>
          <p className="mt-2 text-sm text-gray-600">{tAuth('signin.tk_description_')}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
            {(authError || signInMutation.isError) && (
              <Alert className="bg-red-50 text-red-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription>{authError || tAuth('signin.tk_authError_')}</AlertDescription>
                </div>
              </Alert>
            )}

            {renderFormField({
              name: 'email',
              label: tCommon('user.tk_email_'),
              placeholder: tCommon('user.tk_emailPlaceholder_'),
              type: 'email',
              autoComplete: 'email',
              tabIndex: 1
            })}
            {renderFormField({
              name: 'password',
              label: tAuth('fields.tk_password_'),
              type: 'password',
              autoComplete: 'current-password',
              tabIndex: 2
            })}

            <Button type="submit" className="w-full" disabled={signInMutation.isLoading} tabIndex={3}>
              {signInMutation.isLoading ? tCommon('loading.tk_loadingSignin_') : tAuth('callToAction.tk_signin_')}
            </Button>

            {hasModuleAccess('USER_ACCOUNT_CREATION') && (
              <>
                <div className="flex items-center justify-center">
                  <Separator className="w-1/3" />
                  <span className="mx-4 text-sm text-gray-500">{tCommon('other.tk_or_')}</span>
                  <Separator className="w-1/3" />
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {tAuth('signin.tk_noAccount_')}{' '}
                    <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                      {tAuth('callToAction.tk_signup_')}
                    </Link>
                  </p>
                </div>
              </>
            )}
          </form>
        </Form>
      </Card>
    </div>
  )
}
