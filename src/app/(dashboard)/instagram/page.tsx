import React from 'react';
import { createClient } from '@/shared/lib/supabase/server';
import { 
  MessageCircle, 
  User, 
  Clock, 
  CheckCircle2, 
  BarChart3, 
  Image as ImageIcon, 
  Heart,
  MessageSquare
} from 'lucide-react';
import SyncButton from './SyncButton';

export const metadata = {
  title: 'Instagram Analytics | Nexora Signal',
  description: 'Manage messages, media, and performance insights.',
};

export default async function InstagramDashboardPage() {
  const supabase = await createClient();
  
  // Fetch everything in parallel
  const [
    { data: messages, error: messagesError },
    { data: media, error: mediaError },
    { data: insights, error: insightsError },
    { data: comments },
    { data: replies }
  ] = await Promise.all([
    supabase.from('instagram_messages').select('*').order('created_at', { ascending: false }),
    supabase.from('instagram_media').select('*').order('timestamp', { ascending: false }),
    supabase.from('instagram_insights').select('*').order('end_time', { ascending: false }).limit(20),
    supabase.from('instagram_comments').select('*').order('timestamp', { ascending: false }),
    supabase.from('instagram_comment_replies').select('*').order('timestamp', { ascending: false })
  ]);


  console.log('[Instagram Dashboard] Data Summary:', {
    messagesCount: messages?.length || 0,
    mediaCount: media?.length || 0,
    insightsCount: insights?.length || 0,
    errors: { messagesError, mediaError, insightsError }
  });


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Instagram Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Messages, Media Performance, and Growth Insights.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SyncButton />
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-slate-500 dark:text-zinc-400 text-sm font-medium">Total Messages</div>
            <MessageCircle className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{messages?.length || 0}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-slate-500 dark:text-zinc-400 text-sm font-medium">Media Posts</div>
            <ImageIcon className="w-4 h-4 text-pink-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{media?.length || 0}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-slate-500 dark:text-zinc-400 text-sm font-medium">Avg Engagement</div>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {media?.length ? Math.round(media.reduce((acc: number, m: any) => acc + (m.like_count || 0), 0) / media.length) : 0}
          </div>
        </div>
      </div>

      {/* Media Gallery */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-pink-500" />
          Recent Media performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {media?.slice(0, 4).map((item: any) => (
            <div key={item.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm group">

              <div className="aspect-square bg-slate-100 dark:bg-zinc-800 relative">
                {item.media_url && (
                  <img src={item.media_url} alt={item.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-lg text-[10px] text-white font-bold uppercase tracking-wider">
                  {item.media_type.replace('_', ' ')}
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-zinc-800">
                <p className="text-sm text-slate-600 dark:text-zinc-400 line-clamp-2 mb-3 h-10">
                  {item.caption || 'No caption'}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-500" /> {item.like_count}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-blue-500" /> {item.comments_count}</span>
                  </div>
                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages Table */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-purple-500" />
          Recent Interactions
        </h2>
        {!messages || messages.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center">
            <p className="text-slate-500 dark:text-zinc-400">No messages found. Sync to fetch latest data.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Sender / Time</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Incoming Message</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Automated Response</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {messages.slice(0, 5).map((msg: any) => (
                  <tr key={msg.id} className="group hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600">
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
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-zinc-300">{msg.message}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-zinc-300">{msg.response}</td>
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
      {/* Comments Section */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          Post Comments & Replies
        </h2>
        {!comments || comments.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 text-center">
            <p className="text-slate-500 dark:text-zinc-400">No comments synced yet. Click &quot;Sync Now&quot; to fetch.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-zinc-800">
            {comments.map((c: any) => {
              const post = media?.find((m: any) => m.ig_id === c.media_id);
              const commentReplies = replies?.filter((r: any) => r.comment_id === c.ig_id) || [];
              return (
                <div key={c.id} className="px-6 py-4">
                  {/* Comment Row */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">@{c.username}</span>
                        {post && (
                          <a href={post.permalink} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
                            on &ldquo;{post.caption?.substring(0, 25) || 'post'}&rdquo;
                          </a>
                        )}
                        <span className="text-xs text-slate-400 ml-auto">{new Date(c.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-zinc-300 mt-1">{c.text}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" />{c.like_count || 0} likes</span>
                        {commentReplies.length > 0 && (
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-blue-400" />{commentReplies.length} replies</span>
                        )}
                      </div>
                      {/* Replies */}
                      {commentReplies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-slate-100 dark:border-zinc-700 space-y-3">
                          {commentReplies.map((r: any) => (
                            <div key={r.id} className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                <User className="w-3 h-3 text-slate-500" />
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">@{r.username}</span>
                                <p className="text-xs text-slate-600 dark:text-zinc-400">{r.text}</p>
                                <span className="text-[10px] text-slate-400">{new Date(r.timestamp).toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


