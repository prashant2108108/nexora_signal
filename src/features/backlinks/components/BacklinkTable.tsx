'use client'

import { useState } from 'react'
import { Backlink, BacklinkFilters } from '../api/backlinks-service'
import { useBacklinks } from '../hooks/useBacklinks'

interface Props {
  projectId: string
  filters: BacklinkFilters
  onFilterChange: (filters: BacklinkFilters | ((f: BacklinkFilters) => BacklinkFilters)) => void
  onApply: () => void
}

export function BacklinkTable({ projectId, filters, onFilterChange, onApply }: Props) {
  const [domainSearch, setDomainSearch] = useState(filters.domain || '')
  const [anchorSearch, setAnchorSearch] = useState(filters.anchor || '')
  const [nofollowType, setNofollowType] = useState<'all' | 'dofollow' | 'nofollow'>(
    filters.nofollow === 'true' ? 'nofollow' : filters.nofollow === 'false' ? 'dofollow' : 'all'
  )

  const handleApply = () => {
    onFilterChange({
      ...filters,
      page: 1,
      domain: domainSearch || undefined,
      anchor: anchorSearch || undefined,
      nofollow: nofollowType === 'dofollow' ? 'false' : nofollowType === 'nofollow' ? 'true' : undefined,
    })
    onApply()
  }

  const { data, isLoading, error } = useBacklinks(projectId, filters)

  return (
    <div id="backlinks-table" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Domain</label>
          <input
            type="text"
            placeholder="filter by domain..."
            value={domainSearch}
            onChange={e => setDomainSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Anchor</label>
          <input
            type="text"
            placeholder="filter by anchor..."
            value={anchorSearch}
            onChange={e => setAnchorSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Link Type</label>
          <select
            value={nofollowType}
            onChange={e => setNofollowType(e.target.value as typeof nofollowType)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="all">All</option>
            <option value="dofollow">Dofollow</option>
            <option value="nofollow">Nofollow</option>
          </select>
        </div>
        <button
          onClick={handleApply}
          className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Apply
        </button>
        {data && (
          <span className="ml-auto text-sm text-gray-400 self-center">
            {data.total.toLocaleString()} results
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-8 text-center text-gray-400 animate-pulse">Loading backlinks...</div>
      ) : error ? (
        <div className="p-8 text-center text-red-400">Failed to load backlinks</div>
      ) : !data?.backlinks.length ? (
        <div className="p-8 text-center text-gray-400">
          No backlinks found yet. Trigger a discovery run to start crawling.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Source URL</th>
                  <th className="px-4 py-3 text-left">Target URL</th>
                  <th className="px-4 py-3 text-left">Anchor</th>
                  <th className="px-4 py-3 text-left">Domain</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3 text-left">Discovered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.backlinks.map((b: Backlink) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 max-w-[240px]">
                      <div className="flex flex-col gap-0.5">
                        <a
                          href={b.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline font-medium truncate block"
                          title={b.source_url}
                        >
                          {b.source_url.replace(/^https?:\/\//, '')}
                        </a>
                        <span className="text-[10px] text-gray-400 break-all line-clamp-1">{b.source_url}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <a
                        href={b.target_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-indigo-600 text-[11px] truncate block"
                        title={b.target_url}
                      >
                        {b.target_url.replace(/^https?:\/\//, '')}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate" title={b.anchor}>
                      {b.anchor || <span className="text-gray-300 italic">no anchor</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-[10px]">{b.domain}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                          b.nofollow
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {b.nofollow ? 'nofollow' : 'dofollow'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => onFilterChange(f => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
                disabled={(filters.page ?? 1) <= 1}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ← Previous
              </button>
              <span className="text-xs text-gray-400">
                Page {filters.page} of {data.totalPages}
              </span>
              <button
                onClick={() => onFilterChange(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
                disabled={(filters.page ?? 1) >= data.totalPages}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
