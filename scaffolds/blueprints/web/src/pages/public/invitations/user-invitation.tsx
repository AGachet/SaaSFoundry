/**
 * Resources
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

/**
 * Dependencies
 */
import { decodeJwtPayload } from '@/hooks/auth/useTokenDecoder'
import { extractTokenFromUrl } from '@/utils/tokenExtractor'

/**
 * Components
 */
import { ThemeToggleButton } from '@/components/theme/theme-toggle-button'
import { PasswordInput } from '@/components/ui/custom/password-input'
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
import { useAcceptUserInvitation, useAcceptUserInvitationSchema, type AcceptUserInvitationPayloadDto } from '@/hooks/api/invitations/mutations/useAcceptUserInvitation'

/**
 * React declaration
 */
export function UserInvitation() {
  const navigate = useNavigate()
  const { t: tAuth } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')
  const [invitationError, setInvitationError] = useState<string | null>(null)
  const [invitationToken] = useState(() => extractTokenFromUrl('invitationToken'))
  const [countdown, setCountdown] = useState(5)

  // Decode token once on mount
  const tokenData = invitationToken ? decodeJwtPayload<{ firstname?: string; lastname?: string }>(invitationToken) : null

  // React Query mutation
  const acceptInvitationMutation = useAcceptUserInvitation()

  // Create form with schema
  const schemas = useAcceptUserInvitationSchema()
  const form = useForm<AcceptUserInvitationPayloadDto>({
    resolver: zodResolver(schemas.payload),
    defaultValues: {
      invitationToken: invitationToken || '',
      password: '',
      firstname: tokenData?.firstname || '',
      lastname: tokenData?.lastname || ''
    }
  })

  // Redirect if no token
  useEffect(() => {
    if (!invitationToken) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            navigate('/signin')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [invitationToken, navigate])

  const onSubmit = (values: AcceptUserInvitationPayloadDto) => {
    setInvitationError(null)

    acceptInvitationMutation.submit(values, {
      onSuccess: () => {
        navigate('/dashboard')
      },
      onError: () => {
        setInvitationError(tAuth('errors.tk_acceptInvitationError_'))
      }
    })
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
    name: keyof AcceptUserInvitationPayloadDto
    label: string
    placeholder?: string
    type?: string
    autoComplete?: string
    tabIndex?: number
  }) => {
    const inputId = `input-${name}`
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor={inputId}>{label}</FormLabel>
            <FormControl>
              {name === 'password' ? (
                <PasswordInput id={inputId} placeholder={placeholder} autoComplete={autoComplete} tabIndex={tabIndex} {...field} />
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

  // Show countdown if no token
  if (!invitationToken) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{tAuth('userInvitation.tk_acceptInvitationError_')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{tAuth('userInvitation.tk_redirecting_', { countdown })}</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted">
      <ThemeToggleButton />
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">{tAuth('userInvitation.tk_title_')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{tAuth('userInvitation.tk_descriptionInvitation_')}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
            {(invitationError || acceptInvitationMutation.isError) && (
              <Alert className="bg-destructive/10 text-destructive">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription>{invitationError || tAuth('errors.tk_acceptInvitationError_')}</AlertDescription>
                </div>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              {renderFormField({
                name: 'firstname',
                placeholder: tCommon('user.tk_firstNamePlaceholder_'),
                label: tCommon('user.tk_firstName_'),
                tabIndex: 1
              })}
              {renderFormField({
                name: 'lastname',
                placeholder: tCommon('user.tk_lastNamePlaceholder_'),
                label: tCommon('user.tk_lastName_'),
                tabIndex: 2
              })}
            </div>

            {renderFormField({
              name: 'password',
              label: tAuth('fields.tk_newPassword_'),
              type: 'password',
              autoComplete: 'new-password',
              tabIndex: 3
            })}

            <Button type="submit" className="w-full" disabled={acceptInvitationMutation.isLoading} tabIndex={4}>
              {acceptInvitationMutation.isLoading ? tCommon('loading.tk_loading_') : tAuth('callToAction.tk_accept_')}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  )
}
