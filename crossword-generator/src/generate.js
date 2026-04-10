#!/usr/bin/env node

/**
 * CLI crossword generator.
 *
 * Usage:
 *   node src/generate.js --theme "ocean animals" --size 13 --level middle
 *   node src/generate.js --generate-bank "ocean animals" --level adult
 *
 * Word sources (combined, in priority order):
 *   1. Theme word bank  — data/banks/<theme>.json (pre-generated via --generate-bank)
 *   2. Claude live call  — if no bank exists, calls `claude -p` for themed words
 *   3. Dictionary        — data/dictionary.json (general English fallback)
 *
 * Solver strategy:
 *   1. Grid-first backtracking (symmetric layout, fills slots from large word pool)
 *   2. Organic fallback (places words one by one if grid-first fails)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateLayout, solve, numberGrid, findSlots, buildOrganic, buildSymmetric } from './solver.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');
const BANK_DIR = resolve(DATA_DIR, 'banks');
const PUBLIC_DIR = resolve(__dirname, '..', 'public');

// ── CLI args ───────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    theme: 'general knowledge', size: 13, level: 'adult',
    output: null, animate: true, generateBank: null, symmetric: false,
    minWords: null, symmetryTolerance: 0
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--theme': opts.theme = args[++i]; break;
      case '--size': opts.size = parseInt(args[++i], 10); break;
      case '--level': opts.level = args[++i]; break;
      case '--output': opts.output = args[++i]; break;
      case '--no-animate': opts.animate = false; break;
      case '--generate-bank': opts.generateBank = args[++i]; break;
      case '--symmetric': opts.symmetric = true; break;
      case '--min-words': opts.minWords = parseInt(args[++i], 10); break;
      case '--symmetry-tolerance': opts.symmetryTolerance = parseInt(args[++i], 10); break;
      case '--help':
        console.log(`
Usage: node src/generate.js [options]

Options:
  --theme <topic>           Puzzle theme (default: "general knowledge")
  --size <n>                Grid size NxN (default: 13)
  --level <level>           Reading level: elementary, middle, high, adult (default: adult)
  --output <file>           Output JSON path (default: data/<theme>.json)
  --no-animate              Skip terminal animation
  --generate-bank <topic>   Generate a reusable word bank for a theme (saves to data/banks/)
  --symmetric               Require 180° rotationally symmetric black squares
  --min-words <n>           Minimum words to place (searches longer for denser grids)
  --help                    Show this help

Examples:
  node src/generate.js --generate-bank "ocean animals" --level middle
  node src/generate.js --theme "ocean animals" --size 15 --symmetric
  node src/generate.js --theme "science" --size 15 --min-words 40
`);
        process.exit(0);
    }
  }
  return opts;
}

// ── Slug helper ────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

function shellEscape(str) {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

// ── Word sources ───────────────────────────────────────────────────────

/** Load the general English dictionary fallback. */
function loadDictionary() {
  const dictPath = resolve(DATA_DIR, 'dictionary.json');
  if (!existsSync(dictPath)) return [];
  try {
    return JSON.parse(readFileSync(dictPath, 'utf-8'));
  } catch { return []; }
}

/** Load a pre-generated word bank for a theme. */
function loadBank(theme) {
  const bankPath = resolve(BANK_DIR, `${slugify(theme)}.json`);
  if (!existsSync(bankPath)) return null;
  try {
    return JSON.parse(readFileSync(bankPath, 'utf-8'));
  } catch { return null; }
}

/** Call Claude CLI to generate themed words. */
function generateWordsViaClaude(theme, count, level) {
  const levelDescriptions = {
    elementary: 'Use simple vocabulary suitable for ages 8-10. Clues should be straightforward definitions.',
    middle: 'Use vocabulary suitable for ages 11-14. Clues can include basic wordplay.',
    high: 'Use vocabulary suitable for ages 15-18. Clues can be moderately tricky.',
    adult: 'Use adult-level vocabulary. Clues can be clever, use wordplay, or reference cultural knowledge.'
  };

  const prompt = `Generate a word list for a crossword puzzle.

Theme: ${theme}
Reading level: ${level} — ${levelDescriptions[level] || levelDescriptions.adult}

Generate exactly ${count} unique words related to the theme.
Words should be 3-15 letters long. Include a good mix of lengths, with more 4-7 letter words.
All words should be common English words (no proper nouns, no abbreviations).

Return ONLY a JSON array, no explanation, in this exact format:
[{"word": "OCEAN", "clue": "Large body of saltwater"}, {"word": "TIDE", "clue": "Rise and fall of sea levels"}]

Rules:
- All words UPPERCASE, letters only (no spaces, hyphens, or punctuation)
- Each clue is one sentence, no period at the end
- No duplicate words
- Every word must be a real English word`;

  console.log(`  Asking Claude for ${count} themed words...`);

  let text;
  try {
    text = execSync(
      `claude -p --output-format text --max-turns 1 ${shellEscape(prompt)}`,
      { encoding: 'utf-8', timeout: 120_000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
  } catch (err) {
    throw new Error(
      'Failed to run `claude` CLI. Make sure Claude Code is installed and authenticated.\n' +
      (err.stderr || err.message)
    );
  }

  let json = text;
  if (json.startsWith('```')) {
    json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(json)
    .filter(w => w.word && w.clue && /^[A-Z]+$/.test(w.word) && w.word.length >= 3)
    .map(w => ({ word: w.word.toUpperCase(), clue: w.clue }));
}

/**
 * Assemble the full word pool: bank (or live Claude) + dictionary fallback.
 * Themed words come first so the solver prefers them; dictionary fills gaps.
 * Deduplicates by word.
 */
function assembleWordPool(themedWords, maxLen) {
  const dict = loadDictionary();
  const seen = new Set();
  const pool = [];

  for (const entry of themedWords) {
    if (entry.word.length > maxLen || entry.word.length < 3) continue;
    if (seen.has(entry.word)) continue;
    seen.add(entry.word);
    pool.push(entry);
  }

  for (const entry of dict) {
    if (entry.word.length > maxLen || entry.word.length < 3) continue;
    if (seen.has(entry.word)) continue;
    seen.add(entry.word);
    pool.push(entry);
  }

  return pool;
}

// ── Generate word bank mode ────────────────────────────────────────────
function runGenerateBank(theme, level) {
  console.log(colorText(`\n  Word Bank Generator`, 'bold'));
  console.log(`  Theme: ${theme}`);
  console.log(`  Level: ${level}\n`);

  // Generate a large batch — 200 words
  const words = generateWordsViaClaude(theme, 200, level);
  console.log(`  Got ${words.length} valid words.\n`);

  mkdirSync(BANK_DIR, { recursive: true });
  const bankPath = resolve(BANK_DIR, `${slugify(theme)}.json`);
  writeFileSync(bankPath, JSON.stringify(words, null, 2));
  console.log(`  ${colorText('✓', 'green')} Saved word bank to ${bankPath}`);
  console.log(`  Use with: node src/generate.js --theme "${theme}" --size 13\n`);

  // Show length distribution
  const dist = {};
  for (const w of words) dist[w.word.length] = (dist[w.word.length] || 0) + 1;
  console.log('  Length distribution:', JSON.stringify(dist));
}

// ── Terminal animation ─────────────────────────────────────────────────
function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

function colorText(text, color) {
  const colors = {
    green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
    cyan: '\x1b[36m', white: '\x1b[37m', dim: '\x1b[2m',
    bold: '\x1b[1m', reset: '\x1b[0m', bgGreen: '\x1b[42m',
    bgRed: '\x1b[41m', bgBlue: '\x1b[44m'
  };
  return `${colors[color] || ''}${text}\x1b[0m`;
}

function renderGrid(grid, size, highlight = null) {
  let out = '  ┌' + '───┬'.repeat(size - 1) + '───┐\n';
  for (let r = 0; r < size; r++) {
    out += '  │';
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      let display;
      if (cell === '#') {
        display = colorText('███', 'dim');
      } else if (cell && cell !== '') {
        const isHighlight = highlight && highlight.some(([hr, hc]) => hr === r && hc === c);
        display = colorText(` ${cell} `, isHighlight ? 'bgGreen' : 'cyan');
      } else {
        display = '   ';
      }
      out += display + '│';
    }
    out += '\n';
    if (r < size - 1) out += '  ├' + '───┼'.repeat(size - 1) + '───┤\n';
  }
  out += '  └' + '───┴'.repeat(size - 1) + '───┘\n';
  return out;
}

async function animatedStep({ action, slotIdx, word, grid, steps }, label) {
  clearScreen();
  const size = grid.length;
  console.log(colorText(`  CROSSWORD ${label}`, 'bold'));
  console.log(colorText(`  Steps: ${steps}`, 'dim'));
  console.log();
  console.log(renderGrid(grid, size));
  if (action === 'place') {
    console.log(colorText(`  + "${word}"`, 'green'));
  } else {
    console.log(colorText(`  - "${word}" (backtracking)`, 'red'));
  }
  await new Promise(r => setTimeout(r, 30));
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();

  // Word bank generation mode
  if (opts.generateBank) {
    runGenerateBank(opts.generateBank, opts.level);
    return;
  }

  console.log(colorText(`\n  Crossword Generator`, 'bold'));
  console.log(`  Theme: ${opts.theme}`);
  console.log(`  Size:  ${opts.size}x${opts.size}`);
  console.log(`  Level: ${opts.level}\n`);

  // 1. Gather words: bank > live Claude > dictionary fallback
  let themedWords;
  const bank = loadBank(opts.theme);
  if (bank) {
    console.log(`  Loaded word bank: ${bank.length} themed words.`);
    themedWords = bank;
  } else {
    console.log('  No word bank found — calling Claude for themed words...');
    try {
      themedWords = generateWordsViaClaude(opts.theme, Math.floor(opts.size * opts.size * 0.4), opts.level);
      console.log(`  Got ${themedWords.length} themed words from Claude.`);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      console.log('  Falling back to dictionary only.');
      themedWords = [];
    }
  }

  const pool = assembleWordPool(themedWords, opts.size);
  console.log(`  Total word pool: ${pool.length} words (themed + dictionary).\n`);

  if (pool.length < 20) {
    console.error('  Not enough words. Add a dictionary or generate a word bank first.');
    process.exit(1);
  }

  // 2. Build crossword
  // Default minWords scales with grid size; user can override for denser grids
  const minWords = opts.minWords || Math.floor(opts.size * 1.2);
  // More attempts when targeting higher density
  const maxAttempts = Math.max(300, minWords * 20);

  const label = [
    opts.symmetric ? 'symmetric' : null,
    opts.minWords ? `≥${minWords} words` : null,
  ].filter(Boolean).join(', ');
  console.log(`  Building crossword${label ? ` (${label})` : ''}...`);
  let result = null;

  if (opts.symmetric) {
    console.log(`  Searching (up to ${maxAttempts} attempts)...`);
    const onStep = opts.animate ? (step) => animatedStep(step, 'BUILDER') : null;
    const sym = await buildSymmetric(pool, opts.size, {
      minWords, maxAttempts, onStep, symmetryTolerance: opts.symmetryTolerance
    });
    if (sym) {
      result = { grid: sym.grid, placements: sym.placements, size: sym.size, numbers: sym.numbers };
    } else {
      console.error('\n  Could not find a symmetric layout. Try --min-words with a lower value, or a larger word pool.');
      process.exit(1);
    }
  } else {
    // Try grid-first solver if word pool is very large (5000+)
    if (pool.length >= 5000) {
      console.log('  Trying grid-first solver (large word pool)...');
      for (let attempt = 0; attempt < 10; attempt++) {
        const layout = generateLayout(opts.size);
        const onStep = opts.animate ? (step) => animatedStep(step, 'SOLVER') : null;
        result = await solve(layout, pool, onStep);
        if (result) {
          console.log(`  Grid-first solved on attempt ${attempt + 1}!`);
          break;
        }
      }
    }

    // Organic builder (primary strategy)
    if (!result) {
      if (pool.length >= 5000) console.log('  Grid-first failed — using organic builder...');
      let best = null;
      const organicAttempts = Math.max(30, maxAttempts);
      for (let i = 0; i < organicAttempts; i++) {
        const onStep = (i === organicAttempts - 1 || (best && best.placements.length >= minWords)) && opts.animate
          ? (step) => animatedStep(step, 'BUILDER')
          : null;
        const r = await buildOrganic(pool, opts.size, onStep);
        if (!best || r.placements.length > best.placements.length) best = r;
        if (best.placements.length >= minWords) break;
      }

      if (!best || best.placements.length < 5) {
        console.error('\n  Failed to build puzzle. Try a larger word bank or different theme.');
        process.exit(1);
      }

      result = { grid: best.grid, placements: best.placements, size: best.size, numbers: best.numbers };
    }
  }

  if (opts.animate) clearScreen();

  // 4. Number the grid (grid-first solver needs this; organic already has it)
  const size = result.size || opts.size;
  let numbers = result.numbers;
  if (!numbers) {
    const slots = result.placements.map(p => ({
      row: p.row, col: p.col, dir: p.dir,
      length: p.word.length,
      cells: Array.from({ length: p.word.length }, (_, i) =>
        p.dir === 'across' ? [p.row, p.col + i] : [p.row + i, p.col]
      )
    }));
    numbers = numberGrid(result.grid, slots);
  }

  console.log(`  Placed ${result.placements.length} words.\n`);

  const puzzle = {
    theme: opts.theme,
    size,
    level: opts.level,
    grid: result.grid,
    numbers,
    clues: { across: [], down: [] },
    generated: new Date().toISOString()
  };

  for (const p of result.placements) {
    const num = numbers[p.row][p.col];
    const entry = { number: num, clue: p.clue, answer: p.word };
    if (p.dir === 'across') puzzle.clues.across.push(entry);
    else puzzle.clues.down.push(entry);
  }

  puzzle.clues.across.sort((a, b) => a.number - b.number);
  puzzle.clues.down.sort((a, b) => a.number - b.number);

  // 5. Save
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });

  const slug = slugify(opts.theme);
  const outPath = opts.output || resolve(DATA_DIR, `${slug}.json`);
  writeFileSync(outPath, JSON.stringify(puzzle, null, 2));
  console.log(`  ${colorText('✓', 'green')} Puzzle saved to ${outPath}`);

  const publicPath = resolve(PUBLIC_DIR, `${slug}.json`);
  writeFileSync(publicPath, JSON.stringify(puzzle, null, 2));
  console.log(`  ${colorText('✓', 'green')} Copied to ${publicPath}`);

  // Update manifest
  const manifestPath = resolve(PUBLIC_DIR, 'manifest.json');
  let manifest = [];
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')); } catch {}
  if (!manifest.find(m => m.file === `${slug}.json`)) {
    manifest.push({ file: `${slug}.json`, name: opts.theme });
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`  ${colorText('✓', 'green')} Updated manifest.json`);
  }

  // Print final grid
  console.log(`\n${renderGrid(result.grid, size)}`);

  console.log(colorText('  ACROSS', 'bold'));
  for (const c of puzzle.clues.across) {
    console.log(`  ${c.number}. ${c.clue} (${c.answer.length})`);
  }
  console.log(colorText('\n  DOWN', 'bold'));
  for (const c of puzzle.clues.down) {
    console.log(`  ${c.number}. ${c.clue} (${c.answer.length})`);
  }
  console.log();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
