import * as cheerio from 'cheerio'
import { analyzeMeta } from './metaAnalyzer'
import { analyzeHeadings } from './headingsAnalyzer'
import { extractKeywords } from './keywordAnalyzer'
import { analyzeLinks } from './linkAnalyzer'
import { analyzeImages } from './imageAnalyzer'
import { analyzeTags } from './tagAnalyzer'
import { getPageSpeedMetrics } from './pageSpeed'
import { analyzeTechnical } from './technicalAnalyzer'
import { calculateSeoScore } from './scoreEngine'

export interface ProgressStatus {
  currentStep: string;
  percent: number;
  steps: { name: string; status: 'pending' | 'completed' | 'error' | 'skipped'; message?: string }[];
}

async function fetchHtml(url: string, timeout = 10000): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NexoraSignalBot/1.0 (SEO Analysis Engine; SaaS-Level)'
      }
    })
    
    // Safety check for massive pages (e.g. 10MB limit)
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      throw new Error('Page too large to analyze (>10MB)')
    }

    clearTimeout(timeoutId)
    if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`)
    
    const text = await response.text()
    if (text.length > 10 * 1024 * 1024) throw new Error('Response content too large')
    return text
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') throw new Error('Fetch timed out')
    throw error
  }
}

export async function parseUrl(url: string, onProgress?: (status: ProgressStatus) => void) {
  const steps: ProgressStatus['steps'] = [
    { name: 'Initial Fetch', status: 'pending' },
    { name: 'Content Analysis', status: 'pending' },
    { name: 'Media & Links', status: 'pending' },
    { name: 'Performance Scan', status: 'pending' },
    { name: 'Technical Diagnostics', status: 'pending' },
    { name: 'Final Scoring', status: 'pending' }
  ];

  const updateProgress = (stepIndex: number, status: 'pending' | 'completed' | 'error' | 'skipped', message?: string) => {
    steps[stepIndex].status = status;
    if (message) steps[stepIndex].message = message;
    const completedCount = steps.filter(s => s.status === 'completed' || s.status === 'skipped').length;
    if (onProgress) {
      onProgress({
        currentStep: steps[stepIndex].name,
        percent: Math.round((completedCount / steps.length) * 100),
        steps
      });
    }
  };

  try {
    // Stage 1: Initial Fetch
    updateProgress(0, 'pending');
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    updateProgress(0, 'completed');

    let partialFailure = false;
    const wrapAnalyzer = async (fn: () => Promise<any> | any, name: string) => {
      try {
        return await fn();
      } catch (err) {
        console.error(`Analyzer [${name}] failed:`, err);
        partialFailure = true;
        return null;
      }
    };

    // Stage 2: Content Analysis
    updateProgress(1, 'pending');
    const [meta, headings, keywords] = await Promise.all([
      wrapAnalyzer(() => analyzeMeta($), 'meta'),
      wrapAnalyzer(() => analyzeHeadings($), 'headings'),
      wrapAnalyzer(() => extractKeywords($), 'keywords')
    ]);
    updateProgress(1, 'completed');

    // Stage 3: Media & Links
    updateProgress(2, 'pending');
    const [links, images, tags] = await Promise.all([
      wrapAnalyzer(() => analyzeLinks(url, $), 'links'),
      wrapAnalyzer(() => analyzeImages(url, $), 'images'),
      wrapAnalyzer(() => analyzeTags($), 'tags')
    ]);
    updateProgress(2, 'completed');

    // Stage 4: Performance Scan
    updateProgress(3, 'pending');
    const pageSpeed = await wrapAnalyzer(() => getPageSpeedMetrics(url), 'pagespeed');
    updateProgress(3, pageSpeed ? 'completed' : 'error');

    // Stage 5: Technical Diagnostics
    updateProgress(4, 'pending');
    const technical = await wrapAnalyzer(() => analyzeTechnical(url, html), 'technical');
    updateProgress(4, technical ? 'completed' : 'error');

    // Stage 6: Final Scoring
    updateProgress(5, 'pending');
    const auditResult = calculateSeoScore({
      meta,
      headings,
      keywords,
      links,
      images,
      tags,
      performance: pageSpeed,
      technical
    });
    updateProgress(5, 'completed');

    return {
      version: "v2",
      score: auditResult.score,
      partialFailure,
      advanced: {
        ...auditResult.advanced,
        progress: {
          steps,
          currentStep: 'Completed',
          percent: 100
        }
      },
      data: {
        url,
        title: meta?.title || '',
        metaDescription: meta?.description || '',
        headings: { 
          h1: headings?.h1Count || 0, 
          h2: headings?.h2Count || 0 
        },
        wordCount: keywords?.wordCount || 0,
        keywords: keywords?.keywords || [],
        pageSpeed: pageSpeed || undefined,
        links,
        images,
        tags,
        technical
      }
    };
  } catch (err: any) {
    updateProgress(0, 'error', err.message);
    throw err;
  }
}
