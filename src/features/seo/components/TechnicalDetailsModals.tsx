import React, { useState } from 'react'
import { 
  X, 
  FileText, 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Search,
  Code
} from 'lucide-react'
import { RobotsDetails, SitemapDetails, CanonicalDetails, SeoIssue } from '../types'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 dark:border-zinc-800">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-black text-gray-900 dark:text-zinc-100 uppercase tracking-widest text-sm">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export function RobotsDetailsModal({ data, isOpen, onClose }: { data: RobotsDetails, isOpen: boolean, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'raw' | 'analysis' | 'issues'>('analysis')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Robots.txt Analysis">
      <div className="space-y-6">
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg w-fit">
          {(['analysis', 'raw', 'issues'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wider ${
                activeTab === tab 
                ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white' 
                : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'analysis' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-4">
              <h4 className="text-xs font-black uppercase text-indigo-500 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Crawl Permissions
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Auto-Detected Sitemaps</span>
                  <span className="font-bold">{data.sitemaplinks.length}</span>
                </div>
                {data.sitemaplinks.map((link, i) => (
                  <div key={i} className="text-[10px] font-mono bg-gray-50 dark:bg-zinc-950 p-2 rounded truncate text-gray-400">
                    {link}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-4">
              <h4 className="text-xs font-black uppercase text-emerald-500 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Crawl Efficiency
              </h4>
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                {data.issues.length === 0 ? "Your robots.txt is well-structured and follows best practices." : "We found some optimization opportunities."}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 font-mono text-sm overflow-x-auto whitespace-pre leading-relaxed text-zinc-300">
            {data.content || "Empty content or file not found."}
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="space-y-4">
            {data.issues.length > 0 ? data.issues.map((issue, i) => (
              <div key={i} className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">{issue}</p>
              </div>
            )) : (
              <div className="p-12 text-center text-gray-400 italic">No critical robots.txt issues detected.</div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

export function SitemapExplorerModal({ data, isOpen, onClose }: { data: SitemapDetails, isOpen: boolean, onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sitemap Explorer">
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
            <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Total URLs</p>
            <p className="text-3xl font-black text-indigo-700 dark:text-indigo-400">{data.totalUrls}</p>
          </div>
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
            <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">Status</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">{data.status === 'ok' ? 'Healthy' : 'Issues Found'}</p>
          </div>
          <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/10 border border-zinc-100 dark:border-zinc-800/30 rounded-2xl">
            <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Last Updated</p>
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-400">{data.lastModified || 'N/A'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase text-gray-400 flex items-center gap-2">
            <Search className="w-4 h-4" /> URL Samples
          </h4>
          <div className="border border-gray-100 dark:border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-800/50">
                <tr className="text-left border-b border-gray-100 dark:border-zinc-800">
                  <th className="p-3 text-[10px] font-black uppercase text-gray-400">Page URL</th>
                  <th className="p-3 text-[10px] font-black uppercase text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {data.sampleUrls.map((url, i) => (
                  <tr key={i} className="group hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-gray-500 truncate max-w-md">{url}</td>
                    <td className="p-3 text-right">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="p-1 px-2 bg-gray-100 dark:bg-zinc-800 rounded text-[10px] font-bold text-gray-600 hover:bg-black hover:text-white transition-all">
                        VIEW PAGE
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  )
}
