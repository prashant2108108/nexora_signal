import React from 'react'
import { 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  Lightbulb, 
  Copy, 
  Code as CodeIcon 
} from 'lucide-react'
import { SeoIssue } from '../types'

interface FixGuideProps {
  issues: SeoIssue[]
}

export function FixGuide({ issues }: FixGuideProps) {
  if (!issues || issues.length === 0) {
    return (
      <div className="p-12 text-center bg-gray-50 dark:bg-zinc-900/40 rounded-3xl border-2 border-dashed border-gray-200 dark:border-zinc-800">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase mb-2 tracking-tight">Technical Perfection</h3>
        <p className="text-gray-500 dark:text-zinc-400 max-w-sm mx-auto text-sm">
          No critical technical issues detected. Your site architecture follows best practices.
        </p>
      </div>
    )
  }

  const getPriorityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase">Critical Fix</span>
      case 'high': return <span className="px-2 py-0.5 rounded bg-orange-500 text-white text-[9px] font-black uppercase">High Impact</span>
      case 'medium': return <span className="px-2 py-0.5 rounded bg-amber-400 text-white text-[9px] font-black uppercase">Medium</span>
      default: return <span className="px-2 py-0.5 rounded bg-blue-500 text-white text-[9px] font-black uppercase">Improvement</span>
    }
  }

  const getEffortBadge = (effort: string) => {
    return <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{effort} Effort</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Fix It Guide</h3>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{issues.length} Issues Detected</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {issues.map((issue, idx) => (
          <div key={idx} className="group bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden hover:border-black dark:hover:border-white transition-all duration-300">
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
              {/* Left: Issue Description */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  {getPriorityBadge(issue.severity)}
                  {getEffortBadge(issue.effort || 'low')}
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900 dark:text-white mb-2">{issue.message}</h4>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed max-w-lg">
                    {issue.fix || "This issue affects your crawlability and search visibility. Follow the instructions to resolve it."}
                  </p>
                </div>
                {issue.details && (
                  <div className="p-3 bg-gray-50 dark:bg-zinc-800/40 rounded-lg border border-gray-100 dark:border-zinc-800 flex items-start gap-3">
                    <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600 dark:text-zinc-400 italic">"{issue.details}"</p>
                  </div>
                )}
              </div>

              {/* Right: Action / Code Example */}
              <div className="md:w-1/3 flex flex-col justify-center">
                {issue.example ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <CodeIcon className="w-3 h-3" /> Implementation Example
                    </p>
                    <div className="relative group/code">
                      <pre className="p-4 bg-zinc-950 text-zinc-300 rounded-xl text-[11px] font-mono leading-relaxed border border-zinc-800 overflow-x-auto">
                        {issue.example}
                      </pre>
                      <button className="absolute top-2 right-2 p-1.5 bg-white/10 opacity-0 group-hover/code:opacity-100 hover:bg-white/20 rounded transition-all">
                        <Copy className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-black dark:bg-white rounded-2xl text-center shadow-lg group-hover:scale-[1.02] transition-transform">
                    <span className="text-[10px] font-black text-white dark:text-black uppercase tracking-widest mb-2 block opacity-60">Ready to resolve?</span>
                    <button className="text-xs font-black text-white dark:text-black uppercase underline decoration-2 underline-offset-4 decoration-indigo-500 hover:text-indigo-400 transition-colors">
                      Follow Instructions <ArrowRight className="inline w-3 h-3 ml-1" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
