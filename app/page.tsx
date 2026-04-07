'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScriptCard from '@/components/generate/ScriptCard';
import CreatorSelector from '@/components/generate/CreatorSelector';
import SkeletonCard from '@/components/ui/SkeletonCard';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface Creator {
  id: number;
  creator_name: string;
  description: string;
  prompt_modifier: string;
  category: string;
  example_hook: string;
}

interface Script {
  id: number;
  hook: string;
  body: string;
  cta: string;
  pillar: string;
  confidence_score: number;
  confidence_reason: string;
  caption?: string;
  hashtags?: string;
}

const PILLAR_COLORS: Record<string, string> = {
  Mindset: '#7C3AED',
  Sales: '#2563EB',
  Money: '#16A34A',
  'Real Estate': '#EA580C',
  Operations: '#475569',
  Other: '#374151',
};

export default function GeneratePage() {
  const [mode, setMode] = useState<'youtube' | 'original'>('youtube');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [trendText, setTrendText] = useState('');
  const [recentTrends, setRecentTrends] = useState<Array<{ trend_text: string }>>([]);
  const [showTrendDropdown, setShowTrendDropdown] = useState(false);

  // YouTube mode
  const [ytUrl, setYtUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [ytTitle, setYtTitle] = useState('');
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [fetchingTranscript, setFetchingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState('');

  // Generation
  const [generating, setGenerating] = useState(false);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [error, setError] = useState('');

  // Original mode
  const [pillarStats, setPillarStats] = useState<Array<{ name: string; value: number }>>([]);
  const [suggestedPillar, setSuggestedPillar] = useState('');

  useEffect(() => {
    fetch('/api/creators').then(r => r.json()).then(d => setCreators(d.creators || []));
    fetch('/api/trends').then(r => r.json()).then(d => setRecentTrends(d.trends || []));
  }, []);

  useEffect(() => {
    if (mode === 'original') loadPillarStats();
  }, [mode]);

  const loadPillarStats = async () => {
    const res = await fetch('/api/library?status=saved');
    const data = await res.json();
    const saved: Script[] = data.scripts || [];
    const counts: Record<string, number> = {};
    for (const s of saved) {
      counts[s.pillar] = (counts[s.pillar] || 0) + 1;
    }
    const stats = Object.entries(counts).map(([name, value]) => ({ name, value }));
    setPillarStats(stats);
    const allPillars = ['Mindset', 'Sales', 'Money', 'Real Estate', 'Operations', 'Other'];
    const missing = allPillars.find(p => !counts[p] || counts[p] === 0);
    const least = [...allPillars].sort((a, b) => (counts[a] || 0) - (counts[b] || 0))[0];
    setSuggestedPillar(missing || least || '');
  };

  const handleFetchTranscript = async () => {
    if (!ytUrl.trim()) return;
    setFetchingTranscript(true);
    setTranscriptError('');
    try {
      const res = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ytUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTranscript(data.transcript);
      setYtTitle(data.title || '');
    } catch (e) {
      setTranscriptError(e instanceof Error ? e.message : 'Failed to fetch transcript');
    } finally {
      setFetchingTranscript(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedCreator) { setError('Select a creator voice'); return; }
    if (mode === 'youtube' && !transcript) { setError('Fetch a YouTube transcript first'); return; }
    setGenerating(true);
    setError('');
    setScripts([]);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          transcript: mode === 'youtube' ? transcript : undefined,
          voice: selectedCreator.creator_name,
          voiceModifier: selectedCreator.prompt_modifier,
          energyLevel,
          trendText: trendText || undefined,
          sourceUrl: ytUrl || undefined,
          youtubeTitle: ytTitle || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setScripts(data.scripts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleRemixed = (newScript: Script) => {
    setScripts(prev => [newScript, ...prev]);
  };

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-5xl tracking-widest text-[#F5F5F0] mb-1">GENERATE</h1>
        <p className="text-sm text-[#6B6B6B] font-mono">Turn any content into high-converting Reel scripts</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-0 mb-8 w-fit border border-[#2A2A2A]">
        {(['youtube', 'original'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-6 py-2.5 text-sm font-mono tracking-wider transition-all ${
              mode === m
                ? 'bg-[#F59E0B] text-black font-bold'
                : 'text-[#6B6B6B] hover:text-[#F5F5F0] bg-[#0D0D0D]'
            }`}
          >
            {m === 'youtube' ? '▶ YOUTUBE MODE' : '✦ ORIGINAL MODE'}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {mode === 'youtube' ? (
            <motion.div
              key="youtube"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[11px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-2">YouTube URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={ytUrl}
                    onChange={e => setYtUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleFetchTranscript()}
                    placeholder="https://youtube.com/watch?v=..."
                    className="flex-1 bg-[#0D0D0D] border border-[#2A2A2A] px-4 py-2.5 text-sm text-[#F5F5F0] font-mono placeholder-[#3A3A3A] focus:outline-none focus:border-[#F59E0B] transition-colors"
                  />
                  <button
                    onClick={handleFetchTranscript}
                    disabled={fetchingTranscript || !ytUrl}
                    className="px-5 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] text-sm text-[#F5F5F0] font-mono hover:bg-[#F59E0B]/10 hover:border-[#F59E0B] hover:text-[#F59E0B] transition-all disabled:opacity-40"
                  >
                    {fetchingTranscript ? 'FETCHING...' : 'FETCH'}
                  </button>
                </div>
                {transcriptError && <p className="text-red-500 text-xs font-mono mt-1">{transcriptError}</p>}
              </div>
              {ytTitle && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                  <span className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest">Video:</span>
                  <span className="text-sm text-[#F5F5F0] font-medium">{ytTitle}</span>
                </motion.div>
              )}
              {transcript && (
                <div className="bg-[#0D0D0D] border border-[#1E1E1E]">
                  <button
                    onClick={() => setTranscriptExpanded(!transcriptExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 text-[11px] font-mono text-[#6B6B6B] hover:text-[#F5F5F0] transition-colors"
                  >
                    <span>TRANSCRIPT ({transcript.length.toLocaleString()} chars)</span>
                    <span>{transcriptExpanded ? '▲' : '▼'}</span>
                  </button>
                  <AnimatePresence>
                    {transcriptExpanded && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <p className="px-4 pb-4 text-xs text-[#6B6B6B] font-mono leading-relaxed max-h-40 overflow-y-auto">
                          {transcript.slice(0, 1200)}...
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="original"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {pillarStats.length > 0 ? (
                <div className="flex gap-8 items-center flex-wrap">
                  <div className="w-36 h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pillarStats} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                          {pillarStats.map((entry, i) => (
                            <Cell key={i} fill={PILLAR_COLORS[entry.name] || '#374151'} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#141414', border: '1px solid #2A2A2A', fontSize: 11, fontFamily: 'monospace' }} itemStyle={{ color: '#F5F5F0' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5">
                    {pillarStats.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2" style={{ background: PILLAR_COLORS[s.name] || '#374151' }} />
                        <span className="text-xs font-mono text-[#6B6B6B]">{s.name}</span>
                        <span className="text-xs font-mono text-[#F5F5F0]">{s.value}</span>
                      </div>
                    ))}
                  </div>
                  {suggestedPillar && (
                    <div className="flex-1 min-w-48 bg-[#F59E0B]/5 border border-[#F59E0B]/20 px-4 py-3">
                      <p className="text-[10px] text-[#F59E0B] font-mono uppercase tracking-widest mb-1">Suggested Next</p>
                      <p className="text-sm text-[#F5F5F0]">
                        You haven't posted much about <strong className="text-[#F59E0B]">{suggestedPillar}</strong> lately
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#0D0D0D] border border-[#1E1E1E] px-4 py-3">
                  <p className="text-sm text-[#6B6B6B] font-mono">Save some scripts first to see your pillar distribution</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trend Injection */}
        <div className="relative">
          <label className="block text-[11px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-2">
            Trend Injection <span className="text-[#3A3A3A]">— optional</span>
          </label>
          <input
            type="text"
            value={trendText}
            onChange={e => { setTrendText(e.target.value); setShowTrendDropdown(true); }}
            onFocus={() => setShowTrendDropdown(true)}
            onBlur={() => setTimeout(() => setShowTrendDropdown(false), 150)}
            placeholder="e.g. tariffs, AI replacing jobs, housing crash"
            className="w-full bg-[#0D0D0D] border border-[#2A2A2A] px-4 py-2.5 text-sm text-[#F5F5F0] font-mono placeholder-[#3A3A3A] focus:outline-none focus:border-[#F59E0B] transition-colors"
          />
          {showTrendDropdown && recentTrends.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-[#141414] border border-[#2A2A2A] z-10 max-h-40 overflow-y-auto">
              {recentTrends.map((t, i) => (
                <button
                  key={i}
                  onClick={() => { setTrendText(t.trend_text); setShowTrendDropdown(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-mono text-[#6B6B6B] hover:bg-[#1E1E1E] hover:text-[#F5F5F0] transition-colors"
                >
                  {t.trend_text}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Creator Voice */}
        <div>
          <label className="block text-[11px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-2">Creator Voice</label>
          <CreatorSelector creators={creators} selected={selectedCreator?.creator_name || ''} onSelect={c => setSelectedCreator(c)} />
        </div>

        {/* Energy Level */}
        <div>
          <label className="block text-[11px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-3">
            Energy Level — <span className="text-[#F59E0B]">{energyLevel}/10</span>
          </label>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[#6B6B6B] font-mono whitespace-nowrap">Calm & Educational</span>
            <input type="range" min={1} max={10} value={energyLevel} onChange={e => setEnergyLevel(Number(e.target.value))} className="flex-1" />
            <span className="text-[11px] text-[#6B6B6B] font-mono whitespace-nowrap">Raw & Aggressive</span>
          </div>
        </div>

        {/* Generate Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-4 bg-[#F59E0B] text-black font-display text-2xl tracking-widest hover:bg-[#D97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? 'GENERATING...' : mode === 'youtube' ? 'GENERATE SCRIPTS' : 'GENERATE ORIGINAL SCRIPTS'}
        </motion.button>

        {error && (
          <div className="bg-red-950/30 border border-red-900 px-4 py-3">
            <p className="text-red-400 text-sm font-mono">{error}</p>
          </div>
        )}
      </div>

      {/* Scripts Output */}
      <AnimatePresence>
        {(generating || scripts.length > 0) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10">
            <h2 className="font-display text-2xl tracking-widest text-[#F5F5F0] mb-4">
              {generating ? 'GENERATING...' : `${scripts.length} SCRIPTS GENERATED`}
            </h2>
            <div className="space-y-4">
              {generating
                ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
                : scripts.map((script, i) => (
                    <ScriptCard
                      key={script.id || i}
                      script={script}
                      voiceModifier={selectedCreator?.prompt_modifier || ''}
                      energyLevel={energyLevel}
                      voice={selectedCreator?.creator_name || ''}
                      onRemixed={handleRemixed}
                    />
                  ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
