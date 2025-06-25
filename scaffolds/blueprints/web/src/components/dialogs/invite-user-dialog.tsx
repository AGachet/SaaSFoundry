/**
 * Ressources
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Mail, Search, X } from 'lucide-react'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

/**
 * Dependencies
 */
import { useInviteUser, useInviteUserSchema } from '@/hooks/api/accounts/mutations/useInviteUserCreate'
import { useAccountEntities } from '@/hooks/api/accounts/queries/useAccountEntities'
import { useAccountRoles } from '@/hooks/api/accounts/queries/useAccountRoles'
import { useInvitedUsers } from '@/hooks/api/invitations/queries/useInvitedUsers'
import { useModuleAccess } from '@/hooks/auth/useModuleAccess'

/**
 * Components
 */
import { SelectableList, type SelectableListItem } from '@/components/ui/custom/selectable-list'
import { Button } from '@/components/ui/shadcn/button'
import { Checkbox } from '@/components/ui/shadcn/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/shadcn/form'
import { Input } from '@/components/ui/shadcn/input'
import { ScrollArea } from '@/components/ui/shadcn/scroll-area'
import { Skeleton } from '@/components/ui/shadcn/skeleton'

/**
 * Types
 */
import type { InviteUserPayloadDto } from '@/hooks/api/accounts/mutations/useInviteUserCreate'
import type { MeResponseDto } from '@/hooks/api/auth'

type InviteUserDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteUserDialog({ isOpen, onOpenChange }: InviteUserDialogProps) {
  const { t: tCommon } = useTranslation('common')
  // Create extended schema based on existing API schema
  const baseInviteSchema = useInviteUserSchema()
  const formSchema = baseInviteSchema.payload
    .extend({
      isDirectlyLinked: z.boolean().default(false)
    })
    .refine(
      (data) => {
        // At least one entity or direct link must be selected
        return data.isDirectlyLinked || (data.entityIds && data.entityIds.length > 0)
      },
      {
        message: tCommon('fields.errors.tk_minOneEntityOrDirectLink_'),
        path: ['entityIds']
      }
    )

  type FormValues = z.infer<typeof formSchema>

  const queryClient = useQueryClient()
  const [searchRoles, setSearchRoles] = useState('')
  const [searchEntities, setSearchEntities] = useState('')
  const { t: tAccount } = useTranslation('account')
  const { hasPermission } = useModuleAccess()

  // Get accountId from authMe
  const authMe = queryClient.getQueryData<MeResponseDto>(['authMe'])!
  const activeAccount = authMe.accounts.find((acc) => acc.isActive)
  const accountId = activeAccount?.id

  // Get roles and entities
  const { data: rolesData, isLoading: isLoadingRoles } = useAccountRoles(accountId as string, {
    search: searchRoles,
    limit: 10
  })

  const { data: entitiesData, isLoading: isLoadingEntities } = useAccountEntities(accountId as string, {
    search: searchEntities,
    limit: 10
  })

  // Invite user mutation
  const inviteUser = useInviteUser()

  const { refetch: refreshInvitations } = useInvitedUsers()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      firstname: '',
      lastname: '',
      roleIds: [],
      entityIds: [],
      isDirectlyLinked: false,
      accountIds: []
    }
  })

  // Watch isDirectlyLinked to update accountIds
  const isDirectlyLinked = form.watch('isDirectlyLinked')
  React.useEffect(() => {
    if (isDirectlyLinked && accountId) {
      form.setValue('accountIds', [accountId])
    } else {
      form.setValue('accountIds', [])
    }
  }, [isDirectlyLinked, accountId, form])

  const handleSubmit = async (data: FormValues) => {
    const finalPayload: InviteUserPayloadDto = {
      email: data.email,
      firstname: data.firstname,
      lastname: data.lastname,
      roleIds: data.roleIds,
      entityIds: data.entityIds,
      accountIds: data.accountIds
    }

    try {
      await inviteUser.submitAsync(finalPayload)
      refreshInvitations()
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to invite user:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{tAccount('users.tk_invite-new-user_')}</DialogTitle>
          <DialogDescription>{tAccount('users.tk_invite-description_')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tCommon('user.tk_email_')}</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="firstname"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>{tCommon('user.tk_firstName_')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastname"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>{tCommon('user.tk_lastName_')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {hasPermission('USER_ACCOUNTS_INVITATION') && (
              <FormField
                control={form.control}
                name="isDirectlyLinked"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className={`cursor-pointer hover:text-primary ${field.value ? 'text-primary' : ''}`}>{tAccount('users.tk_direct-account-link_')}</FormLabel>
                      <p className="text-sm text-muted-foreground">{tAccount('users.tk_direct-account-link-description_')}</p>
                    </div>
                  </FormItem>
                )}
              />
            )}
            {hasPermission('USER_ROLE_ALLOCATION') && (
              <FormField
                control={form.control}
                name="roleIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tCommon('items.tk_roles_')}</FormLabel>
                    <FormControl>
                      <div className="space-y-2" data-testid="roles-filter">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input placeholder={tCommon('filters.tk_search-placeholder_')} value={searchRoles} onChange={(e) => setSearchRoles(e.target.value)} className="pl-9" />
                          {searchRoles && (
                            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2" onClick={() => setSearchRoles('')}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="rounded-md border">
                          <ScrollArea className="h-[200px]">
                            {isLoadingRoles ? (
                              <div className="flex flex-col gap-2 p-2 opacity-25">
                                <Skeleton className="skeleton-shimmer-orange h-6 w-full rounded" />
                                <Skeleton className="skeleton-shimmer-orange h-6 w-3/4 rounded" />
                                <Skeleton className="skeleton-shimmer-orange h-6 w-2/3 rounded" />
                              </div>
                            ) : rolesData?.items.length === 0 ? (
                              <div className="flex h-[200px] items-center justify-center text-muted-foreground">{tAccount('roles.tk_table-no-roles_')}</div>
                            ) : (
                              <SelectableList
                                items={
                                  rolesData?.items
                                    .filter((role) => role.name.toLowerCase() !== 'guest')
                                    .map(
                                      (role): SelectableListItem => ({
                                        id: role.id,
                                        title: role.name,
                                        description: role.description || undefined
                                      })
                                    ) || []
                                }
                                selectedIds={field.value || []}
                                onSelectionChange={(newRoleIds) => field.onChange(newRoleIds)}
                                ariaLabel="Select roles"
                              />
                            )}
                          </ScrollArea>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {hasPermission('USER_ENTITIES_INVITATION') && (
              <FormField
                control={form.control}
                name="entityIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tCommon('items.tk_entities_')}</FormLabel>
                    <FormControl>
                      <div className="space-y-2" data-testid="entities-filter">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input placeholder={tCommon('filters.tk_search-placeholder_')} value={searchEntities} onChange={(e) => setSearchEntities(e.target.value)} className="pl-9" />
                          {searchEntities && (
                            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2" onClick={() => setSearchEntities('')}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="rounded-md border">
                          <ScrollArea className="h-[200px]">
                            {isLoadingEntities ? (
                              <div className="flex flex-col gap-2 p-2 opacity-25">
                                <Skeleton className="skeleton-shimmer-orange h-6 w-full rounded" />
                                <Skeleton className="skeleton-shimmer-orange h-6 w-3/4 rounded" />
                                <Skeleton className="skeleton-shimmer-orange h-6 w-2/3 rounded" />
                              </div>
                            ) : entitiesData?.items.length === 0 ? (
                              <div className="flex h-[200px] items-center justify-center text-muted-foreground">{tAccount('entities.tk_table-no-entities_')}</div>
                            ) : (
                              <SelectableList
                                items={
                                  entitiesData?.items.map(
                                    (entity): SelectableListItem => ({
                                      id: entity.id,
                                      title: entity.organization?.name || '',
                                      subtitle: entity.name,
                                      description: entity.description || undefined
                                    })
                                  ) || []
                                }
                                selectedIds={field.value || []}
                                onSelectionChange={(newEntityIds) => field.onChange(newEntityIds)}
                                ariaLabel="Select entities"
                              />
                            )}
                          </ScrollArea>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="submit" disabled={inviteUser.isLoading}>
                <Mail />
                {inviteUser.isLoading ? tCommon('actions.tk_loading_') : tAccount('users.tk_invite-new-user_')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
