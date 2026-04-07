'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/ui/Modal';

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

const PILLARS = ['Mindset', 'Sales', 'Money', 'Real Estate', 'Operations', 'Other'];

const PILLAR_COLORS: Record<string, string> = {
  Mindset: 'bg-purple-900/30 text-purple-400 border-purple-800',
  Sales: 'bg-blue-900/30 text-blue-400 border-blue-800',
  Money: 'bg-green-900/30 text-green-400 border-green-800',
  'Real Estate': 'bg-orange-900/30 text-orange-400 border-orange-800',
  Operations: 'bg-slate-800/50 text-slate-400 border-slate-700',
  Other: 'bg-[#1E1E1E] text-[#6B6B6B] border-[#2A2A2A]',
};

interface ScriptCardProps {
  script: Script;
  voiceModifier?: string;
  energyLevel?: number;
  voice?: string;
  onSave?: (id: number) => void;
  onGraveyard?: (id: number) => void;
  onRemixed?: (script: Script) => void;
  showActions?: boolean;
}

export default function ScriptCard({
  script,
  voiceModifier = '',
  energyLevel = 5,
  voice = '',
  onSave,
  onGraveyard,
  onRemixed,
  showActions = true,
}: ScriptCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [pillar, setPillar] = useState(script.pillar);
  const [saved, setSaved] = useState(false);
  const [graveyarded, setGraveyarded] = useState(false);
  const [stressModal, setStressModal] = useState(false);
  const [stressData, setStressData] = useState<{
    psychological_trigger: string;
    target_audience: string;
    strength_score: number;
    improvement_suggestion: string;
  } | null>(null);
  const [stressLoading, setStressLoading] = useState(false);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [caption, setCaption] = useState<{ caption: string; hashtags: string[] } | null>(() => {
    if (script.caption) {
      let tags: string[] = [];
      if (script.hashtags) {
        try { tags = JSON.parse(script.hashtags); } catch { tags = []; }
      }
      return { caption: script.caption, hashtags: tags };
    }
    return null;
  });
  const [showCaption, setShowCaption] = useState(false);
  const [remixLoading, setRemixLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingPillar, setSavingPillar] = useState(false);

  const handleCopy = () => {
    const text = `HOOK:\n${script.hook}\n\nBODY:\n${script.body}\n\nCTA:\n${script.cta}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    await fetch('/api/library', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: script.id, updates: { liked: 1 } }),
    });
    setSaved(true);
    onSave?.(script.id);
  };

  const handleGraveyard = async () => {
    await fetch('/api/library', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: script.id, updates: { status: 'graveyard' } }),
    });
    setGraveyarded(true);
    onGraveyard?.(script.id);
  };

  const handlePillarChange = async (p: string) => {
    setPillar(p);
    setSavingPillar(true);
    await fetch('/api/library', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: script.id, updates: { pillar: p } }),
    });
    setSavingPillar(false);
  };

  const handleStressTest = async () => {
    setStressModal(true);
    setStressLoading(true);
    try {
      const res = await fetch('/api/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hook: script.hook }),
      });
      const data = await res.json();
      setStressData(data);
    } catch {
      setStressData(null);
    } finally {
      setStressLoading(false);
    }
  };

  const handleCaption = async () => {
    if (caption) { setShowCaption(true); return; }
    setCaptionLoading(true);
    try {
      const res = await fetch('/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: script.id, hook: script.hook, body: script.body, cta: script.cta }),
      });
      const data = await res.json();
      setCaption(data);
      setShowCaption(true);
    } finally {
      setCaptionLoading(false);
    }
  };

  const handleRemix = async () => {
    setRemixLoading(true);
    try {
      const res = await fetch('/api/remix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: script.id, voiceModifier, energyLevel, voice }),
      });
      const data = await res.json();
      if (data.script) onRemixed?.(data.script);
    } finally {
      setRemixLoading(false);
    }
  };

  if (graveyarded) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-[#141414] border border-[#1E1E1E] hover:border-[#2A2A2A] transition-all duration-200 group"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          {/* Confidence Badge */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className={`px-2 py-0.5 text-xs font-mono border ${PILLAR_COLORS[pillar] || PILLAR_COLORS['Other']}`}>
                {pillar}
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#0A0A0A] border border-[#2A2A2A]">
                <div className={`w-1.5 h-1.5 rounded-full ${script.confidence_score >= 7 ? 'bg-[#F59E0B]' : script.confidence_score >= 4 ? 'bg-yellow-600' : 'bg-red-600'}`} />
                <span className="text-xs font-mono text-[#F5F5F0]">{script.confidence_score}/10</span>
              </div>
            </div>
            {saved && (
              <span className="text-xs text-[#F59E0B] font-mono">SAVED</span>
            )}
          </div>

          {/* Hook */}
          <p className="text-[#F5F5F0] font-bold text-base leading-snug mb-1">
            {script.hook}
          </p>
          <p className="text-[10px] text-[#6B6B6B] font-mono italic">{script.confidence_reason}</p>
        </div>

        {/* Body Toggle */}
        <div className="px-5 pb-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#F59E0B] hover:text-[#F5F5F0] transition-colors font-mono flex items-center gap-1"
          >
            {expanded ? '▲ Hide' : '▼ Body + CTA'}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-1">Body</p>
                    <p className="text-sm text-[#C0C0BC] leading-relaxed font-mono whitespace-pre-wrap">{script.body}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-1">CTA</p>
                    <p className="text-sm text-[#F59E0B] font-mono">{script.cta}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pillar Selector */}
        <div className="px-5 pb-3">
          <div className="flex gap-1.5 flex-wrap">
            {PILLARS.map(p => (
              <button
                key={p}
                onClick={() => handlePillarChange(p)}
                className={`text-[10px] px-2 py-1 border transition-all font-mono ${
                  pillar === p ? PILLAR_COLORS[p] : 'border-[#1E1E1E] text-[#3A3A3A] hover:border-[#2A2A2A] hover:text-[#6B6B6B]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Caption Section */}
        <AnimatePresence>
          {showCaption && caption && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-5 pb-3 overflow-hidden"
            >
              <div className="bg-[#0D0D0D] border border-[#1E1E1E] p-3 space-y-2">
                <p className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest">Instagram Caption</p>
                <p className="text-xs text-[#F5F5F0] leading-relaxed">{caption.caption}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {caption.hashtags.map((tag, i) => (
                    <span key={i} className="text-[10px] text-[#F59E0B] font-mono">{tag.startsWith('#') ? tag : `#${tag}`}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {showActions && (
          <div className="px-5 pb-5 border-t border-[#1E1E1E] pt-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopy}
                className={`text-[11px] px-3 py-1.5 border font-mono transition-all ${
                  copied ? 'border-[#F59E0B] text-[#F59E0B]' : 'border-[#2A2A2A] text-[#6B6B6B] hover:border-[#F59E0B] hover:text-[#F59E0B]'
                }`}
              >
                {copied ? '✓ COPIED' : 'COPY SCRIPT'}
              </button>
              <button
                onClick={handleSave}
                disabled={saved}
                className={`text-[11px] px-3 py-1.5 border font-mono transition-all ${
                  saved ? 'border-[#F59E0B]/30 text-[#F59E0B]/50' : 'border-[#2A2A2A] text-[#6B6B6B] hover:border-green-600 hover:text-green-500'
                }`}
              >
                {saved ? '✓ SAVED' : '👍 SAVE'}
              </button>
              <button
                onClick={handleGraveyard}
                className="text-[11px] px-3 py-1.5 border border-[#2A2A2A] text-[#6B6B6B] hover:border-red-900 hover:text-red-600 font-mono transition-all"
              >
                🗑️ GRAVEYARD
              </button>
              <button
                onClick={handleStressTest}
                className="text-[11px] px-3 py-1.5 border border-[#2A2A2A] text-[#6B6B6B] hover:border-[#F59E0B] hover:text-[#F59E0B] font-mono transition-all"
              >
                🔬 HOOK TEST
              </button>
              <button
                onClick={handleRemix}
                disabled={remixLoading}
                className="text-[11px] px-3 py-1.5 border border-[#2A2A2A] text-[#6B6B6B] hover:border-blue-700 hover:text-blue-500 font-mono transition-all"
              >
                {remixLoading ? '...' : '🔁 REMIX'}
              </button>
              <button
                onClick={handleCaption}
                disabled={captionLoading}
                className="text-[11px] px-3 py-1.5 border border-[#2A2A2A] text-[#6B6B6B] hover:border-purple-700 hover:text-purple-500 font-mono transition-all"
              >
                {captionLoading ? '...' : showCaption ? '▲ CAPTION' : '📝 CAPTION'}
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stress Test Modal */}
      <Modal open={stressModal} onClose={() => setStressModal(false)} title="HOOK STRESS TEST">
        {stressLoading ? (
          <div className="space-y-3">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-4 w-5/6 rounded" />
          </div>
        ) : stressData ? (
          <div className="space-y-4">
            <div className="bg-[#0D0D0D] p-4 border border-[#1E1E1E]">
              <p className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-1">Hook Analyzed</p>
              <p className="text-sm text-[#F5F5F0] italic">"{script.hook}"</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-1">Psychological Trigger</p>
                <p className="text-sm text-[#F59E0B]">{stressData.psychological_trigger}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-1">Target Audience</p>
                <p className="text-sm text-[#F5F5F0]">{stressData.target_audience}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-1">Strength Score</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#1E1E1E] h-2">
                  <div
                    className="h-full bg-[#F59E0B] transition-all"
                    style={{ width: `${stressData.strength_score * 10}%` }}
                  />
                </div>
                <span className="text-[#F59E0B] font-mono font-bold">{stressData.strength_score}/10</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-1">How to Strengthen</p>
              <p className="text-sm text-[#F5F5F0] leading-relaxed">{stressData.improvement_suggestion}</p>
            </div>
          </div>
        ) : (
          <p className="text-[#6B6B6B]">Failed to load analysis.</p>
        )}
      </Modal>
    </>
  );
}
