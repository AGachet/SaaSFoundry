/**
 * Resources
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

/**
 * Components
 */
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert'
import { Button } from '@/components/ui/shadcn/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/shadcn/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/shadcn/form'
import { Input } from '@/components/ui/shadcn/input'
import { Separator } from '@/components/ui/shadcn/separator'
import { Link } from 'react-router-dom'

/**
 * Icons
 */
import { AlertCircle, CheckCircle } from 'lucide-react'

/**
 * API
 */
import { useSignUp, useSignUpSchema, type SignUpPayloadDto } from '@/hooks/api/auth'

/**
 * React declaration
 */
export function SignUp() {
  const { t: tAuth } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')
  const [authError, setAuthError] = useState<string | null>(null)

  // React Query mutation
  const signUpMutation = useSignUp()
  const isRegistered = signUpMutation.isSuccess

  // Create form with schema
  const schemas = useSignUpSchema()
  const form = useForm<SignUpPayloadDto>({
    resolver: zodResolver(schemas.payload),
    defaultValues: {
      firstname: '',
      lastname: '',
      email: '',
      password: '',
      locale: navigator.language
    }
  })

  const onSubmit = (values: SignUpPayloadDto) => {
    setAuthError(null)

    // Prepare payload
    const payload: SignUpPayloadDto = { ...values }

    // Use React Query mutation
    signUpMutation.submit(payload, {
      onError: () => {
        setAuthError(tAuth('signup.tk_authError_'))
      }
    })
  }

  // Reusable form field
  const renderFormField = ({
    name,
    label,
    placeholder = '',
    type = 'text',
    autoComplete = ''
  }: {
    name: keyof SignUpPayloadDto
    label: string
    placeholder?: string
    type?: string
    autoComplete?: string
  }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} type={type} autoComplete={autoComplete} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  // Registration success view
  if (isRegistered) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-4 flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center text-2xl">{tAuth('signup.tk_successTitle_')}</CardTitle>
            <CardDescription className="text-center">{tAuth('signup.tk_successDescription_')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 text-blue-800">
              <AlertDescription>{tAuth('signup.tk_verifyEmailDescription_', { userEmail: form.getValues('email') })}</AlertDescription>
            </Alert>
            <p className="text-center text-sm text-muted-foreground">{tAuth('signup.tk_checkSpam_')}</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link to="/signin" className="font-medium text-blue-600 hover:text-blue-500">
              {tAuth('callToAction.tk_backToSignin_')}
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">{tAuth('signup.tk_title_')}</h2>
          <p className="mt-2 text-sm text-gray-600">{tAuth('signup.tk_description_')}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
            {authError && (
              <Alert className="bg-red-50 text-red-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription>{authError}</AlertDescription>
                </div>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              {renderFormField({
                name: 'firstname',
                placeholder: tCommon('user.tk_firstNamePlaceholder_'),
                label: tCommon('user.tk_firstName_')
              })}
              {renderFormField({
                name: 'lastname',
                placeholder: tCommon('user.tk_lastNamePlaceholder_'),
                label: tCommon('user.tk_lastName_')
              })}
            </div>

            {renderFormField({
              name: 'email',
              label: tCommon('user.tk_email_'),
              placeholder: tCommon('user.tk_emailPlaceholder_'),
              type: 'email',
              autoComplete: 'email'
            })}

            {renderFormField({
              name: 'password',
              label: tAuth('fields.tk_password_'),
              type: 'password',
              autoComplete: 'new-password'
            })}

            <Button type="submit" className="w-full" disabled={signUpMutation.isLoading}>
              {signUpMutation.isLoading ? tCommon('loading.tk_loadingCreate_') : tAuth('callToAction.tk_signup_')}
            </Button>

            <div className="flex items-center justify-center">
              <Separator className="w-1/3" />
              <span className="mx-4 text-sm text-gray-500">{tCommon('other.tk_or_')}</span>
              <Separator className="w-1/3" />
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                {tAuth('signup.tk_alreadyAccount_')}{' '}
                <Link to="/signin" className="font-medium text-blue-600 hover:text-blue-500">
                  {tAuth('callToAction.tk_signin_')}
                </Link>
              </p>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
