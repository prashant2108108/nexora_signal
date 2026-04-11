import React from 'react';
import { createClient } from '@/shared/lib/supabase/server';
import { MessageCircle, User, Clock, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Instagram Messages | Nexora Signal',
  description: 'View and manage your Instagram messaging history.',
};

export default async function InstagramMessagesPage() {
  const supabase = await createClient();
  
  // Fetch messages from Supabase
  const { data: messages, error } = await supabase
    .from('instagram_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching messages:', JSON.stringify(error, null, 2));
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Instagram Messages</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Automated replies and conversation history from your Instagram account.
          </p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
          <MessageCircle className="w-6 h-6" />
        </div>
      </div>

      <div className="grid gap-6">
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-900/30 p-8 text-center">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-400">Database connection error</h3>
            <p className="text-red-700 dark:text-red-500 mt-2 max-w-md mx-auto">
              We couldn't reach the messages table. Please ensure the <code>instagram_messages</code> table exists in your Supabase database and that your environment variables are correctly configured.
            </p>
            <div className="mt-6">
              <code className="block p-4 bg-slate-950 text-slate-300 rounded-lg text-xs text-left overflow-auto max-h-40">
                {JSON.stringify(error, null, 2)}
              </code>
            </div>
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 mb-4">
              <MessageCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No messages yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
              Once your Instagram account starts receiving messages via the webhook, they will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sender / Time</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Incoming Message</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Automated Response</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {messages.map((msg: any) => (
                  <tr key={msg.id} className="group hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{msg.sender_id}</div>
                          <div className="text-xs text-slate-500 flex items-center mt-0.5">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(msg.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate group-hover:max-w-none group-hover:whitespace-normal transition-all">
                        {msg.message}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-2">
                        <div className="mt-1 w-2 h-2 rounded-full bg-green-500 shrink-0" />
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {msg.response}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Replied
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
