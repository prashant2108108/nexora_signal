'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchProjects,
  fetchBacklinks,
  fetchAnalytics,
  createProject,
  triggerDiscover,
  stopCrawl,
  deleteProject,
  BacklinkFilters,
} from '../api/backlinks-service'
import { BacklinkProject } from '../api/backlinks-service'

export function useProjects() {
  return useQuery({
    queryKey: ['backlink-projects'],
    queryFn: fetchProjects,
    staleTime: 30_000,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (domain: string) => createProject(domain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlink-projects'] })
    },
  })
}

export function useBacklinks(projectId: string | null, filters: BacklinkFilters = {}) {
  return useQuery({
    queryKey: ['backlinks', projectId, filters],
    queryFn: () => fetchBacklinks(projectId!, filters),
    enabled: !!projectId,
    staleTime: 60_000,
  })
}

export function useAnalytics(projectId: string | null, currentStatus?: string) {
  const isTransitioning = currentStatus === 'crawling' || currentStatus === 'discovering'
  
  return useQuery({
    queryKey: ['backlink-analytics', projectId],
    queryFn: () => fetchAnalytics(projectId!),
    enabled: !!projectId,
    refetchInterval: isTransitioning ? 5_000 : 30_000, // auto-refresh every 5s while crawling
    staleTime: isTransitioning ? 2_000 : 15_000,
  })
}

export function useDiscover(projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => triggerDiscover(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlink-projects'] })
      queryClient.invalidateQueries({ queryKey: ['backlink-analytics', projectId] })
    },
  })
}

export function useStopCrawl(projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => stopCrawl(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlink-projects'] })
      queryClient.invalidateQueries({ queryKey: ['backlink-analytics', projectId] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlink-projects'] })
    },
  })
}

