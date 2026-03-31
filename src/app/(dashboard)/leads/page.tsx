import React from 'react'

export default function LeadsPage() {
  return (
    <div className='p-8 min-h-screen bg-white dark:bg-zinc-950 px-8'>
      <h1 className='text-3xl font-bold text-zinc-900 dark:text-zinc-50'>Lead Finder</h1>
      <p className='mt-2 text-zinc-500 dark:text-zinc-400'>Find high-intent leads before they go to your competitors.</p>
      
      <div className='mt-12 bg-white dark:bg-zinc-900 p-10 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl flex flex-col items-center justify-center text-center'>
         <div className='w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-6'>
            <svg className='w-8 h-8' viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7h1v1h-1zm.5-4a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
         </div>
         <h2 className='text-2xl font-bold'>Unlock Hidden Leads</h2>
         <p className='mt-2 text-zinc-400 max-w-lg mx-auto'>Unlock access to real-time intent data and discovery of people asking for solutions in your domain.</p>
         <button className='mt-8 px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20'>Upgrade to Pro</button>
      </div>
    </div>
  )
}
