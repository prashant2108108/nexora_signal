import React from 'react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Nexora Signal</h1>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <a href="/login" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Log in</a>
          <a href="/signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-transform hover:scale-105">Get Started</a>
        </nav>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-blue-600/20 mb-4">
            New: Content Generation V2 is now live
          </span>
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Discover signals before they become <span className="text-blue-600">trends.</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Nexora Signal empowers creators and businesses to stay ahead of the curve with real-time trend detection, AI content generation, and competitor analysis.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href="/signup" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl shadow-xl shadow-blue-500/20">
              Start for Free
            </a>
            <a href="#features" className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 transition-colors">
              Explore Demo
            </a>
          </div>
        </div>
      </main>
      
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-slate-500 dark:text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} Nexora Signal. All rights reserved. Built with Next.js and Supabase.
        </p>
      </footer>
    </div>
  )
}
