import React from 'react'

export default function CompetitorsPage() {
  return (
    <div className='p-8 min-h-screen bg-white dark:bg-zinc-950 px-8'>
      <h1 className='text-3xl font-bold text-zinc-900 dark:text-zinc-50'>Competitor Analyzer</h1>
      <p className='mt-2 text-zinc-500 dark:text-zinc-400'>Monitor your competitors' latest updates and strategies.</p>
      
      <div className='mt-12 space-y-6'>
         <div className='p-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl'>
            <div className='max-w-2xl text-center mx-auto py-12'>
               <h3 className='text-xl font-bold'>Track your first competitor</h3>
               <p className='mt-2 text-zinc-400'>Add a URL or company name to start monitoring their public signals.</p>
               <div className='mt-6 flex flex-col sm:flex-row gap-3 justify-center'>
                  <input type='text' className='w-full sm:w-64 p-3 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-blue-500' placeholder='example.com' />
                  <button className='px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl'>Add Competitor</button>
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
