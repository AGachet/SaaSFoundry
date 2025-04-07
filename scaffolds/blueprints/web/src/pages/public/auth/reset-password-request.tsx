/**
 * Resources
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
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
import { CheckCircle } from 'lucide-react'

/**
 * API
 */
import { useRequestPasswordReset, useRequestPasswordResetSchema, type RequestPasswordResetPayloadDto } from '@/hooks/api/auth'

/**
 * React declaration
 */
export function ResetPasswordRequest() {
  const { t: tAuth } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')
  const [userEmail, setUserEmail] = useState('')

  // React Query mutation
  const resetPasswordMutation = useRequestPasswordReset()
  const isSubmitted = resetPasswordMutation.isSuccess

  // Create form with schema
  const schemas = useRequestPasswordResetSchema()
  const form = useForm<RequestPasswordResetPayloadDto>({
    resolver: zodResolver(schemas.payload),
    defaultValues: {
      email: ''
    }
  })

  const onSubmit = (values: RequestPasswordResetPayloadDto) => {
    setUserEmail(values.email)

    // Utiliser la mutation React Query
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
    name: keyof RequestPasswordResetPayloadDto
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

  // Success view
  if (isSubmitted) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-4 flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center text-2xl">{tAuth('resetPasswordRequest.tk_successTitle_')}</CardTitle>
            <CardDescription className="text-center">{tAuth('resetPasswordRequest.tk_successDescription_')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 text-blue-800">
              <AlertDescription>{tAuth('resetPasswordRequest.tk_verifyResetPasswordDescription_', { userEmail })}</AlertDescription>
            </Alert>
            <p className="text-center text-sm text-muted-foreground">{tAuth('resetPasswordRequest.tk_checkSpam_')}</p>
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
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">{tAuth('resetPasswordRequest.tk_title_')}</h2>
          <p className="mt-2 text-sm text-gray-600">{tAuth('resetPasswordRequest.tk_description_')}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
            {resetPasswordMutation.isError && (
              <Alert className="bg-red-50 text-red-800">
                <AlertDescription>{tAuth('resetPasswordRequest.tk_errorMessage_')}</AlertDescription>
              </Alert>
            )}

            {renderFormField({
              name: 'email',
              label: tCommon('user.tk_email_'),
              placeholder: tCommon('user.tk_emailPlaceholder_'),
              type: 'email',
              autoComplete: 'email'
            })}

            <Button type="submit" className="w-full" disabled={resetPasswordMutation.isLoading}>
              {resetPasswordMutation.isLoading ? tCommon('loading.tk_loadingSend_') : tAuth('callToAction.tk_sendResetPasswordLink_')}
            </Button>

            <div className="text-center">
              <Link to="/signin" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                {tAuth('callToAction.tk_backToSignin_')}
              </Link>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  )
}
