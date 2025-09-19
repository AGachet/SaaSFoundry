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
import { useIsSessionActive } from '@/hooks/auth/useIsSession'
import { useModuleAccess } from '@/hooks/auth/useModuleAccess'
import { extractTokenFromUrl } from '@/utils/tokenExtractor'

/**
 * Components
 */
import { Logo } from '@/components/ui/custom/logo'
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert'
import { Button } from '@/components/ui/shadcn/button'
import { Card } from '@/components/ui/shadcn/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/shadcn/form'
import { Input } from '@/components/ui/shadcn/input'
import { Separator } from '@/components/ui/shadcn/separator'

/**
 * Icons
 */
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

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
  const [showPassword, setShowPassword] = useState(false)

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
      password: '',
      firstname: '',
      lastname: ''
    }
  })

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // Decode the token to extract information if necessary
  if (confirmAccountToken) {
    try {
      // Try to decode the token if possible to extract information
      // Note: this implementation is simplified and depends on the actual token structure
      // It may be necessary to use a library like jwt-decode
      // or call an API to get the token information
      const tokenParts = confirmAccountToken.split('.')
      if (tokenParts.length === 3) {
        const tokenPayload = JSON.parse(atob(tokenParts[1]))
        const extractedData = {
          firstname: tokenPayload.firstname,
          lastname: tokenPayload.lastname,
          email: tokenPayload.email
        }

        // Update form values with the extracted data
        if (extractedData.email) {
          form.setValue('email', extractedData.email)
        }
        if (extractedData.firstname) {
          form.setValue('firstname', extractedData.firstname)
        }
        if (extractedData.lastname) {
          form.setValue('lastname', extractedData.lastname)
        }
      }
    } catch (error) {
      console.error('Erreur lors du décodage du token', error)
    }
  }

  const hasPasswordModuleAccess = hasModuleAccess('USER_ACCOUNT_PASSWORD_RECOVERY');

  // Redirect on successful login
  useEffect(() => {
    if (signInMutation.isSuccess || isSessionActive) navigate('/dashboard')
  }, [isSessionActive, signInMutation.isSuccess, navigate])

  const onSubmit = (values: SignInPayloadDto) => {
    setAuthError(null)

    // Prepare payload
    const payload: SignInPayloadDto = {
      email: values.email,
      password: values.password
    }

    // Only add confirmAccountToken and user info if token exists
    if (confirmAccountToken) {
      payload.confirmAccountToken = confirmAccountToken

      // If it's the first login with the token, add the profile information
      if (values.firstname && values.lastname) {
        payload.firstname = values.firstname
        payload.lastname = values.lastname
      }
    }

    // Use React Query mutation
    signInMutation.submit(payload, {
      onError: () => {
        setAuthError(tAuth('signin.tk_authError_'))
      }
    })
  }
  const formProps = { form, hasPasswordModuleAccess, showPassword, togglePasswordVisibility, tAuth }

  return (
    <div className="flex h-screen flex-col items-center bg-gray-50">
      <Logo isLong className="max-w-xs px-4 py-20" />
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

            {confirmAccountToken && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name='firstname'
                  label={tCommon('user.tk_firstName_')}
                  placeholder={tCommon('user.tk_firstNamePlaceholder_')}
                  tabIndex={1}
                  props={formProps}
                />
                <FormField
                  name='lastname'
                  label={tCommon('user.tk_lastName_')}
                  placeholder={tCommon('user.tk_lastNamePlaceholder_')}
                  tabIndex={2}
                  props={formProps}
                />
              </div>
            )}

            <FormField
              name='email'
              label={tCommon('user.tk_email_')}
              placeholder={tCommon('user.tk_emailPlaceholder_')}
              type='email'
              autoComplete='email'
              tabIndex={confirmAccountToken ? 3 : 1}
              props={formProps}
            />

            <FormField
              name="password"
              label={tAuth('fields.tk_password_')}
              type="password"
              autoComplete="current-password"
              tabIndex={confirmAccountToken ? 4 : 2}
              props={formProps}
            />

            <Button type="submit" className="w-full" disabled={signInMutation.isLoading} tabIndex={confirmAccountToken ? 5 : 3}>
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

// Reusable form field
const FormField = ({
  name,
  label,
  props,
  placeholder = '',
  type = 'text',
  autoComplete = '',
  tabIndex
}: {
  name: keyof SignInPayloadDto
  label: string
  props: {
    form: ReturnType<typeof useForm<SignInPayloadDto>>
    hasPasswordModuleAccess: boolean
    showPassword: boolean
    togglePasswordVisibility: () => void
    tAuth: (key: string) => string
  }
  placeholder?: string
  type?: string
  autoComplete?: string
  tabIndex?: number
}) => {
  const { form, hasPasswordModuleAccess, showPassword, togglePasswordVisibility, tAuth } = props
  const inputId = `input-${name}`

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {name === 'password' ? (
            <div className="flex items-center justify-between">
              <FormLabel htmlFor={inputId}>{label}</FormLabel>
              {hasPasswordModuleAccess && (
                <Link to="/reset-password-request" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  {tAuth('callToAction.tk_forgotPassword_')}
                </Link>
              )}
            </div>
          ) : (
            <FormLabel htmlFor={inputId}>{label}</FormLabel>
          )}
          <FormControl>
            {name === 'password' ? (
              <div className="relative">
                <Input id={inputId} placeholder={placeholder} type={showPassword ? 'text' : 'password'} autoComplete={autoComplete} tabIndex={tabIndex} {...field} />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                  onClick={togglePasswordVisibility}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <Input id={inputId} placeholder={placeholder} type={type} autoComplete={autoComplete} tabIndex={tabIndex} {...field} />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
