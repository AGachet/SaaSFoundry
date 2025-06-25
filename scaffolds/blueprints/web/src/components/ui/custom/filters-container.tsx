import { ReactNode } from 'react'

type FiltersContainerProps = {
  children: ReactNode
  actions?: ReactNode
  className?: string
}

export function FiltersContainer({ children, actions, className = '' }: FiltersContainerProps) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-4">{children}</div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  )
}

type FilterGroupProps = {
  children: ReactNode
  className?: string
}

export function FilterGroup({ children, className = '' }: FilterGroupProps) {
  return <div className={`flex flex-wrap items-center gap-4 ${className}`}>{children}</div>
}

type FilterProps = {
  children: ReactNode
  minWidth?: string
  className?: string
}

export function Filter({ children, minWidth = '200px', className = '' }: FilterProps) {
  return (
    <div className={`flex-shrink-0 ${className}`} style={{ minWidth }}>
      {children}
    </div>
  )
}
