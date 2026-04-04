import React, { useState } from 'react'
import { TechnicalSeoData } from '../types'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Globe, 
  Search, 
  Link as LinkIcon, 
  Info,
  Maximize2,
  TrendingUp,
  TrendingDown,
  Hash,
  FileText
} from 'lucide-react'
import { RobotsDetailsModal, SitemapExplorerModal } from './TechnicalDetailsModals'

interface TechnicalSeoCardProps {
  data?: TechnicalSeoData
}

export function TechnicalSeoCard({ data }: TechnicalSeoCardProps) {
  const [robotsModalOpen, setRobotsModalOpen] = useState(false)
  const [sitemapModalOpen, setSitemapModalOpen] = useState(false)

  if (!data) return null

  const getStatusIcon = (status: boolean) => status 
    ? <CheckCircle className="w-4 h-4 text-emerald-500" />
    : <XCircle className="w-4 h-4 text-red-500" />

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-100';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-blue-600 bg-blue-50 border-blue-100';
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-300">
      {/* Header with Sub-Scores */}
      <div className="p-6 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-black dark:bg-white rounded-xl">
              <Search className="w-6 h-6 text-white dark:text-black" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight">Technical SEO</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Crawl Confidence:</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                  data.scanConfidence === 'high' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {data.scanConfidence || 'High'}
                </span>
                {data.trend && (
                  <span className={`flex items-center gap-1 text-[10px] font-black uppercase ml-2 ${
                    data.trend === 'improving' ? 'text-emerald-500' : data.trend === 'declining' ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {data.trend === 'improving' ? <TrendingUp className="w-3 h-3" /> : data.trend === 'declining' ? <TrendingDown className="w-3 h-3" /> : null}
                    {data.trend}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sub-score Breakdown Bar */}
          <div className="flex flex-wrap gap-4 md:gap-8">
            {data.scoreBreakdown && Object.entries(data.scoreBreakdown).map(([key, score]) => (
              <div key={key} className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{key}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-12 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${score > 80 ? 'bg-emerald-500' : score > 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                      style={{ width: `${score}%` }} 
                    />
                  </div>
                  <span className="text-xs font-black text-gray-700 dark:text-zinc-300">{score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Indexing section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
              <Globe className="w-4 h-4" /> Indexing
            </h4>
            <button 
              onClick={() => setRobotsModalOpen(true)}
              className="text-[10px] font-black text-indigo-500 hover:underline flex items-center gap-1 uppercase"
            >
              Analyze <Maximize2 className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-zinc-800">
              <span className="text-sm font-bold text-gray-600 dark:text-zinc-400">robots.txt</span>
              {getStatusIcon(data.indexing?.robots?.exists || false)}
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-zinc-800">
              <span className="text-sm font-bold text-gray-600 dark:text-zinc-400">Sitemap XML</span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-gray-400">{data.indexing?.sitemap?.totalUrls || 0} URLs</span>
                {getStatusIcon(data.indexing?.sitemap?.exists || false)}
              </div>
            </div>
            <button 
              onClick={() => setSitemapModalOpen(true)}
              className="w-full py-2 bg-gray-50 dark:bg-zinc-800/50 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-black hover:text-white transition-all"
            >
              Full Sitemap Explorer
            </button>
          </div>
        </div>

        {/* Canonical section */}
        <div className="space-y-6">
          <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
            <LinkIcon className="w-4 h-4" /> Canonicalization
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-zinc-800">
              <span className="text-sm font-bold text-gray-600 dark:text-zinc-400">Unique (No Dups)</span>
              {getStatusIcon(!data.canonical.issues.length)}
            </div>
            <div className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/20">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Canonical Target</p>
              <p className="text-[11px] font-mono break-all text-gray-500 leading-relaxed">
                {data.canonical.url || 'None set'}
              </p>
              {data.canonical.isSelfReferencing && (
                <span className="mt-2 inline-block text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase">Self-Referencing ✅</span>
              )}
            </div>
          </div>
        </div>

        {/* URL Health & Insights */}
        <div className="space-y-6">
          <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
            <Info className="w-4 h-4" /> URL Health
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">SEO Friendly</span>
              {getStatusIcon(data.url.isSeoFriendly)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">Crawl Depth</span>
              <span className="text-xs font-black text-gray-900 dark:text-zinc-300 uppercase">Level {data.url.depth}</span>
            </div>
            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Expert Insight</p>
              <p className="text-xs text-gray-600 dark:text-zinc-400 italic">
                "{data.url.depthInsight || 'Your URL structure is clean and follows best practices.'}"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Issues & Fix Guides */}
      {data.issues.length > 0 && (
        <div className="p-8 bg-zinc-50 dark:bg-zinc-950/50 border-t border-gray-100 dark:border-zinc-800">
          <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Critical Technical Issues
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.issues.map((issue, idx) => (
              <div key={idx} className={`p-4 rounded-2xl border ${getSeverityColor(issue.severity)} flex flex-col gap-3`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-white/50 backdrop-blur-sm">
                      <AlertTriangle className="w-3 h-3" />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{issue.severity} Impact</span>
                  </div>
                  <span className="text-[10px] font-black opacity-60 uppercase">{issue.effort} Effort</span>
                </div>
                <div>
                  <p className="text-sm font-black mb-1">{issue.message}</p>
                  <p className="text-xs opacity-80 leading-relaxed font-medium">{issue.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Trust Signals */}
      {data.indexing?.stats && (
        <div className="px-8 py-4 bg-gray-50/30 dark:bg-zinc-900/60 border-t border-gray-100 dark:border-zinc-800 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <Hash className="w-3 h-3" /> {data.indexing.stats.urlsAnalyzed || 0} URLs Analyzed
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <FileText className="w-3 h-3" /> {data.indexing.stats.sitemapFilesParsed || 0} Sitemaps Found
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <Globe className="w-3 h-3" /> {data.indexing.stats.robotsFetched ? 'Robots.txt OK' : 'Robots.txt Missing'}
          </div>
          <div className="ml-auto text-[10px] font-black text-indigo-500 uppercase tracking-widest">
            Scan Time: {((data.indexing.stats.scanDurationMs || 0) / 1000).toFixed(1)}s
          </div>
        </div>
      )}

      {/* Modals */}
      <RobotsDetailsModal 
        isOpen={robotsModalOpen} 
        onClose={() => setRobotsModalOpen(false)} 
        data={data.indexing.robots} 
      />
      <SitemapExplorerModal 
        isOpen={sitemapModalOpen} 
        onClose={() => setSitemapModalOpen(false)} 
        data={data.indexing.sitemap} 
      />
    </div>
  )
}
