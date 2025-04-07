/**
 * Resource
 */
import { extractTokenFromUrl } from '@/utils/tokenExtractor'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * Components
 */
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert'
import { Button } from '@/components/ui/shadcn/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/shadcn/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/shadcn/form'
import { Input } from '@/components/ui/shadcn/input'

/**
 * Icons
 */
import { AlertCircle, CheckCircle } from 'lucide-react'

/**
 * API
 */
import { useResetPassword, useResetPasswordSchema, type ResetPasswordPayloadDto } from '@/hooks/api/auth'

/**
 * React declaration
 */
export function ResetPassword() {
  const { t: tAuth } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [resetPasswordToken] = useState(() => extractTokenFromUrl('resetPasswordToken'))

  // React Query mutation
  const resetPasswordMutation = useResetPassword()
  const isPasswordReset = resetPasswordMutation.isSuccess

  // Validate token
  useEffect(() => {
    if (!resetPasswordToken) setTokenError(tAuth('resetPassword.tk_missingTokenError_'))
    if (resetPasswordToken && resetPasswordToken.length < 20) setTokenError(tAuth('resetPassword.tk_invalidTokenError_'))
  }, [resetPasswordToken, tAuth])

  // Create form with schema
  const schemas = useResetPasswordSchema()
  const form = useForm<ResetPasswordPayloadDto>({
    resolver: zodResolver(schemas.payload),
    defaultValues: {
      resetPasswordToken: '',
      password: '',
      confirmPassword: ''
    }
  })

  // Update form when token is available
  useEffect(() => {
    if (resetPasswordToken) form.setValue('resetPasswordToken', resetPasswordToken)
  }, [resetPasswordToken, form])

  const onSubmit = (values: ResetPasswordPayloadDto) => {
    resetPasswordMutation.submit(values)
  }

  // Reusable form field component with destructured arguments
  const renderFormField = ({
    name,
    label,
    placeholder = '',
    type = 'text',
    autoComplete = ''
  }: {
    name: keyof ResetPasswordPayloadDto
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

  // Success view after password reset
  if (isPasswordReset) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-4 flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center text-2xl">{tAuth('resetPassword.tk_successTitle_')}</CardTitle>
            <CardDescription className="text-center">{tAuth('resetPassword.tk_successDescription_')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 text-blue-800">
              <AlertDescription>{tAuth('resetPassword.tk_verifyPasswordUpdatedDescription_')}</AlertDescription>
            </Alert>
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
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">{tAuth('resetPassword.tk_title_')}</h2>
          <p className="mt-2 text-sm text-gray-600">{tAuth('resetPassword.tk_description_')}</p>
        </div>

        {tokenError ? (
          <Alert className="mt-6 bg-red-50 text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription>{tokenError}</AlertDescription>
            </div>
            <div className="mt-4 text-center">
              <Link to="/reset-password-request" className="font-medium text-blue-600 hover:text-blue-500">
                {tAuth('callToAction.tk_askForNewLink_')}
              </Link>
            </div>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
              {resetPasswordMutation.isError && (
                <Alert className="bg-red-50 text-red-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <AlertDescription>{tAuth('resetPassword.tk_invalidTokenError_')}</AlertDescription>
                  </div>
                </Alert>
              )}

              {renderFormField({
                name: 'password',
                label: tAuth('fields.tk_newPassword_'),
                type: 'password',
                autoComplete: 'new-password'
              })}

              {renderFormField({
                name: 'confirmPassword',
                label: tAuth('fields.tk_confirmPassword_'),
                type: 'password',
                autoComplete: 'new-password'
              })}

              <Button type="submit" className="w-full" disabled={resetPasswordMutation.isLoading}>
                {resetPasswordMutation.isLoading ? tCommon('loading.tk_loadingUpdate_') : tAuth('callToAction.tk_updatePassword_')}
              </Button>

              <div className="text-center">
                <Link to="/signin" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  {tAuth('callToAction.tk_backToSignin_')}
                </Link>
              </div>
            </form>
          </Form>
        )}
      </Card>
    </div>
  )
}
