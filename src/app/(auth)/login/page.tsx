import React from 'react'

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-zinc-950">
      <div className="w-full max-w-md p-8 bg-zinc-50 dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold text-center mb-6">Welcome back</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-center mb-8">Sign in to Nexora Signal.</p>
        
        {/* Placeholder form */}
        <form className="space-y-4">
           <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input type="email" className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="name@company.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex justify-between">
              Password
              <a href="#" className="text-xs text-blue-600 hover:underline">Forgot?</a>
            </label>
            <input type="password" placeholder="••••••••" className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
            Log in
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          Don't have an account? <a href="/signup" className="text-blue-600 hover:underline">Sign up</a>
        </div>
      </div>
    </div>
  )
}
