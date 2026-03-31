import React from 'react'

export default function ContentPage() {
  return (
    <div className='p-8 min-h-screen bg-white dark:bg-zinc-950'>
      <h1 className='text-3xl font-bold text-zinc-900 dark:text-zinc-50'>Content Generator</h1>
      <p className='mt-2 text-zinc-500 dark:text-zinc-400'>Generate AI-powered content signals and drafts.</p>
      
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12'>
          <div className='p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900'>
             <div className='w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-4'>
                <svg className='text-white w-6 h-6' viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
             </div>
             <h2 className='text-xl font-semibold mb-2'>AI Drafts</h2>
             <p className='text-sm text-zinc-500'>Generate drafts for LinkedIn, Twitter, and Blog posts based on trending signals.</p>
          </div>
      </div>
    </div>
  )
}
