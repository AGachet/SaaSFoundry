/**
 * Resources
 */
import { createContext, ReactNode, useState } from 'react'

/**
 * Types
 */
type BreadcrumbItem = {
  label: string
  description?: string
}

type BreadcrumbContextType = {
  items: BreadcrumbItem[]
  setBreadcrumb: (items: BreadcrumbItem[]) => void
}

/**
 * Context
 */
// eslint-disable-next-line
export const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined)

/**
 * Provider
 */
export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BreadcrumbItem[]>([])
  return <BreadcrumbContext.Provider value={{ items, setBreadcrumb: setItems }}>{children}</BreadcrumbContext.Provider>
}
