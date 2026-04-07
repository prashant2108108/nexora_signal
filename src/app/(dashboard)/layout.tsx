import React from 'react'
import { DashboardHeader } from '@/features/auth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950">
      <aside className="w-64 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        {/* Sidebar content */}
        <h2 className="text-xl font-bold mb-4">Nexora Signal</h2>
        <nav className="space-y-2">
           <a href="/trends" className="block p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded">Trend Finder</a>
           <a href="/content" className="block p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded">Content Generator</a>
           <a href="/competitors" className="block p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded">Competitor Analyzer</a>
           <a href="/leads" className="block p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded">Lead Finder</a>
           <a href="/seo" className="block p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded">SEO Analysis</a>
           <a href="/backlinks" className="block p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded">🔗 Backlinks</a>
        </nav>
      </aside>
      <main className="flex-1 flex flex-col">
        <DashboardHeader />
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
