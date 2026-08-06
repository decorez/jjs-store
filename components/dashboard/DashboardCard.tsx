import React from 'react'

interface DashboardCardProps {
  title: string
  value: string | number
  icon: string | React.ReactNode
  description?: string
}

export const DashboardCard = ({ title, value, icon, description }: DashboardCardProps) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
      <div className="text-3xl p-3 bg-gray-50 rounded-lg">
        {icon}
      </div>
    </div>
  )
}