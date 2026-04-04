import { 
  SeoReportV2, 
  ScoreBreakdown, 
  SeoInsights, 
  BrokenLink, 
  SeoRecommendation,
  TechnicalSeoData,
  SeoIssue
} from '../../features/seo/types'

export function calculateSeoScore(data: any) {
  const breakdown: ScoreBreakdown = {
    meta: 0,
    headings: 0,
    content: 0,
    links: 0,
    images: 0,
    performance: 0,
    technical: 0
  }

  const scoreDetails: { section: string, score: number, reason: string }[] = []
  let criticalCount = 0
  let warningCount = 0
  let passedCount = 0

  // 1. Meta Score (20%)
  let metaScore = 100
  if (!data.meta?.title) { metaScore -= 50; criticalCount++ }
  else if (data.meta.title.length < 30 || data.meta.title.length > 60) { metaScore -= 20; warningCount++ }
  if (!data.meta?.description) { metaScore -= 50; criticalCount++ }
  else if (data.meta.description.length < 120 || data.meta.description.length > 160) { metaScore -= 20; warningCount++ }
  breakdown.meta = Math.max(0, metaScore)
  scoreDetails.push({ section: "meta", score: breakdown.meta, reason: metaScore < 100 ? "Meta tags need optimization" : "Perfect meta structure" })

  // 2. Headings Score (10%)
  let headScore = 100
  if (data.headings?.h1Count !== 1) { headScore -= 50; criticalCount++ }
  if (data.headings?.h2Count === 0) { headScore -= 30; warningCount++ }
  breakdown.headings = Math.max(0, headScore)

  // 3. Content Score (20%)
  let contentScore = 100
  const wordCount = data.content?.wordCount || data.keywords?.wordCount || 0
  if (wordCount < 300) { contentScore -= 40; warningCount++ }
  if (wordCount < 100) { contentScore -= 30; criticalCount++ }
  breakdown.content = Math.max(0, contentScore)

  // 4. Links Score (10%)
  let linkScore = 100
  const brokenCount = data.links?.brokenLinks?.length || 0
  if (brokenCount > 0) { linkScore -= (brokenCount * 10); criticalCount += brokenCount }
  breakdown.links = Math.max(0, linkScore)

  // 5. Images Score (10%)
  let imgScore = 100
  const missingAlt = data.images?.missingAltCount || 0
  if (missingAlt > 0) { imgScore -= Math.min(50, missingAlt * 5); warningCount += missingAlt }
  breakdown.images = Math.max(0, imgScore)

  // 6. Performance Score (15%)
  let perfScore = data.performance?.score || 50
  if (perfScore < 50) criticalCount++
  else if (perfScore < 90) warningCount++
  breakdown.performance = perfScore

  // 7. Technical Score (15%) - PRO WEIGHTED
  const tech = data.technical as TechnicalSeoData;
  if (tech && tech.scoreBreakdown) {
    const { indexing, sitemap, canonical, urlHealth } = tech.scoreBreakdown;
    const weightedTechScore = Math.round(
      (indexing * 0.3) +
      (sitemap * 0.25) +
      (canonical * 0.25) +
      (urlHealth * 0.2)
    );
    breakdown.technical = weightedTechScore;
  } else {
    breakdown.technical = 70; // Baseline
  }
  
  // Count technical issues
  if (tech?.issues) {
    tech.issues.forEach(i => {
      if (i.severity === 'critical') criticalCount++;
      else if (i.severity === 'high' || i.severity === 'medium') warningCount++;
    });
  }

  // Weighted Final Score
  const totalScore = Math.round(
    (breakdown.meta * 0.20) +
    (breakdown.content * 0.20) +
    (breakdown.performance * 0.15) +
    (breakdown.technical * 0.15) +
    (breakdown.headings * 0.10) +
    (breakdown.links * 0.10) +
    (breakdown.images * 0.10)
  )

  // Generate Insights
  const insights: SeoInsights = {
    page: {
      titleLength: data.meta?.title?.length || 0,
      metaDescriptionLength: data.meta?.description?.length || 0,
      wordCount: wordCount,
      loadPerformance: perfScore > 85 ? "good" : perfScore > 60 ? "average" : "poor"
    },
    meta: {
      title: {
        value: data.meta?.title || "",
        length: data.meta?.title?.length || 0,
        status: !data.meta?.title ? "missing" : (data.meta.title.length < 30 ? "too_short" : data.meta.title.length > 60 ? "too_long" : "good")
      },
      description: {
        value: data.meta?.description || "",
        length: data.meta?.description?.length || 0,
        status: !data.meta?.description ? "missing" : (data.meta.description.length < 120 ? "too_short" : data.meta.description.length > 160 ? "too_long" : "good")
      }
    },
    headings: {
      h1Count: data.headings?.h1Count || 0,
      h2Count: data.headings?.h2Count || 0,
      issues: headScore < 100 ? ["Heading structure is not optimal"] : []
    },
    content: {
      wordCount: wordCount,
      keywordDensity: data.keywords?.keywords || [],
      readability: wordCount > 500 ? "good" : "average",
      issues: contentScore < 70 ? ["Thin content"] : []
    },
    links: {
      internalCount: data.links?.internalCount || 0,
      externalCount: data.links?.externalCount || 0,
      brokenLinks: data.links?.brokenLinks || [],
      issues: brokenCount > 0 ? [`${brokenCount} broken links found`] : []
    },
    images: {
      total: data.images?.totalCount || 0,
      missingAlt: missingAlt,
      largeImages: data.images?.largeImagesCount || 0,
      issues: missingAlt > 0 ? [`${missingAlt} images missing alt text`] : []
    },
    tags: {
      canonical: data.tags?.canonical || false,
      robotsMeta: data.tags?.robotsMeta || false,
      ogTags: data.tags?.ogTags || false,
      twitterCards: data.tags?.twitterCards || false,
      issues: data.tags?.issues || []
    }
  }

  // Final Result
  return {
    score: totalScore,
    advanced: {
      totalScore,
      pageHealth: totalScore > 85 ? "Excellent" : totalScore > 70 ? "Good" : totalScore > 50 ? "Needs Improvement" : "Poor",
      breakdown,
      insights,
      technical: tech,
      recommendations: generateRecommendations(insights, breakdown, tech),
      scoreDetails,
      issuesSummary: {
        critical: criticalCount,
        warnings: warningCount,
        passed: passedCount || 10 
      }
    }
  }
}

function generateRecommendations(insights: SeoInsights, breakdown: ScoreBreakdown, tech?: TechnicalSeoData): SeoRecommendation[] {
  const recs: SeoRecommendation[] = []
  
  if (breakdown.meta < 80) {
    recs.push({ type: "meta", message: "Optimize your meta tags for better search visibility.", priority: "high" })
  }
  if (breakdown.content < 70) {
    recs.push({ type: "content", message: "Increase content depth (min 300 words recommended).", priority: "high" })
  }
  if (breakdown.performance < 50) {
    recs.push({ type: "performance", message: "Improve load speed by optimizing assets and server response.", priority: "high" })
  }
  
  // Technical Recommendations from the granular issues
  if (tech?.issues) {
    tech.issues.slice(0, 3).forEach(issue => {
      recs.push({
        type: "technical" as any,
        message: issue.message,
        priority: issue.severity === 'critical' || issue.severity === 'high' ? 'high' : 'medium'
      });
    });
  }

  if (breakdown.links < 90) {
    recs.push({ type: "link", message: "Fix broken internal or external links.", priority: "medium" })
  }
  if (breakdown.images < 90) {
    recs.push({ type: "image", message: "Add alt text to images for accessibility and SEO.", priority: "medium" })
  }

  return recs.sort((a, b) => {
    const priorityMap = { high: 0, medium: 1, low: 2 }
    return priorityMap[a.priority as keyof typeof priorityMap] - priorityMap[b.priority as keyof typeof priorityMap]
  })
}
