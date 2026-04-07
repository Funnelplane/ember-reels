'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
  const [customVoice, setCustomVoice] = useState('');
  const [savedVoice, setSavedVoice] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);

  const [creatorName, setCreatorName] = useState('');
  const [creatorDesc, setCreatorDesc] = useState('');
  const [addingCreator, setAddingCreator] = useState(false);
  const [creatorAdded, setCreatorAdded] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [apiKeySet, setApiKeySet] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setCustomVoice(d.customVoice || '');
    });
    // Check if API key is set
    fetch('/api/apikey-status').then(r => r.json()).then(d => {
      setApiKeySet(d.isSet || false);
    }).catch(() => {});
  }, []);

  const handleSaveVoice = async () => {
    setSavingVoice(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save-voice', customVoice }),
    });
    setSavingVoice(false);
    setSavedVoice(true);
    setTimeout(() => setSavedVoice(false), 2000);
  };

  const handleAddCreator = async () => {
    if (!creatorName.trim()) return;
    setAddingCreator(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-creator', creatorName, creatorDescription: creatorDesc }),
    });
    setAddingCreator(false);
    setCreatorAdded(true);
    setCreatorName('');
    setCreatorDesc('');
    setTimeout(() => setCreatorAdded(false), 2000);
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display text-5xl tracking-widest text-[#F5F5F0] mb-1">SETTINGS</h1>
        <p className="text-sm text-[#6B6B6B] font-mono">Configure your EMBER REELS workspace</p>
      </div>

      <div className="space-y-8">
        {/* Custom Voice */}
        <section>
          <div className="mb-3">
            <h2 className="font-display text-xl tracking-widest text-[#F5F5F0]">CUSTOM VOICE</h2>
            <p className="text-xs text-[#6B6B6B] font-mono mt-0.5">Write 3–5 sentences describing your personal voice. This gets injected into every generation.</p>
          </div>
          <textarea
            value={customVoice}
            onChange={e => setCustomVoice(e.target.value)}
            rows={5}
            placeholder="e.g. I speak directly to business owners who are stuck in the day-to-day. I use specific numbers and real examples. I don't motivate — I illuminate. My tone is confident but never condescending..."
            className="w-full bg-[#0D0D0D] border border-[#2A2A2A] px-4 py-3 text-sm text-[#F5F5F0] font-mono placeholder-[#3A3A3A] focus:outline-none focus:border-[#F59E0B] resize-none transition-colors leading-relaxed"
          />
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveVoice}
            disabled={savingVoice}
            className={`mt-3 px-5 py-2 font-mono text-xs font-bold transition-all ${
              savedVoice ? 'bg-green-700 text-white' : 'bg-[#F59E0B] text-black hover:bg-[#D97706]'
            } disabled:opacity-50`}
          >
            {savedVoice ? '✓ SAVED' : savingVoice ? 'SAVING...' : 'SAVE VOICE'}
          </motion.button>
        </section>

        <div className="border-t border-[#1E1E1E]" />

        {/* Add Custom Creator */}
        <section>
          <div className="mb-3">
            <h2 className="font-display text-xl tracking-widest text-[#F5F5F0]">ADD CUSTOM CREATOR STYLE</h2>
            <p className="text-xs text-[#6B6B6B] font-mono mt-0.5">Add a creator not in the default list. They'll appear in the voice selector.</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={creatorName}
              onChange={e => setCreatorName(e.target.value)}
              placeholder="Creator name"
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] px-4 py-2.5 text-sm text-[#F5F5F0] font-mono placeholder-[#3A3A3A] focus:outline-none focus:border-[#F59E0B] transition-colors"
            />
            <textarea
              value={creatorDesc}
              onChange={e => setCreatorDesc(e.target.value)}
              rows={3}
              placeholder="Style description — how do they communicate? What's their signature approach?"
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] px-4 py-2.5 text-sm text-[#F5F5F0] font-mono placeholder-[#3A3A3A] focus:outline-none focus:border-[#F59E0B] resize-none transition-colors"
            />
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddCreator}
              disabled={addingCreator || !creatorName.trim()}
              className={`px-5 py-2 font-mono text-xs font-bold transition-all ${
                creatorAdded ? 'bg-green-700 text-white' : 'bg-[#F59E0B] text-black hover:bg-[#D97706]'
              } disabled:opacity-50`}
            >
              {creatorAdded ? '✓ ADDED' : addingCreator ? 'ADDING...' : 'ADD CREATOR'}
            </motion.button>
          </div>
        </section>

        <div className="border-t border-[#1E1E1E]" />

        {/* Anthropic API Key */}
        <section>
          <div className="mb-3">
            <h2 className="font-display text-xl tracking-widest text-[#F5F5F0]">ANTHROPIC API KEY</h2>
            <p className="text-xs text-[#6B6B6B] font-mono mt-0.5">Set in .env.local as ANTHROPIC_API_KEY. Restart the server after changing.</p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-2 h-2 rounded-full ${apiKeySet ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-mono text-[#F5F5F0]">
                {apiKeySet ? 'API key is configured' : 'No API key detected'}
              </span>
            </div>
            <p className="text-[11px] text-[#6B6B6B] font-mono leading-relaxed">
              Add your key to <span className="text-[#F59E0B]">.env.local</span>:{' '}
              <span className="text-[#F5F5F0]">ANTHROPIC_API_KEY=sk-ant-...</span>
            </p>
          </div>
        </section>

        <div className="border-t border-[#1E1E1E]" />

        {/* About */}
        <section>
          <h2 className="font-display text-xl tracking-widest text-[#F5F5F0] mb-3">ABOUT EMBER REELS</h2>
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B6B6B] font-mono">Model</span>
              <span className="text-xs text-[#F5F5F0] font-mono">claude-sonnet-4-20250514</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B6B6B] font-mono">Version</span>
              <span className="text-xs text-[#F5F5F0] font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B6B6B] font-mono">Database</span>
              <span className="text-xs text-[#F5F5F0] font-mono">SQLite (local)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B6B6B] font-mono">Storage</span>
              <span className="text-xs text-[#F5F5F0] font-mono">ember-reels.db</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
