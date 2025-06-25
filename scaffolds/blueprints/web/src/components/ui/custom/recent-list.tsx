import { Link } from 'react-router-dom'
import { Avatar } from './avatar'

export type RecentListItem = {
  id: string | number
  name: string
  subtitle?: string | null
  createdAt: string | Date
  initials?: string
  icon?: React.ReactNode
  bgColor: string
  textColor: string
}

type RecentListProps = {
  items: RecentListItem[]
  emptyIcon: React.ReactNode
  emptyText: string
  showLink?: boolean
  linkText?: string
  linkTo?: string
  gridLayout?: boolean
}

export function RecentList({ items, emptyIcon, emptyText, showLink = true, linkText, linkTo, gridLayout = false }: RecentListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 rounded-md border border-dashed border-gray-300/50 p-6">
        {emptyIcon}
        <span className="text-sm text-muted-foreground opacity-50">{emptyText}</span>
      </div>
    )
  }

  return (
    <>
      <ul className={`flex flex-1 ${gridLayout ? 'grid grid-cols-1 gap-2 md:grid-cols-3' : 'flex-col gap-2'}`}>
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-md border border-muted bg-muted/50 p-4">
            <div className="flex items-center gap-4">
              <Avatar initials={item.initials} icon={item.icon} bgColor={item.bgColor} textColor={item.textColor} />
              <div>
                <span className="font-medium capitalize">{item.name}</span>
                {item.subtitle && <div className="text-xs text-muted-foreground">{item.subtitle}</div>}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</div>
          </li>
        ))}
      </ul>
      {showLink && linkText && linkTo && (
        <div className="mt-5 flex justify-end px-1">
          <Link to={linkTo} className="text-primary transition hover:opacity-80">
            {linkText}
          </Link>
        </div>
      )}
    </>
  )
}
