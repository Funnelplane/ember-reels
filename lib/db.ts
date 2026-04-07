import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'ember-reels.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const d = db;

  d.exec(`
    CREATE TABLE IF NOT EXISTS scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      source_type TEXT NOT NULL CHECK(source_type IN ('youtube', 'original')),
      source_url TEXT,
      youtube_title TEXT,
      transcript_snippet TEXT,
      voice TEXT NOT NULL,
      energy_level INTEGER CHECK(energy_level BETWEEN 1 AND 10),
      hook TEXT NOT NULL,
      body TEXT NOT NULL,
      cta TEXT NOT NULL,
      caption TEXT,
      hashtags TEXT,
      pillar TEXT CHECK(pillar IN ('Mindset','Sales','Money','Real Estate','Operations','Other')),
      confidence_score INTEGER CHECK(confidence_score BETWEEN 1 AND 10),
      confidence_reason TEXT,
      status TEXT DEFAULT 'saved' CHECK(status IN ('saved','scheduled','graveyard','archived')),
      remix_parent_id INTEGER REFERENCES scripts(id),
      liked INTEGER DEFAULT 0,
      hook_variant_index INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS hook_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      script_id INTEGER REFERENCES scripts(id) ON DELETE CASCADE,
      hook_text TEXT NOT NULL,
      variant_index INTEGER,
      selected INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS calendar_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      script_id INTEGER REFERENCES scripts(id) ON DELETE CASCADE,
      scheduled_date DATE NOT NULL,
      day_slot INTEGER DEFAULT 1,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS voice_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_prompt TEXT NOT NULL,
      is_preset INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS creator_styles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_name TEXT NOT NULL,
      description TEXT,
      prompt_modifier TEXT NOT NULL,
      category TEXT,
      is_preset INTEGER DEFAULT 1,
      example_hook TEXT
    );

    CREATE TABLE IF NOT EXISTS style_learnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      profile_summary TEXT NOT NULL,
      top_pillars TEXT,
      preferred_voices TEXT,
      avoid_patterns TEXT,
      script_count_at_generation INTEGER
    );

    CREATE TABLE IF NOT EXISTS trend_injections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trend_text TEXT NOT NULL,
      used_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used DATETIME
    );

    CREATE TABLE IF NOT EXISTS content_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS series_scripts (
      series_id INTEGER REFERENCES content_series(id) ON DELETE CASCADE,
      script_id INTEGER REFERENCES scripts(id) ON DELETE CASCADE,
      position INTEGER,
      PRIMARY KEY (series_id, script_id)
    );
  `);

  // Seed creator styles if empty
  const count = d.prepare('SELECT COUNT(*) as count FROM creator_styles').get() as { count: number };
  if (count.count === 0) {
    const insert = d.prepare(`
      INSERT INTO creator_styles (creator_name, description, prompt_modifier, category, is_preset, example_hook)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const creators = [
      ['Alex Hormozi', 'Blunt, data-backed, polarizing. Short punchy sentences. Calls out excuses directly.', 'Write like Alex Hormozi — direct, no fluff, use specific numbers and outcomes. Short sentences. Occasionally confrontational.', 'Aggressive', 1, "You're not broke because of the economy."],
      ['Patrick Bet-David', 'Analytical, passionate, big-picture. Uses rhetorical questions and historical references.', 'Write like Patrick Bet-David — build an argument, use rhetorical questions, reference history or business cases. High energy but intellectual.', 'Analytical', 1, "Here's what nobody tells you about building wealth in your 30s."],
      ['Dave Ramsey', 'Authoritative, moral framing, plain language. Speaks to people who need a wake-up call.', "Write like Dave Ramsey — firm, clear, morally grounded. Speak plainly. Address the person who is avoiding the hard truth.", 'Authoritative', 1, "You don't have a money problem. You have a behavior problem."],
      ['Codie Sanchez', 'Contrarian, pattern-interrupt hooks, focuses on boring and overlooked businesses.', 'Write like Codie Sanchez — lead with a contrarian take, use boring business framing, make the unsexy sound exciting and profitable.', 'Contrarian', 1, 'The most boring businesses make the most millionaires.'],
      ['Myron Golden', 'Philosophical, wealth mindset, story-driven. Often uses biblical or universal principles.', 'Write like Myron Golden — layer in wisdom and principle, use storytelling, connect money to a bigger mission or mindset shift.', 'Philosophical', 1, 'Rich people think about money completely differently than you do.'],
      ['Grant Cardone', 'Loud, repetition-heavy, urgency and scale obsessed. Everything is about 10X.', 'Write like Grant Cardone — repeat key points for emphasis, create urgency, speak in absolutes, make everything feel high stakes and massive.', 'Aggressive', 1, 'Stop playing small. Mediocrity will destroy your future.'],
      ['Sam Ovens', 'Cold logic, ruthless clarity, minimalist. Every sentence has a purpose.', 'Write like Sam Ovens — remove all emotion, use pure logic and clarity. Each sentence must earn its place. No motivational fluff whatsoever.', 'Analytical', 1, "Most people fail not because they lack talent, but because they lack clarity."],
      ['Sabri Suby', 'Direct response copywriting energy, pain-point led, strong offers.', "Write like Sabri Suby — lead with pain, agitate the problem, then present the insight as the relief. Every hook should feel like it reads the viewer's mind.", 'Direct Response', 1, "If your business isn't growing, this is probably why."],
      ['Chris Do', 'Creative business, value pricing, calm authority. Speaks to creative professionals building businesses.', 'Write like Chris Do — calm, measured, reframe how the viewer thinks about value and positioning. Intellectual but accessible to anyone.', 'Educational', 1, "Stop charging for your time. Here's what to charge for instead."],
      ['Hamza Ahmed', 'Self-improvement meets business, speaks to young ambitious people building from scratch.', 'Write like Hamza Ahmed — speak directly to young people building from zero, be raw and honest, mix self-discipline with practical business strategy.', 'Motivational', 1, "Most 25-year-olds will be broke at 35. Here's how to not be one of them."],
      ['Wes Watson', 'Intense, accountability-first, no excuses. Earned authority through extreme experience.', 'Write like Wes Watson — zero tolerance for excuses, speak with earned authority, intensity in every word. Accountability is the core of every message.', 'Aggressive', 1, 'Your results are a direct reflection of your standards.'],
    ];

    const insertMany = d.transaction(() => {
      for (const c of creators) {
        insert.run(...c as [string, string, string, string, number, string]);
      }
    });
    insertMany();
  }
}

export default getDb;
