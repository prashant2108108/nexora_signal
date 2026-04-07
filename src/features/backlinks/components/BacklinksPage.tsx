'use client'

import { useState } from 'react'
import { useProjects, useAnalytics, useDiscover, useStopCrawl, useDeleteProject } from '../hooks/useBacklinks'
import { BacklinkProject, BacklinkFilters } from '../api/backlinks-service'
import { AnalyticsCards } from './AnalyticsCards'
import { BacklinkTable } from './BacklinkTable'
import { NewProjectModal } from './NewProjectModal'
import { DomainsModal } from './DomainsModal'
import { Trash2, X, Loader2 } from 'lucide-react'

const statusColors: Record<string, string> = {
  idle: 'bg-gray-100 text-gray-600',
  discovering: 'bg-blue-100 text-blue-600',
  crawling: 'bg-indigo-100 text-indigo-600 animate-pulse',
  done: 'bg-emerald-100 text-emerald-600',
  failed: 'bg-rose-100 text-rose-600',
}

export function BacklinksPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDomainsModal, setShowDomainsModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [filters, setFilters] = useState<BacklinkFilters>({ page: 1, limit: 50 })

  const { data: projects, isLoading: loadingProjects } = useProjects()
  const deleteProjectMutation = useDeleteProject()
  const selectedProject = projects?.find(p => p.id === selectedProjectId)

  const { data: analytics, isLoading: loadingAnalytics } = useAnalytics(selectedProjectId, selectedProject?.status)
  const { mutate: discover, isPending: discovering } = useDiscover(selectedProjectId)
  const { mutate: stopCrawl, isPending: stopping } = useStopCrawl(selectedProjectId)

  const handleProjectCreated = (id: string) => {
    setSelectedProjectId(id)
    setShowModal(false)
  }

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProjectMutation.mutateAsync(id)
      if (selectedProjectId === id) {
        setSelectedProjectId(projects?.find(p => p.id !== id)?.id || null)
      }
      setProjectToDelete(null)
    } catch (error) {
      console.error('Failed to delete project:', error)
      alert('Failed to delete project')
    }
  }

  const handleStatClick = (type: 'total' | 'domains' | 'dofollow' | 'nofollow') => {
    if (type === 'domains') {
      setShowDomainsModal(true)
      return
    }

    const newFilters: BacklinkFilters = { ...filters, page: 1, domain: undefined }
    if (type === 'dofollow') newFilters.nofollow = 'false'
    else if (type === 'nofollow') newFilters.nofollow = 'true'
    else if (type === 'total') newFilters.nofollow = undefined

    setFilters(newFilters)
    document.getElementById('backlinks-table')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSelectDomain = (domain: string) => {
    setFilters({ ...filters, page: 1, domain, nofollow: undefined })
    setShowDomainsModal(false)
    document.getElementById('backlinks-table')?.scrollIntoView({ behavior: 'smooth' })
  }

  const isProjectActive = selectedProject?.status === 'crawling' || selectedProject?.status === 'discovering'

  return (
    <>
      {showModal && (
        <NewProjectModal
          onCreated={handleProjectCreated}
          onClose={() => setShowModal(false)}
        />
      )}

      {showDomainsModal && analytics && (
        <DomainsModal
          analytics={analytics}
          onSelectDomain={handleSelectDomain}
          onClose={() => setShowDomainsModal(false)}
        />
      )}

      {projectToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-red-100 rounded-full text-red-600">
                <Trash2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Delete Project?</h3>
                <p className="text-slate-500 mt-2 text-sm">
                  This will permanently remove <b>{projects?.find(p => p.id === projectToDelete)?.domain}</b> and all captured backlinks.
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setProjectToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteProject(projectToDelete)}
                  disabled={deleteProjectMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                >
                  {deleteProjectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Backlink Analyzer</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Discover and track backlinks pointing to your domain
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + New Project
          </button>
        </div>

        {loadingProjects ? (
          <div className="h-12 bg-gray-100 animate-pulse rounded-xl" />
        ) : !projects?.length ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">🔗</div>
            <p className="font-medium text-gray-600 text-lg">No projects yet</p>
            <p className="text-sm mt-1">Create your first project to start crawling backlinks</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 transition-colors"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="flex gap-3 flex-wrap items-center">
            <span className="text-sm font-medium text-gray-500">Project:</span>
            {projects.map((p: BacklinkProject) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProjectId(p.id)
                  setFilters({ page: 1, limit: 50 })
                }}
                className={`group px-4 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-2 relative pr-10 ${
                  selectedProjectId === p.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {p.domain}
                <span className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full ${statusColors[p.status] ?? ''}`}>
                  {p.status}
                </span>
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setProjectToDelete(p.id)
                  }}
                  className={`absolute right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${selectedProjectId === p.id ? 'hover:bg-indigo-500' : 'hover:bg-gray-100'}`}
                >
                  <X className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedProjectId && (
          <>
            <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <div>
                <p className="font-semibold text-gray-700">{selectedProject?.domain}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${isProjectActive ? 'bg-indigo-500 animate-ping' : 'bg-gray-300'}`} />
                  <p className="text-xs text-gray-400">
                    {selectedProject?.status === 'crawling'
                      ? 'Worker is active — updating live'
                      : selectedProject?.status === 'discovering'
                      ? 'Discovering initial backlinks...'
                      : selectedProject?.status === 'done'
                      ? 'Crawl complete'
                      : 'Ready to discover'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                {isProjectActive && (
                  <button
                    onClick={() => stopCrawl()}
                    disabled={stopping}
                    className="px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium hover:bg-rose-100 transition-colors disabled:opacity-50"
                  >
                    {stopping ? 'Stopping...' : 'Stop Crawling'}
                  </button>
                )}
                <button
                  onClick={() => discover()}
                  disabled={discovering || isProjectActive}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {discovering ? '🔍 Discovering…' : '🚀 Discover & Crawl'}
                </button>
              </div>
            </div>

            {/* Analytics */}
            {analytics ? (
              <AnalyticsCards 
                analytics={analytics} 
                isLoading={loadingAnalytics} 
                onCardClick={handleStatClick}
              />
            ) : loadingAnalytics ? (
              <AnalyticsCards analytics={{} as any} isLoading />
            ) : null}

            {/* Backlinks Table */}
            <BacklinkTable 
              projectId={selectedProjectId} 
              filters={filters}
              onFilterChange={setFilters}
              onApply={() => {}}
            />
          </>
        )}
      </div>
    </>
  )
}
