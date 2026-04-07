'use client'

import { BacklinkAnalytics } from '../api/backlinks-service'

interface Props {
  analytics: BacklinkAnalytics
  isLoading?: boolean
  onCardClick?: (type: 'total' | 'domains' | 'dofollow' | 'nofollow') => void
}

const StatCard = ({
  label,
  value,
  sub,
  color = 'indigo',
  onClick,
}: {
  label: string
  value: string | number
  sub?: string
  color?: 'indigo' | 'green' | 'amber' | 'rose'
  onClick?: () => void
}) => {
  const colors = {
    indigo: 'from-indigo-500 to-indigo-600',
    green: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
  }
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-2 text-left transition-all group ${
        onClick ? 'hover:shadow-md hover:border-indigo-200 active:scale-[0.98]' : ''
      }`}
    >
      <span className="text-sm font-medium text-gray-500 group-hover:text-indigo-500 transition-colors">{label}</span>
      <span className={`text-3xl font-bold bg-gradient-to-r ${colors[color]} bg-clip-text text-transparent`}>
        {value.toLocaleString()}
      </span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
      {onClick && (
        <span className="text-[10px] text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-1 uppercase tracking-wider">
          Click to view details →
        </span>
      )}
    </button>
  )
}

export function AnalyticsCards({ analytics, isLoading, onCardClick }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse h-28" />
        ))}
      </div>
    )
  }

  const pending = analytics.queueStats?.pending ?? 0
  const processing = analytics.queueStats?.processing ?? 0
  const done = analytics.queueStats?.done ?? 0
  const failed = analytics.queueStats?.failed ?? 0
  const total = pending + processing + done + failed
  const progress = total > 0 ? (done / total) * 100 : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Main stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Backlinks"
          value={analytics.totalBacklinks}
          color="indigo"
          onClick={() => onCardClick?.('total')}
        />
        <StatCard
          label="Referring Domains"
          value={analytics.referringDomains}
          color="green"
          onClick={() => onCardClick?.('domains')}
        />
        <StatCard
          label="Dofollow"
          value={analytics.dofollowCount}
          sub={`${analytics.dofollowRatio}% of total`}
          color="amber"
          onClick={() => onCardClick?.('dofollow')}
        />
        <StatCard
          label="Nofollow"
          value={analytics.nofollowCount}
          sub={`${100 - analytics.dofollowRatio}% of total`}
          color="rose"
          onClick={() => onCardClick?.('nofollow')}
        />
      </div>

      {/* Crawl progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-700">Crawl Progress</span>
            <span className="text-[10px] text-gray-400">Real-time queue tracking</span>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
            {Math.round(progress)}% Complete
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4 flex">
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${total > 0 ? (processing / total) * 100 : 0}%` }} />
          <div className="h-full bg-rose-400 transition-all duration-500" style={{ width: `${total > 0 ? (failed / total) * 100 : 0}%` }} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col p-2 bg-gray-50 rounded-xl border border-gray-100/50">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Pending</span>
            <span className="text-sm font-bold text-gray-700">⏳ {pending.toLocaleString()}</span>
          </div>
          <div className="flex flex-col p-2 bg-blue-50/50 rounded-xl border border-blue-100/50">
            <span className="text-[10px] font-medium text-blue-500 uppercase tracking-wider">Processing</span>
            <span className="text-sm font-bold text-blue-700">🔄 {processing.toLocaleString()}</span>
          </div>
          <div className="flex flex-col p-2 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
            <span className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider">Completed</span>
            <span className="text-sm font-bold text-emerald-700">✅ {done.toLocaleString()}</span>
          </div>
          <div className="flex flex-col p-2 bg-rose-50/50 rounded-xl border border-rose-100/50">
            <span className="text-[10px] font-medium text-rose-500 uppercase tracking-wider">Failed</span>
            <span className="text-sm font-bold text-rose-700">❌ {failed.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Top domains + anchors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Referring Domains */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Top Referring Domains</h3>
          {analytics.topDomains.length === 0 ? (
            <p className="text-sm text-gray-400">No domains yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {analytics.topDomains.map((d) => (
                <div key={d.domain} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate max-w-[60%]">{d.domain}</span>
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">{d.backlink_count} links</span>
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded">{d.dofollow_count} do</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Anchors */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Top Anchor Texts</h3>
          {analytics.topAnchors.length === 0 ? (
            <p className="text-sm text-gray-400">No anchors yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {analytics.topAnchors.map((a) => (
                <span
                  key={a.anchor}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                >
                  {a.anchor} <span className="text-gray-400">({a.count})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
