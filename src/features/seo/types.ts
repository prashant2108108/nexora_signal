export interface SeoIssue {
  id: string
  type: 'error' | 'warning' | 'info'
  severity: 'critical' | 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  impact: 'low' | 'high'
  impactScore: number // 0-100
  message: string
  details?: string
  fix?: string      // How to fix it (dynamic context-aware)
  example?: string  // Code example or reference
  step?: string     // Which step produced this issue
}

export interface TechnicalScoreBreakdown {
  indexing: number
  sitemap: number
  canonical: number
  urlHealth: number
}

export interface KeywordDensity {
  word: string
  count: number
  percentage: number
}

export interface MetricValue {
  value: string
  score: number
  status: 'good' | 'needs-improvement' | 'poor'
}

export interface PageSpeedMetrics {
  score: number
  lcp: MetricValue
  fcp: MetricValue
  cls: MetricValue
  tbt: MetricValue
  loadingTimeInMs?: number
}

export interface BrokenLink {
  url: string
  status: number | string
}

export interface LinkAnalysisResult {
  internalCount: number
  externalCount: number
  totalLinks: number
  internalLinks: string[]
  externalLinks: string[]
  brokenLinks: BrokenLink[]
}

export interface ImageInfo {
  src: string
  alt: string | null
  size: number | null
  isLarge: boolean
  hasAlt: boolean
}

export interface ImageAnalysisResult {
  totalCount: number
  missingAltCount: number
  largeImagesCount: number
  images: ImageInfo[]

}

export interface SeoRecommendation {
  type: "meta" | "content" | "image" | "link" | "performance"
  message: string
  priority: "high" | "medium" | "low"
}

export interface SeoInsights {
  page: {
    titleLength: number
    metaDescriptionLength: number
    wordCount: number
    loadPerformance: "good" | "average" | "poor"
  }
  meta: {
    title: {
      value: string
      length: number
      status: "good" | "too_short" | "too_long" | "missing"
    }
    description: {
      value: string
      length: number
      status: "good" | "missing" | "too_short" | "too_long"
    }
  }
  headings: {
    h1Count: number
    h2Count: number
    issues: string[]
  }
  content: {
    wordCount: number
    keywordDensity: KeywordDensity[]
    readability: "good" | "average" | "poor"
    issues: string[]
  }
  links: {
    internalCount: number
    externalCount: number
    brokenLinks: BrokenLink[]
    issues: string[]
  }
  images: {
    total: number
    missingAlt: number
    largeImages: number
    issues: string[]
  }
  tags: {
    canonical: boolean
    robotsMeta: boolean
    ogTags: boolean
    twitterCards: boolean
    issues: string[]
  }
}

export interface RobotsDetails {
  exists: boolean
  status: 'ok' | 'missing' | 'error'
  url: string | null
  content: string | null
  allowedPaths: string[]
  disallowedPaths: string[]
  sitemaplinks: string[]
  issues: string[]
}

export interface SitemapDetails {
  exists: boolean
  status: 'ok' | 'missing' | 'error'
  url: string | null
  totalUrls: number
  sampleUrls: string[]
  isIndex: boolean
  lastModified: string | null
  issues: string[]
}

export interface CanonicalDetails {
  exists: boolean
  url: string | null
  isSelfReferencing: boolean
  isCrossDomain: boolean
  matchesCurrent: boolean
  issues: string[]
}

export interface UrlHealthDetails {
  isSeoFriendly: boolean
  length: number
  depth: number
  containsKeywords: boolean
  hasHyphens: boolean
  hasUnderscores: boolean
  hasStopWords: boolean
  issues: string[]
}

export interface TechnicalSeoData {
  indexing: {
    robots: RobotsDetails
    sitemap: SitemapDetails
    indexable: boolean
    metaRobots: string | null
    xRobotsTag: string | null
    stats: {
      urlsAnalyzed: number
      sitemapFilesParsed: number
      robotsFetched: boolean
      scanDurationMs: number
      maxScanTimeReached: boolean
    }
  }
  canonical: CanonicalDetails & {
    clusters?: { [target: string]: { urls: string[], confidence: number } } 
  }
  url: UrlHealthDetails & {
    normalizedUrl: string
    urlHash: string
    depthDistribution: { [level: string]: number }
    depthInsight?: string
  }
  scoreBreakdown: TechnicalScoreBreakdown
  progress: {
    steps: { name: string; status: 'pending' | 'completed' | 'error' | 'skipped'; message?: string }[]
    currentStep: string
    percent: number
  }
  scanConfidence: 'high' | 'medium' | 'low'
  trend: 'improving' | 'declining' | 'stable'
  previousScore?: number
  scoreChange?: number
  issues: SeoIssue[]
  completedSteps: string[]
  skippedSteps: string[]
}

export interface SeoReportV2 {
  totalScore: number
  pageHealth: "Excellent" | "Good" | "Needs Improvement" | "Poor"
  breakdown: ScoreBreakdown
  insights: SeoInsights
  technical: TechnicalSeoData
  recommendations: SeoRecommendation[]
  scoreDetails: { section: string, score: number, reason: string }[]
  issuesSummary: {
    critical: number
    warnings: number
    passed: number
  }
  trend?: 'improving' | 'declining' | 'stable'
  scoreChange?: number
  previousScore?: number
}

export interface ScoreBreakdown {
  meta: number
  headings: number
  content: number
  links: number
  images: number
  performance: number
  technical: number
}

export interface SeoReportRecord {
  id: string
  url: string
  user_id: string
  organization_id: string
  status: 'pending' | 'completed' | 'failed' | 'completed_with_warnings'
  score: number | null
  summary: any | null
  report: any | null
  processing_time_ms: number | null
  is_async: boolean
  created_at: string
}

export interface SeoReport {
  url: string
  title: string | null
  metaDescription: string | null
  headings: Record<string, number>
  wordCount: number
  keywords: KeywordDensity[]
  links?: LinkAnalysisResult
  images?: ImageAnalysisResult
  loadingTimeInMs?: number
  pageSpeed?: PageSpeedMetrics
  issues: SeoIssue[]
  score: number
  scoreBreakdown?: ScoreBreakdown
  insights?: SeoInsights
  recommendations: SeoRecommendation[]
  status: "Excellent" | "Good" | "Needs Improvement" | "Poor" | "pending" | "completed" | "failed" | "completed_with_warnings"
  
  // V2 Structure
  version?: "v2"
  advanced?: SeoReportV2
}

export interface SeoAnalysisResult {
  success: boolean
  report?: SeoReport
  error?: string
}
