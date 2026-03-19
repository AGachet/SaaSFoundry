/**
 * Ressources
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, ImagePlus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

/**
 * Dependencies
 */
import { useEntityCreate, useEntityCreateSchema } from '@/hooks/api/entities/mutations/useEntityCreate'
import { useOrganizationLogoUpload } from '@/hooks/api/organizations/mutations/useOrganizationLogoUpload'
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

const STORAGE_ENABLED = import.meta.env.VITE_STORAGE_ENABLED === 'true'

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
  const uploadLogo = useOrganizationLogoUpload()

  // Logo file state
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { payload: formSchema } = useEntityCreateSchema()
  type FormValues = z.infer<typeof formSchema>

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: accountId,
      organization: {
        name: '',
        type: 'COMPANY',
        description: '',
        website: ''
      }
    }
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (data: FormValues) => {
    try {
      const result = await createEntity.submitAsync({
        ...data
      })

      // Entity created — close dialog and reset form immediately to prevent duplicate submissions
      await queryClient.invalidateQueries({ queryKey: ['account', accountId, 'entities'] })
      form.reset()
      handleRemoveLogo()
      onOpenChange(false)

      // Upload logo after dialog is closed (best-effort, non-blocking)
      if (logoFile && result.organization?.id) {
        try {
          await uploadLogo.submitAsync({
            organizationId: result.organization.id,
            file: logoFile
          })
          await queryClient.invalidateQueries({ queryKey: ['account', accountId, 'entities'] })
        } catch (logoError) {
          console.error('Failed to upload logo:', logoError)
        }
      }
    } catch (error) {
      console.error('Failed to create entity:', error)
    }
  }

  // Reset form when dialog is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset()
      handleRemoveLogo()
    }
    onOpenChange(open)
  }

  const isLoading = createEntity.isLoading || uploadLogo.isLoading

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{tAccount('entities.tk_create-entity_')}</DialogTitle>
          <DialogDescription>{tAccount('entities.tk_create-entity-description_')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {hasPermission('ENTITY_CREATION') && hasPermission('ORGANIZATION_CREATION') && (
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
                {STORAGE_ENABLED && (
                  <div>
                    <FormLabel>{tAccount('organizations.tk_logo_')}</FormLabel>
                    <div className="mt-2">
                      {logoPreview ? (
                        <div className="relative inline-block">
                          <img src={logoPreview} alt="Logo preview" className="h-20 w-20 rounded-md border object-cover" />
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-muted-foreground/50"
                        >
                          <ImagePlus className="h-6 w-6 text-muted-foreground/50" />
                        </button>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={handleLogoChange} className="hidden" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                <Building2 className="h-4 w-4" />
                {isLoading ? tCommon('actions.tk_loading_') : tCommon('actions.tk_create_')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
