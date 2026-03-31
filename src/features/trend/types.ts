export interface Trend {
  id: string
  name: string
  description: string
  score: number
  status: 'active' | 'inactive' | 'emerging'
}

export type TrendStatus = Trend['status']
