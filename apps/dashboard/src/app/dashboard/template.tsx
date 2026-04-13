import type { ReactNode } from 'react'

/**
 * Remounts on each dashboard navigation so Animate.css runs per page.
 * Sidebar lives in the root layout and is not wrapped here.
 */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="dashboard-page-enter animate__animated animate__fadeInRight min-h-full">
      {children}
    </div>
  )
}
