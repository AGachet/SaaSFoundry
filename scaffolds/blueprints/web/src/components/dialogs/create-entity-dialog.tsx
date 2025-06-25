/**
 * Ressources
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

/**
 * Dependencies
 */
import { useEntityCreate, useEntityCreateSchema } from '@/hooks/api/entities/mutations/useEntityCreate'
import { useModuleAccess } from '@/hooks/auth/useModuleAccess'

/**
 * Components
 */
import { Button } from '@/components/ui/shadcn/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/shadcn/form'
import { Input } from '@/components/ui/shadcn/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select'
import { Textarea } from '@/components/ui/shadcn/textarea'

/**
 * Types
 */
import type { MeResponseDto } from '@/hooks/api/auth'

type CreateEntityDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateEntityDialog({ isOpen, onOpenChange }: CreateEntityDialogProps) {
  const queryClient = useQueryClient()
  const { t: tAccount } = useTranslation('account')
  const { t: tCommon } = useTranslation('common')
  const { hasPermission } = useModuleAccess()

  // Get accountId from authMe
  const authMe = queryClient.getQueryData<MeResponseDto>(['authMe'])!
  const activeAccount = authMe.accounts.find((acc) => acc.isActive)
  const accountId = activeAccount?.id

  // Create entity mutation
  const createEntity = useEntityCreate()

  const { payload: formSchema } = useEntityCreateSchema()
  type FormValues = z.infer<typeof formSchema>

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: accountId,
      name: '',
      description: '',
      organization: {
        name: '',
        type: 'COMPANY',
        description: '',
        website: ''
      }
    }
  })

  const handleSubmit = async (data: FormValues) => {
    try {
      await createEntity.submitAsync({
        ...data
      })

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['account', accountId, 'entities'] })
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create entity:', error)
    }
  }

  // Reset form when dialog is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{tAccount('entities.tk_create-entity_')}</DialogTitle>
          <DialogDescription>{tAccount('entities.tk_create-entity-description_')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {hasPermission('ENTITY_CREATION') && (
              <div data-testid="entity-details" className="space-y-4 rounded-md border p-4">
                <h3 className="text-sm font-medium">{tAccount('entities.tk_entity-details_')}</h3>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tCommon('other.tk_name_')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tCommon('other.tk_description_')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {hasPermission('ORGANIZATION_CREATION') && (
              <div data-testid="organization-details" className="space-y-4 rounded-md border p-4">
                <h3 className="text-sm font-medium">{tAccount('organizations.tk_organization-details_')}</h3>
                <FormField
                  control={form.control}
                  name="organization.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tCommon('other.tk_name_')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="organization.type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tCommon('other.tk_type_')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={tCommon('other.tk_type_')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {['COMPANY', 'ASSOCIATION', 'COMMUNITY'].map((type) => (
                            <SelectItem
                              key={type}
                              value={type}
                              className="cursor-pointer transition-colors hover:bg-muted data-[state=checked]:bg-primary/10 data-[state=checked]:font-semibold data-[state=checked]:text-primary"
                            >
                              {tAccount(`organizations.tk_type-${type.toLowerCase()}_`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="organization.description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tCommon('other.tk_description_')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="organization.website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tCommon('other.tk_website_')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={createEntity.isLoading}>
                <Building2 className="h-4 w-4" />
                {createEntity.isLoading ? tCommon('actions.tk_loading_') : tCommon('actions.tk_create_')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
