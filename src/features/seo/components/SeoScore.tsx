import { SeoReport, SeoReportV2 } from '../types'
import { clsx } from 'clsx'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function SeoScore({ report: rawReport }: { report: any }) {
  const isV2 = rawReport.version === 'v2'
  const advanced = (rawReport as any).advanced
  const report = isV2 ? advanced : (rawReport as SeoReport)
  const insights = isV2 ? advanced?.insights : null

  const getColorClass = (score: number) => {
    if (score > 80) return 'text-emerald-600'
    if (score >= 50) return 'text-amber-600'
    return 'text-red-600'
  }

  const getBorderClass = (score: number) => {
    if (score > 80) return 'border-emerald-200 bg-emerald-50/20'
    if (score >= 50) return 'border-amber-200 bg-amber-50/20'
    return 'border-red-200 bg-red-50/20'
  }

  const score = isV2 ? (report as SeoReportV2).totalScore : (report as SeoReport).score
  const breakdown = isV2 ? (report as SeoReportV2).breakdown : (report as SeoReport).scoreBreakdown

  return (
    <div className="flex flex-col gap-8">
      {/* High-Impact Hero Score */}
      <div className={`p-10 rounded-2xl border-2 ${getBorderClass(score)} flex flex-col items-center justify-center transition-all duration-500 shadow-sm relative overflow-hidden group`}>
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <div className="text-8xl font-black italic tracking-tighter">SEO</div>
        </div>
        
        <h3 className="text-xs font-black tracking-[0.34em] uppercase text-gray-400 mb-6 flex items-center gap-2">
          <span className="w-8 h-[1px] bg-gray-200" />
          Overall Health Score
          <span className="w-8 h-[1px] bg-gray-200" />
        </h3>

        <div className={`text-8xl font-black tracking-tighter sm:text-9xl ${getColorClass(score)} leading-none flex items-center`}>
          {score}
          {isV2 && (report as SeoReportV2).trend && (
            <div className="ml-4 flex flex-col items-center">
              {(report as SeoReportV2).trend === 'improving' ? (
                <TrendingUp className="w-8 h-8 text-emerald-500" />
              ) : (report as SeoReportV2).trend === 'declining' ? (
                <TrendingDown className="w-8 h-8 text-red-500" />
              ) : null}
              <span className={`text-[10px] font-black uppercase tracking-tighter ${
                (report as SeoReportV2).trend === 'improving' ? 'text-emerald-500' : 'text-gray-400'
              }`}>
                {(report as SeoReportV2).scoreChange! > 0 ? `+${(report as SeoReportV2).scoreChange}` : (report as SeoReportV2).scoreChange}
              </span>
            </div>
          )}
          <span className="text-3xl text-gray-300 font-medium ml-2 tabular-nums">/100</span>
        </div>
        
        {isV2 && (
          <div className="mt-4 px-4 py-1.5 rounded-full bg-white/80 dark:bg-black/20 border border-gray-100 dark:border-white/10 shadow-sm flex items-center gap-2">
             <span className={`text-sm font-black uppercase tracking-widest ${(report as SeoReportV2).pageHealth === 'Excellent' ? 'text-emerald-500' : 'text-amber-500'}`}>
               {(report as SeoReportV2).pageHealth}
             </span>
          </div>
        )}

        {breakdown && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 w-full mt-12 border-t border-gray-100/50 pt-10">
            {Object.entries(breakdown).map(([key, val]) => (
              <div key={key} className="flex flex-col items-center group/item hover:scale-110 transition-transform">
                <div className="relative w-14 h-14 flex items-center justify-center mb-3">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-100 dark:text-zinc-800" />
                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" 
                            strokeDasharray={151} strokeDashoffset={151 - (151 * (val / 100))}
                            className={clsx(
                              "transition-all duration-1000",
                              val > 80 ? "text-emerald-500" : val > 50 ? "text-amber-500" : "text-red-500"
                            )} />
                  </svg>
                  <span className="absolute text-[11px] font-black text-gray-700 dark:text-zinc-300">{val}</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover/item:text-gray-900 dark:group-hover/item:text-white transition-colors">{key}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-sm transition-all hover:shadow-md">
          <h4 className="text-[11px] font-black tracking-widest text-gray-400 uppercase mb-5 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Meta Tags
          </h4>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Title Tag</p>
              <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                {isV2 ? insights?.meta.title.value : (report as SeoReport).title || <span className="text-gray-300 italic">Missing</span>}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Description</p>
              <p className="text-sm text-gray-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                {isV2 ? insights?.meta.description.value : (report as SeoReport).metaDescription || <span className="text-gray-300 italic">Missing</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-sm transition-all hover:shadow-md">
          <h4 className="text-[11px] font-black tracking-widest text-gray-400 uppercase mb-5 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Headings Structure
          </h4>
          <div className="space-y-3">
             <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-zinc-800">
               <span className="text-xs font-bold text-gray-500 uppercase">H1 Tags</span>
               <span className={`px-2 py-0.5 rounded text-xs font-black ${(isV2 ? insights?.headings.h1Count : (report as SeoReport).headings?.h1) === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                 {isV2 ? insights?.headings.h1Count : (report as SeoReport).headings?.h1 || 0}
               </span>
             </div>
             <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-zinc-800">
               <span className="text-xs font-bold text-gray-500 uppercase">H2 Tags</span>
               <span className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded text-xs font-black">
                 {isV2 ? insights?.headings.h2Count : (report as SeoReport).headings?.h2 || 0}
                </span>
             </div>
             <div className="pt-2">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Content Depth</p>
                <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 leading-none">
                  {isV2 ? insights?.content.wordCount.toLocaleString() : (report as SeoReport).wordCount.toLocaleString()} <span className="text-xs font-medium text-gray-400">Words</span>
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
