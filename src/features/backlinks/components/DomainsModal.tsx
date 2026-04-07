'use client'

import { useState } from 'react'
import { BacklinkAnalytics } from '../api/backlinks-service'

interface Props {
  analytics: BacklinkAnalytics
  onSelectDomain: (domain: string) => void
  onClose: () => void
}

export function DomainsModal({ analytics, onSelectDomain, onClose }: Props) {
  const [search, setSearch] = useState('')

  const domains = analytics.topDomains.filter(d => 
    d.domain.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Referring Domains</h2>
            <p className="text-sm text-gray-400 mt-0.5">{analytics.referringDomains} unique domains discovered</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-gray-600 border border-transparent hover:border-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-white border-b border-gray-100">
          <input
            type="text"
            placeholder="Search domains..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {domains.length === 0 ? (
            <div className="py-12 text-center text-gray-400">No domains found matching your search</div>
          ) : (
            <div className="grid grid-cols-1 gap-1">
              {domains.map(d => (
                <button
                  key={d.domain}
                  onClick={() => onSelectDomain(d.domain)}
                  className="flex items-center justify-between p-4 hover:bg-indigo-50 rounded-2xl transition-all group text-left"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-gray-700 group-hover:text-indigo-700">{d.domain}</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Click to filter table</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-indigo-600">{d.backlink_count}</span>
                      <span className="text-[9px] text-gray-400 uppercase">Links</span>
                    </div>
                    <div className="w-[1px] h-8 bg-gray-100 mx-1" />
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-emerald-600">{d.dofollow_count}</span>
                      <span className="text-[9px] text-gray-400 uppercase">Do</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">Showing top domains based on backlink count</p>
        </div>
      </div>
    </div>
  )
}
