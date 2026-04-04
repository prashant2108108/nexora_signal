'use client'

export const dynamic = 'force-dynamic'

import { useSeoAnalysis } from '@/features/seo/hooks/useSeoAnalysis'
import { UrlInput } from '@/features/seo/components/UrlInput'
import { SeoScore } from '@/features/seo/components/SeoScore'
import { IssuesList } from '@/features/seo/components/IssuesList'
import { KeywordDensityChart } from '@/features/seo/components/KeywordDensityChart'
import { PageSpeedCard } from '@/features/seo/components/PageSpeedCard'
import { LinkAnalysisCard } from '@/features/seo/components/LinkAnalysisCard'
import { ImageSeoReport } from '@/features/seo/components/ImageSeoReport'
import { TechnicalSeoCard } from '@/features/seo/components/TechnicalSeoCard'
import { FixGuide } from '@/features/seo/components/FixGuide'
import { useUserRole } from '@/features/auth/hooks/useUserRole'
import Link from 'next/link'

export default function SeoAnalyzePage() {
  const { data: role, isLoading: roleLoading } = useUserRole()
  const { mutate: analyze, data, isPending, error } = useSeoAnalysis()

  if (!roleLoading && role === 'member') {
    return (
      <div className="max-w-4xl h-full flex flex-col justify-center items-center py-20">
        <div className="p-8 text-center border border-gray-200 rounded-md bg-white">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500 mb-6">As a member, you do not have permission to run new SEO analyses.</p>
          <Link href="/seo" className="text-sm text-gray-900 font-medium hover:underline">
            Return to Reports
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className=" space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Link href="/seo" className="text-sm font-medium text-gray-400 hover:text-gray-800 transition-colors">
            ← Back to reports
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-6">Analyze URL</h1>
        <UrlInput onAnalyze={(url) => analyze(url)} isLoading={isPending} />
        {error && <p className="text-red-500 text-sm mt-4 font-medium">{error.message}</p>}
      </div>

      {data?.success && data.report && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="md:col-span-2 space-y-6">
            {data.report.status === 'pending' ? (
              <div className="p-12 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center bg-gray-50/50">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Analysis in Progress</h3>
                <p className="text-gray-500 max-w-sm">We're already analyzing this URL. This usually takes 15-30 seconds. Please check back in a moment.</p>
                <div className="mt-8">
                   <Link href="/seo" className="text-indigo-600 font-bold hover:underline">View All Reports →</Link>
                </div>
              </div>
            ) : (
              <>
                <SeoScore report={data.report} />
                {data.report.advanced?.technical && (
                  <TechnicalSeoCard data={data.report.advanced.technical} />
                )}
                {data.report.advanced?.technical?.issues && data.report.advanced.technical.issues.length > 0 && (
                  <FixGuide issues={data.report.advanced.technical.issues} />
                )}
                <LinkAnalysisCard data={data.report.links} loading={isPending} />
                <ImageSeoReport data={data.report.images} loading={isPending} />
                <IssuesList issues={data.report.issues || []} />
              </>
            )}
          </div>
          <div className="space-y-6">
            {data.report.status !== 'pending' && (
              <>
                <KeywordDensityChart keywords={data.report.keywords} />
                <PageSpeedCard metrics={data.report.pageSpeed} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
