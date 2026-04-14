'use client'

import { motion } from 'framer-motion'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
    >
      <div>
        <h1 className="text-2xl font-semibold text-[#0B0D0E]">{title}</h1>
        {description && <p className="text-sm text-[#6B7280] mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </motion.div>
  )
}
