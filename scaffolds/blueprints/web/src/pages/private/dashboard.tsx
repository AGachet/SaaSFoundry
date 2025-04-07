/**
 * Resource
 */
import { useTranslation } from 'react-i18next'

/**
 * React declaration
 */
export const Dashboard = () => {
  const { t: tDashboard } = useTranslation('page-dashboard')

  const renderPlaceholderGrid = () => (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="aspect-video rounded-xl bg-muted/50" />
        ))}
      </div>
      <div className="flex-1 rounded-xl bg-muted/50" />
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="mb-5 flex flex-col">
        <h2 className="mb-1 text-2xl font-bold">{tDashboard('header.tk_title_')}</h2>
        <p>{tDashboard('header.tk_description_')}</p>
      </div>
      {/* Grid */}
      {renderPlaceholderGrid()}
    </div>
  )
}
