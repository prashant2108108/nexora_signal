export async function getSeoReportsPaginated(page = 1, limit = 10) {
  try {
    const response = await fetch(`/api/seo/reports?page=${page}&limit=${limit}`)
    if (!response.ok) throw new Error('Failed to fetch reports')
    return await response.json()
  } catch (error) {
    console.error('Error fetching reports:', error)
    return { reports: [], total: 0 }
  }
}
