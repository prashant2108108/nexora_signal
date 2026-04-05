'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const getURL = () => {
  // Use environment variables if they exist
  let url = process?.env?.NEXT_PUBLIC_SITE_URL ?? process?.env?.NEXT_PUBLIC_VERCEL_URL
  
  if (url) {
    // Ensure the URL starts with https:// unless it's localhost
    if (!url.startsWith('http')) {
      url = `https://${url}`
    }
  } else {
    // Fallback if no environment variables are found
    url = process.env.NODE_ENV === 'production' 
      ? 'https://nexora-signal-rouge.vercel.app' 
      : 'http://localhost:3000'
  }
  
  // Ensure there's a trailing slash
  return url.endsWith('/') ? url : `${url}/`
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    // Should pass the error message to the client, but throwing it or returning it works
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  try {
    const { error } = await supabase.auth.signUp({
      ...data,
      options: {
        redirectTo: `${getURL()}auth/callback`,
      },
    })

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } catch (err: any) {
    if (err?.id === 'NEXT_REDIRECT') throw err
    return { error: err.message || 'An unexpected error occurred during signup' }
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
