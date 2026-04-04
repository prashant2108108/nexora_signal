'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { getReportById } from '@/server/db/seoReports'
import { SeoScore } from '@/features/seo/components/SeoScore'
import { ImageSeoReport } from '@/features/seo/components/ImageSeoReport'
import { LinkAnalysisCard } from '@/features/seo/components/LinkAnalysisCard'
import { TechnicalSeoCard } from '@/features/seo/components/TechnicalSeoCard'
import { PageSpeedCard } from '@/features/seo/components/PageSpeedCard'
import { KeywordDensityChart } from '@/features/seo/components/KeywordDensityChart'
import { FixGuide } from '@/features/seo/components/FixGuide'
import { ArrowLeft, Share2, Download } from 'lucide-react'

export default function ReportDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const { data: record, isLoading, isError } = useQuery({
    queryKey: ['seo-report', id],
    queryFn: async () => {
      return await getReportById(id as string)
    }
  })

  if (isLoading) return (
    <div className="p-12 text-center animate-pulse">
      <div className="h-4 w-24 bg-gray-200 rounded mb-4 mx-auto" />
      <div className="h-8 w-64 bg-gray-100 rounded mx-auto" />
    </div>
  )
  
  if (isError || !record) return <div className="p-12 text-center text-red-500 font-bold">Report not found.</div>

  const report = record.report
  if (!report) return <div className="p-12 text-center text-amber-500 font-bold">No report data available.</div>

  const isV2 = report.version === 'v2'
  const technicalData = isV2 ? (report.advanced?.technical || report.data?.technical) : null
  const pageSpeedData = report.pageSpeed || report.data?.pageSpeed || report.advanced?.performance
  const keywordData = report.keywords || report.data?.keywords || report.advanced?.insights?.content?.keywordDensity || []

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pt-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to History
        </button>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition">
            <Download className="w-3 h-3" /> Export PDF
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white bg-black rounded-md hover:bg-gray-800 transition">
            <Share2 className="w-3 h-3" /> Share Result
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        <header className="border-l-4 border-black pl-6">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">Audit Report</h1>
          <p className="text-sm font-medium text-gray-400">
            Targeting <span className="text-black font-black underline decoration-indigo-500 decoration-2 underline-offset-4">{record.url}</span>
          </p>
        </header>

        <SeoScore report={report} />
        
        {technicalData && <TechnicalSeoCard data={technicalData} />}
        
        {technicalData?.issues && technicalData.issues.length > 0 && (
          <FixGuide issues={technicalData.issues} />
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <PageSpeedCard metrics={pageSpeedData} />
            <LinkAnalysisCard data={report.links} />
          </div>
          <div className="space-y-8">
            <KeywordDensityChart keywords={keywordData} />
            <ImageSeoReport data={report.images} />
          </div>
        </div>
      </div>
    </div>
  )
}
