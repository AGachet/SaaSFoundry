/**
 * Resources
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

/**
 * Components
 */
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert'
import { Button } from '@/components/ui/shadcn/button'
import { Card } from '@/components/ui/shadcn/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/shadcn/form'
import { Input } from '@/components/ui/shadcn/input'

/**
 * Icons
 */
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

/**
 * API
 */
import { useAcceptUserInvitation, useAcceptUserInvitationSchema, type AcceptUserInvitationPayloadDto } from '@/hooks/api/invitations/mutations/useAcceptUserInvitation'
import { extractTokenFromUrl } from '@/utils/tokenExtractor'

/**
 * React declaration
 */
export function UserInvitation() {
  const navigate = useNavigate()
  const { t: tAuth } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')
  const [invitationError, setInvitationError] = useState<string | null>(null)
  const [invitationToken] = useState(() => extractTokenFromUrl('invitationToken'))
  const [showPassword, setShowPassword] = useState(false)
  const [countdown, setCountdown] = useState(5)

  // React Query mutation
  const acceptInvitationMutation = useAcceptUserInvitation()

  // Create form with schema
  const schemas = useAcceptUserInvitationSchema()
  const form = useForm<AcceptUserInvitationPayloadDto>({
    resolver: zodResolver(schemas.payload),
    defaultValues: {
      invitationToken: invitationToken || '',
      password: '',
      firstname: '',
      lastname: ''
    }
  })

  // Decode token and set form values
  useEffect(() => {
    if (invitationToken) {
      try {
        const tokenParts = invitationToken.split('.')
        if (tokenParts.length === 3) {
          const tokenPayload = JSON.parse(atob(tokenParts[1]))
          if (tokenPayload.firstname) {
            form.setValue('firstname', tokenPayload.firstname)
          }
          if (tokenPayload.lastname) {
            form.setValue('lastname', tokenPayload.lastname)
          }
        }
      } catch (error) {
        console.error('Error decoding token:', error)
      }
    }
  }, [invitationToken, form])

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

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

  // Redirect on successful invitation acceptance
  useEffect(() => {
    if (acceptInvitationMutation.isSuccess) {
      navigate('/dashboard')
    }
  }, [acceptInvitationMutation.isSuccess, navigate])

  const onSubmit = (values: AcceptUserInvitationPayloadDto) => {
    setInvitationError(null)

    acceptInvitationMutation.submit(values, {
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

  // Show countdown if no token
  if (!invitationToken) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">{tAuth('userInvitation.tk_acceptInvitationError_')}</h2>
            <p className="mt-2 text-sm text-gray-600">{tAuth('userInvitation.tk_redirecting_', { countdown })}</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">{tAuth('userInvitation.tk_title_')}</h2>
          <p className="mt-2 text-sm text-gray-600">{tAuth('userInvitation.tk_descriptionInvitation_')}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
            {(invitationError || acceptInvitationMutation.isError) && (
              <Alert className="bg-red-50 text-red-800">
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
