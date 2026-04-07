'use client';
import { motion } from 'framer-motion';

interface Creator {
  id: number;
  creator_name: string;
  description: string;
  prompt_modifier: string;
  category: string;
  example_hook: string;
}

interface CreatorSelectorProps {
  creators: Creator[];
  selected: string;
  onSelect: (creator: Creator) => void;
}

const CATEGORY_ORDER = ['Aggressive', 'Analytical', 'Contrarian', 'Philosophical', 'Authoritative', 'Direct Response', 'Educational', 'Motivational', 'Custom'];

export default function CreatorSelector({ creators, selected, onSelect }: CreatorSelectorProps) {
  const grouped: Record<string, Creator[]> = {};
  for (const c of creators) {
    const cat = c.category || 'Custom';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(c);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {CATEGORY_ORDER.filter(cat => grouped[cat]).map(category => (
            <div key={category} className="flex flex-col gap-1.5">
              <p className="text-[9px] text-[#3A3A3A] font-mono uppercase tracking-widest px-1">{category}</p>
              <div className="flex gap-1.5">
                {grouped[category]?.map(creator => (
                  <motion.button
                    key={creator.id}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onSelect(creator)}
                    title={creator.description}
                    className={`px-3 py-1.5 text-xs font-mono border transition-all whitespace-nowrap ${
                      selected === creator.creator_name
                        ? 'bg-[#F59E0B]/10 border-[#F59E0B] text-[#F59E0B]'
                        : 'border-[#2A2A2A] text-[#6B6B6B] hover:border-[#3A3A3A] hover:text-[#F5F5F0]'
                    }`}
                  >
                    {creator.creator_name}
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && creators.find(c => c.creator_name === selected) && (
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] px-3 py-2">
          <p className="text-[10px] text-[#6B6B6B] font-mono leading-relaxed">
            <span className="text-[#F59E0B]">{selected}:</span>{' '}
            {creators.find(c => c.creator_name === selected)?.description}
          </p>
        </div>
      )}
    </div>
  );
}
