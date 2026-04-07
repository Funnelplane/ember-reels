'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StyleProfile {
  top_pillars: string[];
  preferred_energy: string;
  common_hook_patterns: string[];
  topics_to_explore: string[];
  patterns_to_avoid: string[];
}

interface StyleLearning {
  id: number;
  generated_at: string;
  profile_summary: string;
  script_count_at_generation: number;
}

interface Series {
  id: number;
  title: string;
  description: string;
  scripts: Array<{
    id: number;
    hook: string;
    pillar: string;
    voice: string;
  }>;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StyleLearning | null>(null);
  const [parsedProfile, setParsedProfile] = useState<StyleProfile | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [regenerating, setRegenerating] = useState(false);

  // Creator style analyzer
  const [analyzeText, setAnalyzeText] = useState('');
  const [analyzeName, setAnalyzeName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    hook_type: string;
    body_format: string;
    cta_style: string;
    energy_signature: string;
    prompt_modifier: string;
  } | null>(null);

  // Series builder
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [newSeriesTitle, setNewSeriesTitle] = useState('');
  const [newSeriesDesc, setNewSeriesDesc] = useState('');
  const [creatingSereis, setCreatingSeries] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    const res = await fetch('/api/profile');
    const data = await res.json();
    setProfile(data.profile || null);
    setSeries(data.series || []);
    if (data.profile?.profile_summary) {
      try {
        setParsedProfile(JSON.parse(data.profile.profile_summary));
      } catch { setParsedProfile(null); }
    }
    setLoading(false);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setParsedProfile(data.profile);
      loadProfile();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to regenerate profile');
    } finally {
      setRegenerating(false);
    }
  };

  const handleAnalyze = async () => {
    if (!analyzeText.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze-creator', text: analyzeText, name: analyzeName }),
      });
      const data = await res.json();
      setAnalysisResult(data.analysis);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateSeries = async () => {
    if (!newSeriesTitle.trim()) return;
    setCreatingSeries(true);
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-series', name: newSeriesTitle, description: newSeriesDesc }),
      });
      setNewSeriesTitle('');
      setNewSeriesDesc('');
      setShowNewSeries(false);
      loadProfile();
    } finally {
      setCreatingSeries(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display text-5xl tracking-widest text-[#F5F5F0] mb-1">STYLE PROFILE</h1>
        <p className="text-sm text-[#6B6B6B] font-mono">Your content DNA, analyzed</p>
      </div>

      {/* Style Profile Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl tracking-widest text-[#F5F5F0]">YOUR STYLE PROFILE</h2>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-4 py-2 bg-[#F59E0B] text-black font-mono text-xs font-bold hover:bg-[#D97706] transition-colors disabled:opacity-50"
          >
            {regenerating ? 'ANALYZING...' : '↺ REGENERATE PROFILE'}
          </motion.button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}
          </div>
        ) : parsedProfile ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProfileSection
              title="Top Pillars"
              items={parsedProfile.top_pillars}
              color="#F59E0B"
            />
            <ProfileSection
              title="Common Hook Patterns"
              items={parsedProfile.common_hook_patterns}
              color="#7C3AED"
            />
            <ProfileSection
              title="Topics to Explore"
              items={parsedProfile.topics_to_explore}
              color="#16A34A"
            />
            <ProfileSection
              title="Patterns to Avoid"
              items={parsedProfile.patterns_to_avoid}
              color="#DC2626"
            />
            <div className="md:col-span-2 bg-[#141414] border border-[#1E1E1E] p-4">
              <p className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-2">Preferred Energy</p>
              <p className="text-sm text-[#F5F5F0]">{parsedProfile.preferred_energy}</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] p-8 text-center">
            <p className="text-[#6B6B6B] font-mono text-sm mb-3">No profile generated yet</p>
            <p className="text-[#3A3A3A] font-mono text-xs">Save at least 3 scripts, then click Regenerate Profile</p>
          </div>
        )}

        {profile && (
          <p className="text-[10px] text-[#3A3A3A] font-mono mt-2">
            Generated from {profile.script_count_at_generation} scripts · {new Date(profile.generated_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Creator Style Analyzer */}
      <div className="mb-10">
        <h2 className="font-display text-2xl tracking-widest text-[#F5F5F0] mb-4">CREATOR STYLE ANALYZER</h2>
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] p-5 space-y-4">
          <p className="text-xs text-[#6B6B6B] font-mono">Paste any Reel script or transcript — Claude reverse-engineers the style and saves it as a template</p>
          <input
            type="text"
            value={analyzeName}
            onChange={e => setAnalyzeName(e.target.value)}
            placeholder="Style name (e.g. 'Gary Vee')"
            className="w-full bg-[#141414] border border-[#2A2A2A] px-4 py-2 text-sm text-[#F5F5F0] font-mono placeholder-[#3A3A3A] focus:outline-none focus:border-[#F59E0B] transition-colors"
          />
          <textarea
            value={analyzeText}
            onChange={e => setAnalyzeText(e.target.value)}
            rows={5}
            placeholder="Paste script or transcript here..."
            className="w-full bg-[#141414] border border-[#2A2A2A] px-4 py-2 text-sm text-[#F5F5F0] font-mono placeholder-[#3A3A3A] focus:outline-none focus:border-[#F59E0B] resize-none transition-colors"
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !analyzeText.trim()}
            className="px-5 py-2 bg-[#F59E0B] text-black font-mono text-xs font-bold hover:bg-[#D97706] transition-colors disabled:opacity-50"
          >
            {analyzing ? 'ANALYZING...' : 'ANALYZE STYLE'}
          </button>

          <AnimatePresence>
            {analysisResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-[#2A2A2A] p-4 space-y-3"
              >
                <p className="text-[10px] text-[#F59E0B] font-mono uppercase tracking-widest">Analysis Complete — Saved to Creator Styles</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['Hook Type', analysisResult.hook_type],
                    ['Body Format', analysisResult.body_format],
                    ['CTA Style', analysisResult.cta_style],
                    ['Energy Signature', analysisResult.energy_signature],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[9px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-0.5">{label}</p>
                      <p className="text-xs text-[#F5F5F0]">{value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Series Builder */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl tracking-widest text-[#F5F5F0]">SERIES BUILDER</h2>
          <button
            onClick={() => setShowNewSeries(!showNewSeries)}
            className="px-4 py-2 border border-[#2A2A2A] text-xs font-mono text-[#6B6B6B] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-all"
          >
            + NEW SERIES
          </button>
        </div>

        <AnimatePresence>
          {showNewSeries && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="bg-[#0D0D0D] border border-[#1E1E1E] p-4 space-y-3">
                <input
                  type="text"
                  value={newSeriesTitle}
                  onChange={e => setNewSeriesTitle(e.target.value)}
                  placeholder="Series title (e.g. 'The 5 Laws of Sales')"
                  className="w-full bg-[#141414] border border-[#2A2A2A] px-4 py-2 text-sm text-[#F5F5F0] font-mono placeholder-[#3A3A3A] focus:outline-none focus:border-[#F59E0B] transition-colors"
                />
                <input
                  type="text"
                  value={newSeriesDesc}
                  onChange={e => setNewSeriesDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full bg-[#141414] border border-[#2A2A2A] px-4 py-2 text-sm text-[#F5F5F0] font-mono placeholder-[#3A3A3A] focus:outline-none focus:border-[#F59E0B] transition-colors"
                />
                <button
                  onClick={handleCreateSeries}
                  disabled={creatingSereis || !newSeriesTitle.trim()}
                  className="px-5 py-2 bg-[#F59E0B] text-black font-mono text-xs font-bold hover:bg-[#D97706] transition-colors disabled:opacity-50"
                >
                  CREATE SERIES
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {series.length === 0 ? (
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] p-6 text-center">
            <p className="text-sm text-[#6B6B6B] font-mono">No series created yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {series.map(s => (
              <div key={s.id} className="bg-[#141414] border border-[#1E1E1E] p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-[#F5F5F0]">{s.title}</p>
                    {s.description && <p className="text-xs text-[#6B6B6B] font-mono mt-0.5">{s.description}</p>}
                  </div>
                  <span className="text-[10px] text-[#3A3A3A] font-mono">{s.scripts?.length || 0} parts</span>
                </div>
                {s.scripts && s.scripts.length > 0 && (
                  <div className="space-y-1.5">
                    {s.scripts.map((script, i) => (
                      <div key={script.id} className="flex items-center gap-3 px-3 py-2 bg-[#0D0D0D] border border-[#1E1E1E]">
                        <span className="text-[10px] font-mono text-[#F59E0B] w-12 flex-shrink-0">PART {i + 1}</span>
                        <p className="text-xs text-[#F5F5F0] truncate flex-1">{script.hook}</p>
                        <span className="text-[9px] text-[#3A3A3A] font-mono flex-shrink-0">{script.pillar}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileSection({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className="bg-[#141414] border border-[#1E1E1E] p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color }}>{title}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-xs mt-0.5" style={{ color }}>—</span>
            <span className="text-xs text-[#F5F5F0] leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
