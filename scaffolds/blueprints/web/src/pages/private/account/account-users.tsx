/**
 * Ressources
 */
import { useQueryClient } from '@tanstack/react-query'
import { ArrowUpDown, Building2, Link, MailIcon, ShieldCheck, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Dependencies
 */
import { useInviteUser } from '@/hooks/api/accounts/mutations/useInviteUserCreate'
import { useAccountEntities } from '@/hooks/api/accounts/queries/useAccountEntities'
import { useAccountRoles } from '@/hooks/api/accounts/queries/useAccountRoles'
import { useAccountUsers, UserOrderBy } from '@/hooks/api/accounts/queries/useAccountUsers'
import { useInvitedUsers } from '@/hooks/api/invitations/queries/useInvitedUsers'
import { useModuleAccess } from '@/hooks/auth/useModuleAccess'
import { formatDate, getInitials } from '@/utils/format'

/**
 * Components
 */
import { InviteUserDialog } from '@/components/dialogs/invite-user-dialog'
import { Avatar } from '@/components/ui/custom/avatar'
import { Filter, FilterGroup, FiltersContainer } from '@/components/ui/custom/filters-container'
import { MultiSelectFilter, MultiSelectFilterItem } from '@/components/ui/custom/multiselect-filter'
import { SearchFilter } from '@/components/ui/custom/search-filter'
import { StatusFilter } from '@/components/ui/custom/status-filter'
import { Badge } from '@/components/ui/shadcn/badge'
import { Button } from '@/components/ui/shadcn/button'
import { Card, CardContent, CardFooter } from '@/components/ui/shadcn/card'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/shadcn/pagination'
import { ScrollArea } from '@/components/ui/shadcn/scroll-area'
import { Skeleton } from '@/components/ui/shadcn/skeleton'
import { Switch } from '@/components/ui/shadcn/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/shadcn/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/shadcn/tooltip'

/**
 * Types
 */
import type { AccountUsersResponseDto } from '@/hooks/api/accounts/queries/useAccountUsers'
import type { MeResponseDto } from '@/hooks/api/auth'

/**
 * Constants
 */
const ENTITIES_ICON_BG = 'bg-[#E5D8FF]'
const ENTITIES_ICON_COLOR = 'text-[#A259FF]'
const ROLES_ICON_BG = 'bg-[#FFE6A7]'
const ROLES_ICON_COLOR = 'text-[#B45309]'

/**
 * Entity Filter Component
 */
type EntityFilterProps = {
  selectedEntities: string[]
  onEntitiesChange: (entities: string[]) => void
  tAccount: (key: string) => string
  tCommon: (key: string) => string
  accountId: string
}

function EntityFilter({ selectedEntities, onEntitiesChange, tAccount, tCommon, accountId }: EntityFilterProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data: entitiesData, isLoading } = useAccountEntities(accountId, {
    search: debouncedSearch,
    limit: 10
  })

  const items: MultiSelectFilterItem[] =
    entitiesData?.items.map((entity) => ({
      id: entity.id,
      label: entity.name
    })) || []

  const handleChange = (selected: (string | number)[]) => {
    onEntitiesChange(selected.map(String))
  }

  return (
    <MultiSelectFilter
      dataTestid="entities-filter"
      selected={selectedEntities}
      onChange={handleChange}
      items={items}
      icon={<Building2 className="text-[#A259FF]" />}
      placeholder={tCommon('filters.tk_select-entities_')}
      selectedLabel={tCommon('filters.tk_select-entities_')}
      badgeBg="bg-[#E5D8FF]"
      badgeText="text-[#A259FF]"
      loading={isLoading}
      emptyText={tAccount('entities.tk_table-no-entities_')}
      search={search}
      onSearchChange={setSearch}
    />
  )
}

/**
 * Role Filter Component
 */
type RoleFilterProps = {
  selectedRoles: number[]
  onRolesChange: (roles: number[]) => void
  tAccount: (key: string) => string
  tCommon: (key: string) => string
  accountId: string
}

function RoleFilter({ selectedRoles, onRolesChange, tAccount, tCommon, accountId }: RoleFilterProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data: rolesData, isLoading } = useAccountRoles(accountId, {
    search: debouncedSearch,
    limit: 10
  })

  const items: MultiSelectFilterItem[] =
    rolesData?.items.map((role) => ({
      id: role.id,
      label: role.name
    })) || []

  const handleChange = (selected: (string | number)[]) => {
    onRolesChange(selected.map(Number))
  }

  return (
    <MultiSelectFilter
      dataTestid="roles-filter"
      selected={selectedRoles}
      onChange={handleChange}
      items={items}
      icon={<ShieldCheck className="text-[#B45309]" />}
      placeholder={tCommon('filters.tk_select-roles_')}
      selectedLabel={tCommon('filters.tk_selected-roles_')}
      badgeBg="bg-[#FFE6A7]"
      badgeText="text-[#B45309]"
      loading={isLoading}
      emptyText={tAccount('roles.tk_table-no-roles_')}
      search={search}
      onSearchChange={setSearch}
    />
  )
}

/**
 * Search Filters Component
 */
type SearchFiltersProps = {
  searchTerm: string
  setSearchTerm: (value: string) => void
  activeFilter: boolean | undefined
  setActiveFilter: (value: boolean | undefined) => void
  selectedEntities: string[]
  onEntitiesChange: (entities: string[]) => void
  selectedRoles: number[]
  onRolesChange: (roles: number[]) => void
  includeDirectUsers: boolean
  setIncludeDirectUsers: (value: boolean) => void
  tAccount: (key: string) => string
  tCommon: (key: string) => string
  accountId: string
}

function SearchFilters({
  searchTerm,
  setSearchTerm,
  activeFilter,
  setActiveFilter,
  selectedEntities,
  onEntitiesChange,
  selectedRoles,
  onRolesChange,
  includeDirectUsers,
  setIncludeDirectUsers,
  tAccount,
  tCommon,
  accountId
}: SearchFiltersProps) {
  return (
    <FiltersContainer>
      <FilterGroup>
        <Filter minWidth="400px">
          <SearchFilter value={searchTerm} onChange={setSearchTerm} placeholder={tAccount('users.tk_filters-search-placeholder_')} />
        </Filter>
        <Filter minWidth="200px">
          <StatusFilter value={activeFilter} onChange={setActiveFilter} placeholder={tCommon('filters.tk_status_')} />
        </Filter>
        <Filter minWidth="250px">
          <EntityFilter selectedEntities={selectedEntities} onEntitiesChange={onEntitiesChange} tAccount={tAccount} tCommon={tCommon} accountId={accountId} />
        </Filter>
        <Filter minWidth="250px">
          <RoleFilter selectedRoles={selectedRoles} onRolesChange={onRolesChange} tAccount={tAccount} tCommon={tCommon} accountId={accountId} />
        </Filter>
      </FilterGroup>
      <FilterGroup>
        <div
          data-testid="direct-users-switch-filter"
          className={`flex items-center gap-2 rounded-md border border-transparent px-3 py-2 transition-colors ${
            includeDirectUsers ? 'bg-white ring-1 ring-slate-200' : 'bg-muted-foreground/5 hover:bg-white hover:ring-1 hover:ring-slate-200'
          }`}
        >
          <Switch checked={includeDirectUsers} onCheckedChange={setIncludeDirectUsers} className="data-[state=checked]:bg-primary" />
          <span className="text-sm text-muted-foreground">{tCommon('filters.tk_show-account-users_')}</span>
        </div>
      </FilterGroup>
    </FiltersContainer>
  )
}

/**
 * Users Table Component
 */
type UsersTableProps = {
  users: AccountUsersResponseDto['items']
  isLoading: boolean
  getFullName: (user: AccountUsersResponseDto['items'][0]) => string
  tCommon: (key: string) => string
  tAccount: (key: string) => string
}

function UsersTable({ users, isLoading, getFullName, tCommon, tAccount }: UsersTableProps) {
  if (isLoading) {
    return (
      <TableBody className="opacity-25">
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={index}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="skeleton-shimmer-orange h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="skeleton-shimmer-orange h-4 w-[200px]" />
                  <Skeleton className="skeleton-shimmer-orange h-3 w-[150px]" />
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="skeleton-shimmer-orange h-4 w-[100px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="skeleton-shimmer-orange h-4 w-[150px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="skeleton-shimmer-orange h-4 w-[100px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="skeleton-shimmer-orange h-4 w-[100px]" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    )
  }

  return (
    <TableBody>
      {users.map((user) => (
        <TableRow key={user.id}>
          {/* User Name & Email */}
          <TableCell>
            <div className="flex items-center gap-3">
              <Avatar initials={getInitials(user.people?.firstname, user.people?.lastname)} bgColor="bg-[#D6E6FF]" textColor="text-[#3B82F6]" size="md" />
              <div>
                <div className="flex items-center gap-1 font-medium">
                  {getFullName(user)}
                  {user.isDirectlyLinked && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link className="h-3 w-3 cursor-pointer text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>{tAccount('users.tk_direct-account-link-description_')}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </div>
            </div>
          </TableCell>
          {/* User Status */}
          <TableCell>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span>{user.isActive ? tCommon('status.tk_active_') : tCommon('status.tk_inactive_')}</span>
            </div>
          </TableCell>
          {/* User Entities */}
          <TableCell>
            <div className="flex flex-wrap gap-2">
              {user.entities && user.entities.length > 0 ? (
                user.entities.map((entity) => (
                  <div key={entity.id} className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${ENTITIES_ICON_BG}`}>
                      <Building2 className={`h-4 w-4 ${ENTITIES_ICON_COLOR}`} />
                    </div>
                    <div>
                      <div className="font-medium">{entity.name}</div>
                      {entity.organization && <div className="text-xs text-muted-foreground">{entity.organization.name}</div>}
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </div>
          </TableCell>
          {/* User Roles */}
          <TableCell>
            <div className="flex flex-wrap gap-1">
              {user.roles.map((role) => (
                <Badge key={role.id} variant="outline" className={`${ROLES_ICON_BG} border-none`}>
                  <span className={ROLES_ICON_COLOR}>{role.name}</span>
                </Badge>
              ))}
            </div>
          </TableCell>
          {/* User Created At */}
          <TableCell>
            <div className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  )
}

/**
 * Table Pagination Component
 */
type TablePaginationProps = {
  currentPage: number
  setCurrentPage: (page: number) => void
  totalItems: number
  pageSize: number
}

function TablePagination({ currentPage, setCurrentPage, totalItems, pageSize }: TablePaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize)

  if (totalPages <= 1) return null

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault()
              if (currentPage > 1) setCurrentPage(currentPage - 1)
            }}
            className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault()
                setCurrentPage(page)
              }}
              isActive={currentPage === page}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault()
              if (currentPage < totalPages) setCurrentPage(currentPage + 1)
            }}
            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

/**
 * Invitations Badge Component
 */
function InvitationsBadge() {
  const { t: tCommon } = useTranslation('common')
  const { t: tAccount } = useTranslation('account')
  const { data: invitedUsersData } = useInvitedUsers()
  const { submitAsync: resendInvitation } = useInviteUser()
  const queryClient = useQueryClient()

  const pendingInvitations = invitedUsersData?.invitations.filter((inv) => inv.status === 'SENT' || inv.status === 'EXPIRED') || []

  const handleResendInvitation = async (invitation: (typeof pendingInvitations)[0]) => {
    try {
      await resendInvitation({
        email: invitation.inviteeUserEmail,
        roleIds: invitation.roles.map((role) => role.id),
        accountIds: invitation.accounts.map((account) => account.id),
        entityIds: invitation.entities.map((entity) => entity.id)
      })
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    } catch (error) {
      console.error('Failed to resend invitation:', error)
    }
  }

  if (pendingInvitations.length === 0) return null

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <MailIcon className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {pendingInvitations.length}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="border bg-background p-0 shadow-lg">
          <div className="flex items-center justify-between rounded-t-md border-b bg-background p-3">
            <h4 className="text-base font-semibold text-foreground">{tAccount('users.tk_pending-invitations_')}</h4>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {pendingInvitations.length}
            </Badge>
          </div>
          <ScrollArea className="max-h-80 overflow-y-auto bg-background">
            <div className="divide-y">
              {pendingInvitations.map((invitation) => {
                const displayName = invitation.inviteeUserEmail
                return (
                  <div key={invitation.id} className="flex items-center gap-4 p-4 hover:bg-muted/50">
                    <Badge
                      variant="outline"
                      className={`flex min-w-20 items-center justify-center rounded-sm px-3 py-4 text-xs capitalize ${
                        invitation.status === 'SENT'
                          ? 'border-orange-200 bg-orange-50 text-orange-700'
                          : invitation.status === 'EXPIRED'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-green-200 bg-green-50 text-green-700'
                      }`}
                    >
                      {invitation.status === 'SENT'
                        ? tCommon('status.tk_pending_')
                        : invitation.status === 'EXPIRED'
                          ? tCommon('status.tk_expired_')
                          : tCommon('status.tk_' + invitation.status.toLowerCase() + '_')}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">{displayName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {tCommon('other.tk_sent-at_')}: {formatDate(invitation.invitedAt)}
                      </div>
                    </div>
                    {invitation.status === 'SENT' && (
                      <Button className="h-7 p-3" onClick={() => handleResendInvitation(invitation)}>
                        {tCommon('actions.tk_resend_')}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Main Component
 */
export function AccountUsers() {
  const { t: tAccount } = useTranslation('account')
  const { t: tCommon } = useTranslation('common')
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined)
  const [selectedEntities, setSelectedEntities] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<number[]>([])
  const [orderBy, setOrderBy] = useState<UserOrderBy>(UserOrderBy.CREATED_AT)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [includeDirectUsers, setIncludeDirectUsers] = useState(true)
  const { hasPermission } = useModuleAccess()

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput])

  // Get accountId from authMe
  const authMe = queryClient.getQueryData<MeResponseDto>(['authMe'])!
  const activeAccount = authMe.accounts.find((acc) => acc.isActive)
  const accountId = activeAccount?.id

  // Get users with pagination and filters
  const { data: usersData, isLoading } = useAccountUsers(accountId as string, {
    search: debouncedSearch,
    isActive: activeFilter,
    roleIds: selectedRoles.length > 0 ? selectedRoles : undefined,
    entityIds: selectedEntities.length > 0 ? selectedEntities : undefined,
    orderBy,
    page: currentPage,
    limit: pageSize,
    includeDirectUsers
  })

  // Handle filter changes
  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    setCurrentPage(1)
  }

  const handleActiveFilterChange = (value: boolean | undefined) => {
    setActiveFilter(value)
    setCurrentPage(1)
  }

  const handleEntitiesChange = (entities: string[]) => {
    setSelectedEntities(entities)
    setCurrentPage(1)
  }

  const handleRolesChange = (roles: number[]) => {
    setSelectedRoles(roles)
    setCurrentPage(1)
  }

  const handleOrderByChange = (value: UserOrderBy) => {
    setOrderBy(value)
    setCurrentPage(1)
  }

  const getFullName = (user: AccountUsersResponseDto['items'][0]) => {
    if (user.people) {
      const firstname = user.people.firstname ?? ''
      const lastname = user.people.lastname ?? ''
      const fullName = `${firstname} ${lastname}`.trim()
      return fullName || user.email
    }
    return user.email
  }

  return (
    <div className="space-y-6">
      {/* Filters & new user */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-muted to-white">
        <CardContent className="flex gap-3 p-4">
          <SearchFilters
            searchTerm={searchInput}
            setSearchTerm={handleSearchChange}
            activeFilter={activeFilter}
            setActiveFilter={handleActiveFilterChange}
            selectedEntities={selectedEntities}
            onEntitiesChange={handleEntitiesChange}
            selectedRoles={selectedRoles}
            onRolesChange={handleRolesChange}
            includeDirectUsers={includeDirectUsers}
            setIncludeDirectUsers={setIncludeDirectUsers}
            tAccount={tAccount}
            tCommon={tCommon}
            accountId={accountId as string}
          />
          {(hasPermission('USER_ACCOUNTS_INVITATION') || hasPermission('USER_ENTITIES_INVITATION')) && (
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <UserPlus />
              {tAccount('users.tk_invite-new-user_')}
            </Button>
          )}
          <InvitationsBadge />
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-background to-white shadow-sm">
        <CardContent className="p-0">
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader className="bg-muted/30 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[250px] cursor-pointer" onClick={() => handleOrderByChange(UserOrderBy.NAME)}>
                    <div className="ml-2 flex items-center gap-2">
                      {tCommon('items.tk_users_')}
                      {orderBy === UserOrderBy.NAME && <ArrowUpDown size={14} className="text-primary" />}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="ml-2 flex items-center gap-2">
                      {tCommon('status.tk_title_')}
                      {activeFilter !== undefined && <div className={`h-2 w-2 rounded-full ${activeFilter ? 'bg-green-500' : 'bg-gray-400'}`}></div>}
                    </div>
                  </TableHead>
                  <TableHead>{tCommon('items.tk_entities_')}</TableHead>
                  <TableHead>{tCommon('items.tk_roles_')}</TableHead>
                  <TableHead className="w-[150px] cursor-pointer" onClick={() => handleOrderByChange(UserOrderBy.CREATED_AT)}>
                    <div className="flex items-center gap-2">
                      {tCommon('date.tk_created-at_')}
                      {orderBy === UserOrderBy.CREATED_AT && <ArrowUpDown size={14} className="text-primary" />}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <UsersTable users={usersData?.items || []} isLoading={isLoading} getFullName={getFullName} tCommon={tCommon} tAccount={tAccount} />
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <TablePagination currentPage={currentPage} setCurrentPage={setCurrentPage} totalItems={usersData?.meta.pagination.total || 0} pageSize={pageSize} />
        </CardFooter>
      </Card>

      {(hasPermission('USER_ACCOUNTS_INVITATION') || hasPermission('USER_ENTITIES_INVITATION')) && isInviteDialogOpen && (
        <InviteUserDialog isOpen={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen} />
      )}
    </div>
  )
}
