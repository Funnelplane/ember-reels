'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScriptCard from '@/components/generate/ScriptCard';
import SkeletonCard from '@/components/ui/SkeletonCard';

interface Script {
  id: number;
  hook: string;
  body: string;
  cta: string;
  pillar: string;
  voice: string;
  source_type: string;
  source_url?: string;
  youtube_title?: string;
  confidence_score: number;
  confidence_reason: string;
  status: string;
  caption?: string;
  hashtags?: string;
  created_at: string;
}

const PILLARS = ['', 'Mindset', 'Sales', 'Money', 'Real Estate', 'Operations', 'Other'];
const SOURCES = ['', 'youtube', 'original'];

export default function LibraryPage() {
  const [tab, setTab] = useState<'saved' | 'graveyard'>('saved');
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [pillar, setPillar] = useState('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadScripts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: tab });
    if (pillar) params.set('pillar', pillar);
    if (source) params.set('source', source);
    if (search) params.set('search', search);
    const res = await fetch(`/api/library?${params}`);
    const data = await res.json();
    setScripts(data.scripts || []);
    setLoading(false);
  }, [tab, pillar, source, search]);

  useEffect(() => {
    const t = setTimeout(loadScripts, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [loadScripts, search]);

  const handleStatusChange = (id: number, newStatus: string) => {
    setScripts(prev => prev.filter(s => s.id !== id));
  };

  const handleDelete = async (id: number) => {
    await fetch('/api/library', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setScripts(prev => prev.filter(s => s.id !== id));
  };

  const handleSchedule = async (scriptId: number, date: string) => {
    await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptId, scheduledDate: date }),
    });
    loadScripts();
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-5xl tracking-widest text-[#F5F5F0] mb-1">SCRIPT LIBRARY</h1>
        <p className="text-sm text-[#6B6B6B] font-mono">{scripts.length} scripts</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 w-fit border border-[#2A2A2A]">
        {(['saved', 'graveyard'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-mono tracking-wider transition-all ${
              tab === t ? 'bg-[#F59E0B] text-black font-bold' : 'text-[#6B6B6B] hover:text-[#F5F5F0] bg-[#0D0D0D]'
            }`}
          >
            {t === 'saved' ? '📁 SAVED' : '🗑️ GRAVEYARD'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search hooks & bodies..."
          className="flex-1 min-w-48 bg-[#0D0D0D] border border-[#2A2A2A] px-4 py-2 text-sm text-[#F5F5F0] font-mono placeholder-[#3A3A3A] focus:outline-none focus:border-[#F59E0B] transition-colors"
        />
        <select
          value={pillar}
          onChange={e => setPillar(e.target.value)}
          className="bg-[#0D0D0D] border border-[#2A2A2A] px-3 py-2 text-sm text-[#6B6B6B] font-mono focus:outline-none focus:border-[#F59E0B]"
        >
          {PILLARS.map(p => <option key={p} value={p}>{p || 'All Pillars'}</option>)}
        </select>
        <select
          value={source}
          onChange={e => setSource(e.target.value)}
          className="bg-[#0D0D0D] border border-[#2A2A2A] px-3 py-2 text-sm text-[#6B6B6B] font-mono focus:outline-none focus:border-[#F59E0B]"
        >
          {SOURCES.map(s => <option key={s} value={s}>{s ? s.toUpperCase() : 'All Sources'}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="columns-1 md:columns-2 xl:columns-3 gap-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : scripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="font-display text-3xl tracking-widest text-[#2A2A2A] mb-2">EMPTY</p>
          <p className="text-sm text-[#6B6B6B] font-mono">
            {tab === 'saved' ? 'Generate and save scripts to see them here' : 'No graveyard scripts yet'}
          </p>
        </div>
      ) : (
        <div className="columns-1 lg:columns-2 xl:columns-3 gap-4">
          {scripts.map(script => (
            <div key={script.id} className="break-inside-avoid mb-4">
              <LibraryScriptCard
                script={script}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onSchedule={handleSchedule}
                expanded={expandedId === script.id}
                onToggle={() => setExpandedId(expandedId === script.id ? null : script.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryScriptCard({
  script,
  onStatusChange,
  onDelete,
  onSchedule,
  expanded,
  onToggle,
}: {
  script: Script;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onSchedule: (id: number, date: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [remixing, setRemixing] = useState(false);

  const PILLAR_COLORS: Record<string, string> = {
    Mindset: 'bg-purple-900/30 text-purple-400 border-purple-800',
    Sales: 'bg-blue-900/30 text-blue-400 border-blue-800',
    Money: 'bg-green-900/30 text-green-400 border-green-800',
    'Real Estate': 'bg-orange-900/30 text-orange-400 border-orange-800',
    Operations: 'bg-slate-800/50 text-slate-400 border-slate-700',
    Other: 'bg-[#1E1E1E] text-[#6B6B6B] border-[#2A2A2A]',
  };

  const handleMove = async (status: string) => {
    await fetch('/api/library', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: script.id, updates: { status } }),
    });
    onStatusChange(script.id, status);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#141414] border border-[#1E1E1E] hover:border-[#2A2A2A] transition-all cursor-pointer"
    >
      <div className="p-4" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 border font-mono ${PILLAR_COLORS[script.pillar] || PILLAR_COLORS['Other']}`}>
              {script.pillar}
            </span>
            <span className="text-[10px] text-[#3A3A3A] font-mono uppercase">{script.source_type}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#0A0A0A] border border-[#2A2A2A] flex-shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${script.confidence_score >= 7 ? 'bg-[#F59E0B]' : 'bg-[#6B6B6B]'}`} />
            <span className="text-[10px] font-mono text-[#F5F5F0]">{script.confidence_score}/10</span>
          </div>
        </div>
        <p className="text-sm text-[#F5F5F0] font-bold leading-snug line-clamp-2">{script.hook}</p>
        {script.voice && <p className="text-[10px] text-[#6B6B6B] font-mono mt-1">{script.voice}</p>}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[#1E1E1E]"
          >
            <div className="p-4 space-y-3">
              <div>
                <p className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-1">Body</p>
                <p className="text-xs text-[#C0C0BC] font-mono leading-relaxed whitespace-pre-wrap">{script.body}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-1">CTA</p>
                <p className="text-xs text-[#F59E0B] font-mono">{script.cta}</p>
              </div>
              {script.source_url && (
                <p className="text-[10px] text-[#3A3A3A] font-mono truncate">{script.source_url}</p>
              )}
              {/* Actions */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {script.status === 'saved' && (
                  <>
                    <button
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="text-[10px] px-2 py-1 border border-[#2A2A2A] text-[#6B6B6B] hover:border-[#F59E0B] hover:text-[#F59E0B] font-mono transition-all"
                    >
                      📅 SCHEDULE
                    </button>
                    <button
                      onClick={() => handleMove('graveyard')}
                      className="text-[10px] px-2 py-1 border border-[#2A2A2A] text-[#6B6B6B] hover:border-red-900 hover:text-red-600 font-mono transition-all"
                    >
                      🗑️ GRAVEYARD
                    </button>
                  </>
                )}
                {script.status === 'graveyard' && (
                  <button
                    onClick={() => handleMove('saved')}
                    className="text-[10px] px-2 py-1 border border-[#2A2A2A] text-[#6B6B6B] hover:border-green-700 hover:text-green-500 font-mono transition-all"
                  >
                    ↩ RESTORE
                  </button>
                )}
                <button
                  onClick={async () => {
                    setRemixing(true);
                    const res = await fetch('/api/remix', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ scriptId: script.id, voiceModifier: script.voice, energyLevel: 5, voice: script.voice }),
                    });
                    setRemixing(false);
                    if (res.ok) window.location.reload();
                  }}
                  disabled={remixing}
                  className="text-[10px] px-2 py-1 border border-[#2A2A2A] text-[#6B6B6B] hover:border-blue-700 hover:text-blue-500 font-mono transition-all"
                >
                  {remixing ? '...' : '🔁 REMIX'}
                </button>
                <button
                  onClick={() => onDelete(script.id)}
                  className="text-[10px] px-2 py-1 border border-[#2A2A2A] text-[#6B6B6B] hover:border-red-900 hover:text-red-600 font-mono transition-all"
                >
                  DELETE
                </button>
              </div>
              {showDatePicker && (
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="bg-[#0D0D0D] border border-[#2A2A2A] px-3 py-1 text-xs text-[#F5F5F0] font-mono focus:outline-none focus:border-[#F59E0B]"
                  />
                  <button
                    onClick={() => { if (scheduleDate) { onSchedule(script.id, scheduleDate); setShowDatePicker(false); } }}
                    className="text-[10px] px-3 py-1 bg-[#F59E0B] text-black font-mono font-bold"
                  >
                    CONFIRM
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
