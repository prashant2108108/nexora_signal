'use client'

import { useState } from 'react'
import { useCreateProject } from '../hooks/useBacklinks'

interface Props {
  onCreated: (projectId: string) => void
  onClose: () => void
}

export function NewProjectModal({ onCreated, onClose }: Props) {
  const [domain, setDomain] = useState('')
  const { mutate: create, isPending, error } = useCreateProject()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!domain.trim()) return
    create(domain.trim(), {
      onSuccess: (project) => onCreated(project.id),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">New Backlink Project</h2>
            <p className="text-sm text-gray-500 mt-1">
              Enter the target domain you want to analyze backlinks for.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="domain" className="text-sm font-medium text-gray-700">
              Target Domain
            </label>
            <input
              id="domain"
              type="text"
              placeholder="example.com"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              required
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-gray-400">
              Just the domain — no http://, no www, no paths.
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">
              {(error as Error).message}
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
