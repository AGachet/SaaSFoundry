/**
 * Resources
 */
import { extractTokenFromUrl } from '@/utils/tokenExtractor'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * Components
 */
import { ThemeToggleButton } from '@/components/theme/theme-toggle-button'
import { Logo } from '@/components/ui/custom/logo'
import { AuthSuccessCard } from '@/components/ui/custom/auth-success-card'
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert'
import { Button } from '@/components/ui/shadcn/button'
import { Card } from '@/components/ui/shadcn/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/shadcn/form'
import { Input } from '@/components/ui/shadcn/input'

/**
 * Icons
 */
import { AlertCircle } from 'lucide-react'

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
  const [resetPasswordToken] = useState(() => extractTokenFromUrl('resetPasswordToken'))

  // React Query mutation
  const resetPasswordMutation = useResetPassword()
  const isPasswordReset = resetPasswordMutation.isSuccess

  // Derive token error from state (no useEffect needed)
  const tokenError = useMemo(() => {
    if (!resetPasswordToken) return tAuth('resetPassword.tk_missingTokenError_')
    if (resetPasswordToken.length < 20) return tAuth('resetPassword.tk_invalidTokenError_')
    return null
  }, [resetPasswordToken, tAuth])

  // Create form with schema — initialize token in defaultValues
  const schemas = useResetPasswordSchema()
  const form = useForm<ResetPasswordPayloadDto>({
    resolver: zodResolver(schemas.payload),
    defaultValues: {
      resetPasswordToken: resetPasswordToken || '',
      password: '',
      confirmPassword: ''
    }
  })

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
      <AuthSuccessCard
        titleKey="resetPassword.tk_successTitle_"
        descriptionKey="resetPassword.tk_successDescription_"
        alertMessageKey="resetPassword.tk_verifyPasswordUpdatedDescription_"
      />
    )
  }

  return (
    <div className="flex h-screen flex-col items-center bg-muted">
      <ThemeToggleButton />
      <Logo isLong className="max-w-xs px-4 py-20" />
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">{tAuth('resetPassword.tk_title_')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{tAuth('resetPassword.tk_description_')}</p>
        </div>

        {tokenError ? (
          <Alert className="mt-6 bg-destructive/10 text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription>{tokenError}</AlertDescription>
            </div>
            <div className="mt-4 text-center">
              <Link to="/reset-password-request" className="font-medium text-primary hover:text-primary/80">
                {tAuth('callToAction.tk_askForNewLink_')}
              </Link>
            </div>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
              {resetPasswordMutation.isError && (
                <Alert className="bg-destructive/10 text-destructive">
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
                <Link to="/signin" className="text-sm font-medium text-primary hover:text-primary/80">
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
