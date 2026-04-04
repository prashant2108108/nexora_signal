'use client'

import { useState } from 'react'
import { useSeoHistory } from '../hooks/useSeoHistory'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ChevronLeft, ChevronRight, ExternalLink, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

export function SeoHistoryTable() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useSeoHistory(page)

  const reports = data?.reports || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 10)

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded-md" />
      ))}
    </div>
  }

  if (isError) {
    return (
      <div className="p-8 border border-red-100 rounded-xl bg-red-50 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-600 font-medium">Failed to load history. Please try again.</p>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="p-12 border-2 border-dashed border-gray-200 rounded-2xl text-center">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-lg font-semibold text-gray-600">No reports yet</p>
        <p className="text-sm text-gray-400 mt-1 mb-6">Run your first SEO analysis to see it here.</p>
        <Link href="/seo/analyze" className="px-6 py-2.5 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition shadow-lg">
          Start Analysis
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Target URL</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400">Score</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400">Issues</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400 text-right">Analyzed</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {reports.map((report: any) => (
              <tr key={report.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-gray-900 group-hover:text-black transition-colors truncate max-w-[300px]">
                      {report.url}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 flex items-center gap-2">
                       <Clock className="w-3 h-3" />
                       {report.processing_time_ms ? `Analyzed in ${(report.processing_time_ms / 1000).toFixed(1)}s` : 'Processing...'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={report.status} />
                </td>
                <td className="px-6 py-4 text-sm font-black text-gray-900">
                  {['completed', 'completed_with_warnings'].includes(report.status) ? (
                    <span className={report.score! > 80 ? 'text-emerald-600' : report.score! > 50 ? 'text-amber-600' : 'text-red-600'}>
                      {report.score}
                    </span>
                  ) : <span className="text-gray-300">--</span>}
                </td>
                <td className="px-6 py-4">
                  {/* Handle both V1 and V2 report structures */}
                  {(report.report?.advanced?.issuesSummary || report.report?.data?.issuesSummary) && (
                    <div className="flex items-center gap-2">
                       {((report.report?.advanced?.issuesSummary?.critical || report.report?.data?.issuesSummary?.critical) || 0) > 0 && (
                         <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                           {report.report?.advanced?.issuesSummary?.critical || report.report?.data?.issuesSummary?.critical}
                         </span>
                       )}
                       {((report.report?.advanced?.issuesSummary?.warnings || report.report?.data?.issuesSummary?.warnings) || 0) > 0 && (
                         <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                           {report.report?.advanced?.issuesSummary?.warnings || report.report?.data?.issuesSummary?.warnings}
                         </span>
                       )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-gray-400 text-right">
                  {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link 
                    href={`/seo/reports/${report.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 rounded-md hover:bg-black hover:text-white transition"
                  >
                    View Report
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md border border-gray-200 bg-white disabled:opacity-50 hover:bg-gray-50 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-md border border-gray-200 bg-white disabled:opacity-50 hover:bg-gray-50 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return (
        <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </div>
      )
    case 'pending':
      return (
        <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md animate-pulse">
          <Clock className="w-3 h-3" />
          Analyzing
        </div>
      )
    case 'completed_with_warnings':
      return (
        <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
          <AlertCircle className="w-3 h-3" />
          Partial Result
        </div>
      )
    case 'failed':
      return (
        <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
          <AlertCircle className="w-3 h-3" />
          Failed
        </div>
      )
    default:
      return null
  }
}
