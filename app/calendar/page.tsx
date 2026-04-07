'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import jsPDF from 'jspdf';

interface Script {
  id: number;
  hook: string;
  body: string;
  cta: string;
  pillar: string;
  voice: string;
  confidence_score: number;
}

interface CalendarEntry {
  id: number;
  script_id: number;
  scheduled_date: string;
  notes: string;
  hook: string;
  body: string;
  cta: string;
  pillar: string;
  voice: string;
  confidence_score: number;
}

const PILLAR_COLORS: Record<string, string> = {
  Mindset: '#7C3AED',
  Sales: '#2563EB',
  Money: '#16A34A',
  'Real Estate': '#EA580C',
  Operations: '#475569',
  Other: '#374151',
};

function getDaysOfWeek(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function DroppableDay({ date, entry, onExpand }: {
  date: Date;
  entry?: CalendarEntry;
  onExpand: (entry: CalendarEntry) => void;
}) {
  const dateStr = toDateStr(date);
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });
  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const dayName = dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1];

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[140px] border transition-all ${
        isOver ? 'border-[#F59E0B] bg-[#F59E0B]/5' : 'border-[#1E1E1E] bg-[#0D0D0D]'
      }`}
    >
      <div className="px-3 py-2 border-b border-[#1E1E1E] flex items-baseline justify-between">
        <span className="text-[10px] font-mono font-bold text-[#6B6B6B] tracking-widest">{dayName}</span>
        <span className="text-[10px] font-mono text-[#3A3A3A]">{date.getDate()}</span>
      </div>
      <div className="p-2">
        {entry ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => onExpand(entry)}
            className="cursor-pointer p-2 border-l-2 bg-[#141414] hover:bg-[#1A1A1A] transition-colors"
            style={{ borderLeftColor: PILLAR_COLORS[entry.pillar] || '#374151' }}
          >
            <p className="text-[11px] text-[#F5F5F0] leading-tight line-clamp-3 font-medium">{entry.hook}</p>
            <p className="text-[9px] text-[#6B6B6B] font-mono mt-1 uppercase">{entry.voice}</p>
          </motion.div>
        ) : (
          <div className="flex items-center justify-center h-16 text-[#2A2A2A] text-xs font-mono">
            {isOver ? 'DROP HERE' : '+ DROP SCRIPT'}
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableScript({ script }: { script: Script }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `script-${script.id}` });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-3 border border-[#1E1E1E] bg-[#141414] cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-40' : 'hover:border-[#2A2A2A]'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-1.5 h-1.5" style={{ background: PILLAR_COLORS[script.pillar] || '#374151' }} />
        <span className="text-[9px] font-mono text-[#6B6B6B] uppercase">{script.pillar}</span>
      </div>
      <p className="text-[11px] text-[#F5F5F0] leading-tight line-clamp-2">{script.hook}</p>
      {script.voice && <p className="text-[9px] text-[#3A3A3A] font-mono mt-1">{script.voice}</p>}
    </div>
  );
}

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [unscheduled, setUnscheduled] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntry, setExpandedEntry] = useState<CalendarEntry | null>(null);
  const [notes, setNotes] = useState('');
  const [activeScript, setActiveScript] = useState<Script | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/calendar?weekStart=${toDateStr(weekStart)}`);
    const data = await res.json();
    setEntries(data.entries || []);
    setUnscheduled(data.unscheduled || []);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { loadData(); }, [loadData]);

  const days = getDaysOfWeek(weekStart);

  const getEntryForDay = (date: Date) => {
    const dateStr = toDateStr(date);
    return entries.find(e => e.scheduled_date === dateStr);
  };

  const handleDragStart = (e: DragStartEvent) => {
    const id = e.active.id as string;
    if (id.startsWith('script-')) {
      const scriptId = parseInt(id.replace('script-', ''));
      setActiveScript(unscheduled.find(s => s.id === scriptId) || null);
    }
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveScript(null);
    const { active, over } = e;
    if (!over) return;

    const scriptId = parseInt((active.id as string).replace('script-', ''));
    const dateStr = over.id as string;

    // Check if date slot already has entry
    const existing = entries.find(en => en.scheduled_date === dateStr);
    if (existing) return;

    await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptId, scheduledDate: dateStr }),
    });

    loadData();
  };

  const handleRemoveFromDay = async (entry: CalendarEntry) => {
    await fetch('/api/calendar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId: entry.id, scriptId: entry.script_id }),
    });
    setExpandedEntry(null);
    loadData();
  };

  const handleSaveNotes = async (entry: CalendarEntry) => {
    await fetch('/api/calendar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId: entry.id, scheduledDate: entry.scheduled_date, notes }),
    });
    loadData();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const weekEntries = days.map(d => getEntryForDay(d)).filter(Boolean) as CalendarEntry[];

    if (weekEntries.length === 0) {
      alert('No scripts scheduled this week');
      return;
    }

    weekEntries.forEach((entry, index) => {
      if (index > 0) doc.addPage();

      // Dark-ish background (light PDF)
      doc.setFillColor(245, 245, 240);
      doc.rect(0, 0, 210, 297, 'F');

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(10, 10, 10);
      doc.text('EMBER REELS', 20, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${entry.scheduled_date}`, 20, 32);
      doc.text(`Voice: ${entry.voice}`, 20, 38);
      doc.text(`Pillar: ${entry.pillar}`, 20, 44);

      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.5);
      doc.line(20, 50, 190, 50);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(10, 10, 10);
      doc.text('HOOK', 20, 62);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      const hookLines = doc.splitTextToSize(entry.hook, 170);
      doc.text(hookLines, 20, 70);

      let y = 70 + hookLines.length * 7 + 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('BODY', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      y += 8;
      const bodyLines = doc.splitTextToSize(entry.body, 170);
      doc.text(bodyLines, 20, y);
      y += bodyLines.length * 5 + 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('CTA', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      y += 8;
      const ctaLines = doc.splitTextToSize(entry.cta, 170);
      doc.text(ctaLines, 20, y);

      if (entry.notes) {
        y += ctaLines.length * 5 + 15;
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Notes: ${entry.notes}`, 20, y);
      }
    });

    doc.save(`ember-reels-week-${toDateStr(weekStart)}.pdf`);
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-5xl tracking-widest text-[#F5F5F0] mb-1">CALENDAR</h1>
          <p className="text-sm text-[#6B6B6B] font-mono">Plan your content week</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="px-4 py-2 border border-[#2A2A2A] text-sm text-[#6B6B6B] font-mono hover:border-[#F59E0B] hover:text-[#F59E0B] transition-all"
        >
          EXPORT WEEK PDF
        </button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={prevWeek} className="px-3 py-1.5 border border-[#2A2A2A] text-[#6B6B6B] hover:text-[#F5F5F0] font-mono text-sm transition-colors">
          ← PREV
        </button>
        <span className="text-sm font-mono text-[#F5F5F0]">
          {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — {days[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
        <button onClick={nextWeek} className="px-3 py-1.5 border border-[#2A2A2A] text-[#6B6B6B] hover:text-[#F5F5F0] font-mono text-sm transition-colors">
          NEXT →
        </button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4">
          {/* Calendar Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex-1 min-h-[140px] skeleton" />
                ))}
              </div>
            ) : (
              <div className="flex gap-1.5">
                {days.map(day => (
                  <DroppableDay
                    key={toDateStr(day)}
                    date={day}
                    entry={getEntryForDay(day)}
                    onExpand={entry => { setExpandedEntry(entry); setNotes(entry.notes || ''); }}
                  />
                ))}
              </div>
            )}

            {/* Expanded Entry Detail */}
            <AnimatePresence>
              {expandedEntry && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-4 bg-[#141414] border border-[#2A2A2A] p-5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-1">{expandedEntry.scheduled_date} · {expandedEntry.pillar} · {expandedEntry.voice}</p>
                      <p className="text-base font-bold text-[#F5F5F0]">{expandedEntry.hook}</p>
                    </div>
                    <button onClick={() => setExpandedEntry(null)} className="text-[#6B6B6B] hover:text-[#F5F5F0] text-xl leading-none ml-4">×</button>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-1">Body</p>
                      <p className="text-xs text-[#C0C0BC] font-mono leading-relaxed whitespace-pre-wrap">{expandedEntry.body}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-1">CTA</p>
                      <p className="text-xs text-[#F59E0B] font-mono">{expandedEntry.cta}</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-[10px] text-[#6B6B6B] font-mono uppercase tracking-widest mb-2">Notes</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] px-3 py-2 text-xs text-[#F5F5F0] font-mono resize-none focus:outline-none focus:border-[#F59E0B]"
                      placeholder="Editor notes, reminders..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveNotes(expandedEntry)}
                      className="px-4 py-1.5 text-xs font-mono bg-[#F59E0B] text-black font-bold hover:bg-[#D97706] transition-colors"
                    >
                      SAVE NOTES
                    </button>
                    <button
                      onClick={() => handleRemoveFromDay(expandedEntry)}
                      className="px-4 py-1.5 text-xs font-mono border border-[#2A2A2A] text-[#6B6B6B] hover:border-red-900 hover:text-red-600 transition-all"
                    >
                      REMOVE FROM DAY
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Unscheduled Sidebar */}
          <div className="w-56 flex-shrink-0">
            <div className="border border-[#1E1E1E] bg-[#0D0D0D]">
              <div className="px-3 py-2 border-b border-[#1E1E1E]">
                <p className="text-[10px] font-mono font-bold text-[#6B6B6B] tracking-widest uppercase">Unscheduled</p>
                <p className="text-[9px] text-[#3A3A3A] font-mono">{unscheduled.length} scripts</p>
              </div>
              <div className="p-2 space-y-2 max-h-[520px] overflow-y-auto">
                {unscheduled.length === 0 ? (
                  <p className="text-[10px] text-[#3A3A3A] font-mono p-2">All scripts scheduled</p>
                ) : (
                  unscheduled.map(s => <DraggableScript key={s.id} script={s} />)
                )}
              </div>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeScript && (
            <div className="p-3 border border-[#F59E0B] bg-[#141414] opacity-90 w-48 rotate-2 shadow-xl">
              <p className="text-[11px] text-[#F5F5F0] leading-tight">{activeScript.hook.slice(0, 80)}...</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
