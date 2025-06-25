/**
 * Resources
 */
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Dependencies
 */
import { useAccount } from '@/hooks/api/accounts'
import { useSignOut } from '@/hooks/api/auth'
import { getInitials } from '@/utils/format'

/**
 * Components
 */
import { Avatar } from '@/components/ui/custom/avatar'
import { RecentList, type RecentListItem } from '@/components/ui/custom/recent-list'
import { Badge } from '@/components/ui/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card'
import { Skeleton } from '@/components/ui/shadcn/skeleton'
import { Building2, Check, Copy, ShieldCheck, Users } from 'lucide-react'

/**
 * Types
 */
import type { AccountResponseDto } from '@/hooks/api/accounts/queries/useAccount'
import type { MeResponseDto } from '@/hooks/api/auth'
type AccountDto = MeResponseDto['accounts'][0]
type UserDto = AccountResponseDto['users']['values'][0]
type EntityDto = AccountResponseDto['entities']['values'][0]
type RoleDto = AccountResponseDto['roles']['values'][0]

/**
 *  Constants for colors and icons
 */
const ICONS = {
  users: <Users size={28} className="text-[#3B82F6]" />,
  entities: <Building2 size={28} className="text-[#A259FF]" />,
  roles: <ShieldCheck size={28} className="text-[#FBBF24]" />
}

const ICON_BG = {
  users: 'bg-[#D6E6FF]',
  entities: 'bg-[#E5D8FF]',
  roles: 'bg-[#FFE6A7]'
}

/**
 * Reusable component for the section header with icon
 */
type SectionHeaderProps = {
  icon?: React.ReactNode
  iconBg?: string
  title: string
  description?: string
  cta?: React.ReactNode
}

function SectionHeader({ icon, iconBg, title, description }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        {icon && <div className={`flex h-12 w-12 items-center justify-center rounded-md ${iconBg}`}>{icon}</div>}
        <div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </div>
    </div>
  )
}

/**
 * Component to copy an ID with visual feedback
 */
function CopyAccountIdButton({ accountId }: { accountId: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(accountId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button onClick={handleCopy} className="ml-1 rounded p-1 transition hover:bg-accent" title="Copier l'ID" type="button">
      {copied ? <Check className="text-green-600" size={16} /> : <Copy size={16} />}
    </button>
  )
}

/**
 * Component to copy an ID with visual feedback
 */
type AccountListProps = {
  accounts: AccountDto[]
  account: AccountResponseDto
  tAccount: (key: string) => string
  tCommon: (key: string) => string
}

function AccountList({ accounts, account, tAccount, tCommon }: AccountListProps) {
  return (
    <div className="flex flex-col gap-4">
      {accounts.map((acc) => (
        <div key={acc.id} className="relative flex min-w-0 flex-col gap-2 rounded-md border border-muted bg-muted/50 p-4">
          {/* Badge Active à droite */}
          {acc.isActive && (
            <div className="absolute right-4 top-4">
              <Badge variant="success">{tCommon('status.tk_active_')}</Badge>
            </div>
          )}

          {/* Account Name */}
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-medium text-muted-foreground">{tAccount('overview.accountInfo.tk_account-name_')}</span>
            <span className="truncate text-lg font-bold">{acc.name}</span>
          </div>

          {/* Account ID + bouton copier */}
          <div className="mt-2 flex flex-col">
            <span className="mb-1 text-xs font-medium text-muted-foreground">{tAccount('overview.accountInfo.tk_account-id_')}</span>
            <div className="flex items-center gap-2">
              <span className="select-all rounded border bg-background px-2 py-1 font-mono text-xs">{acc.id}</span>
              <CopyAccountIdButton accountId={acc.id} />
            </div>
          </div>

          {/* Dates du compte actif (useAccount) */}
          {account && acc.isActive && (
            <div className="mt-2 flex flex-col gap-2 md:flex-row">
              <div className="flex flex-1 flex-col">
                <span className="mb-1 text-xs font-medium text-muted-foreground">{tAccount('overview.accountInfo.tk_account-created-at_')}</span>
                <span className="text-xs">{new Date(account.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex flex-1 flex-col">
                <span className="mb-1 text-xs font-medium text-muted-foreground">{tAccount('overview.accountInfo.tk_account-updated-at_')}</span>
                <span className="text-xs">{new Date(account.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Component for the statistics
 */
type StatisticsCardsProps = {
  account: AccountResponseDto
  tCommon: (key: string) => string
}

function StatisticsCards({ account, tCommon }: StatisticsCardsProps) {
  return (
    <div className="flex h-full w-full gap-2">
      {/* Users */}
      <div aria-label="Users-count" className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-muted bg-muted/50 p-8">
        <Avatar icon={<Users size={24} />} bgColor={ICON_BG.users} textColor="text-[#3B82F6]" size="lg" />
        <span className="text-2xl font-bold">{account.users.count}</span>
        <span className="text-sm text-muted-foreground">{tCommon('items.tk_users_')}</span>
      </div>
      {/* Entities */}
      <div aria-label="Entities-count" className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-muted bg-muted/50 p-8">
        <Avatar icon={<Building2 size={24} />} bgColor={ICON_BG.entities} textColor="text-[#A259FF]" size="lg" />
        <span className="text-2xl font-bold">{account.entities.count}</span>
        <span className="text-sm text-muted-foreground">{tCommon('items.tk_entities_')}</span>
      </div>
      {/* Roles */}
      <div aria-label="Roles-count" className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-muted bg-muted/50 p-8">
        <Avatar icon={<ShieldCheck size={24} />} bgColor={ICON_BG.roles} textColor="text-[#FBBF24]" size="lg" />
        <span className="text-2xl font-bold">{account.roles.count}</span>
        <span className="text-sm text-muted-foreground">{tCommon('items.tk_roles_')}</span>
      </div>
    </div>
  )
}

/**
 * Component for the list of recent users
 */
type RecentUsersProps = {
  users: UserDto[]
  tAccount: (key: string) => string
}

function RecentUsers({ users, tAccount }: RecentUsersProps) {
  const formattedUsers: RecentListItem[] = users.map((user) => ({
    id: user.id,
    name: `${user.people?.firstname ?? ''} ${user.people?.lastname ?? ''}`,
    subtitle: user.email,
    createdAt: user.createdAt,
    initials: getInitials(user.people?.firstname ?? '', user.people?.lastname ?? ''),
    bgColor: 'bg-[#D6E6FF]',
    textColor: 'text-[#3B82F6]'
  }))

  return (
    <RecentList
      items={formattedUsers}
      emptyIcon={<Users className="text-muted-foreground opacity-40" size={18} />}
      emptyText={tAccount('overview.recentUsers.tk_no-users_')}
      linkText={tAccount('overview.recentUsers.tk_view-all-users_')}
      linkTo="/account?tab=users"
    />
  )
}

/**
 * Component for the list of recent entities
 */
type RecentEntitiesProps = {
  entities: EntityDto[]
  tAccount: (key: string) => string
}

function RecentEntities({ entities, tAccount }: RecentEntitiesProps) {
  const formattedEntities: RecentListItem[] = entities.map((entity) => ({
    id: entity.id,
    name: entity.name,
    subtitle: entity.organization?.name,
    createdAt: entity.createdAt,
    initials: getInitials(entity.organization?.name ?? '', ''),
    bgColor: 'bg-[#E5D8FF]',
    textColor: 'text-[#A259FF]'
  }))

  return (
    <RecentList
      items={formattedEntities}
      emptyIcon={<Building2 className="text-muted-foreground opacity-40" size={18} />}
      emptyText={tAccount('overview.recentEntities.tk_no-entity_')}
      linkText={tAccount('overview.recentEntities.tk_view-all-entities_')}
      linkTo="/account?tab=entities"
    />
  )
}

/**
 * Component for the list of roles
 */
type RecentRolesProps = {
  roles: RoleDto[]
  tAccount: (key: string) => string
}

function RecentRoles({ roles, tAccount }: RecentRolesProps) {
  const formattedRoles: RecentListItem[] = roles.map((role) => ({
    id: role.id,
    name: role.name,
    subtitle: role.description,
    createdAt: role.createdAt,
    icon: <ShieldCheck size={18} />,
    bgColor: ICON_BG.roles,
    textColor: 'text-[#FBBF24]'
  }))

  return (
    <RecentList
      items={formattedRoles}
      emptyIcon={<ShieldCheck className="text-muted-foreground opacity-40" size={18} />}
      emptyText={tAccount('overview.recentRoles.tk_no-roles_')}
      showLink={false}
      gridLayout
    />
  )
}

/**
 * Main component - Account Overview
 */
export function AccountOverview() {
  const { t: tAccount } = useTranslation('account')
  const { t: tCommon } = useTranslation('common')
  const queryClient = useQueryClient()
  const { submit: signOut } = useSignOut()

  // Get accountId from authMe
  const authMe = queryClient.getQueryData<MeResponseDto>(['authMe'])!
  const activeAccount = authMe.accounts.find((acc) => acc.isActive)
  const accountId = activeAccount?.id ?? authMe.entities.find((entity) => entity.isActive)?.accountId

  // Fetch account data
  const { data: account, isLoading, error } = useAccount(accountId as string)

  // Memoized values for display
  const recentUsers = useMemo(() => account?.users.values.slice(0, 5) ?? [], [account])
  const recentEntities = useMemo(() => account?.entities.values.slice(0, 5) ?? [], [account])
  const availableRoles = useMemo(() => account?.roles.values ?? [], [account])

  useEffect(() => {
    if (!accountId) {
      signOut()
    }
  }, [accountId, signOut])

  if (isLoading) {
    return (
      <div className="space-y-4 opacity-25">
        {/* first line: Account Info & Statistics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <Skeleton className="skeleton-shimmer-orange h-48 w-full rounded-md" />
          <Skeleton className="skeleton-shimmer-orange h-48 w-full rounded-md" />
        </div>
        {/* second line: Recent Users & Entities */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <Skeleton className="skeleton-shimmer-orange h-56 w-full rounded-md" />
          <Skeleton className="skeleton-shimmer-orange h-56 w-full rounded-md" />
        </div>
        {/* third line : Roles */}
        <Skeleton className="skeleton-shimmer-orange h-40 w-full rounded-md" />
      </div>
    )
  }
  if (error) return <div className="text-red-500">{tAccount('overview.error')}</div>
  if (!account) return null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {/* Account Information */}
        <Card data-testid="account-info-section">
          <CardHeader>
            <SectionHeader title={tAccount('overview.accountInfo.tk_title_')} description={tAccount('overview.accountInfo.tk_description_')} />
          </CardHeader>
          <CardContent>
            <AccountList accounts={authMe.accounts} account={account} tAccount={tAccount} tCommon={tCommon} />
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card className="flex flex-col" data-testid="statistics-section">
          <CardHeader>
            <SectionHeader title={tAccount('overview.statistics.tk_title_')} description={tAccount('overview.statistics.tk_description_')} />
          </CardHeader>
          <CardContent className="flex-1">
            <StatisticsCards account={account} tCommon={tCommon} />
          </CardContent>
        </Card>
      </div>

      {/* Lists */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {/* Recent Users */}
        <Card className="flex flex-col" data-testid="recent-users-section">
          <CardHeader>
            <SectionHeader icon={ICONS.users} iconBg={ICON_BG.users} title={tAccount('overview.recentUsers.tk_title_')} description={tAccount('overview.recentUsers.tk_description_')} />
          </CardHeader>
          <CardContent className="flex h-full flex-col justify-between">
            <RecentUsers users={recentUsers} tAccount={tAccount} />
          </CardContent>
        </Card>

        {/* Recent Entities */}
        <Card className="flex flex-col" data-testid="recent-entities-section">
          <CardHeader>
            <SectionHeader icon={ICONS.entities} iconBg={ICON_BG.entities} title={tAccount('overview.recentEntities.tk_title_')} description={tAccount('overview.recentEntities.tk_description_')} />
          </CardHeader>
          <CardContent className="flex h-full flex-col">
            <RecentEntities entities={recentEntities} tAccount={tAccount} />
          </CardContent>
        </Card>
      </div>

      {/* Available Roles */}
      <Card data-testid="recent-roles-section">
        <CardHeader>
          <SectionHeader icon={ICONS.roles} iconBg={ICON_BG.roles} title={tAccount('overview.recentRoles.tk_title_')} description={tAccount('overview.recentRoles.tk_description_')} />
        </CardHeader>
        <CardContent>
          <RecentRoles roles={availableRoles} tAccount={tAccount} />
        </CardContent>
      </Card>
    </div>
  )
}
