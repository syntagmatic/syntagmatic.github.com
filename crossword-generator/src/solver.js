/**
 * Crossword solver — backtracking constraint satisfaction with
 * rotational symmetry and full connectivity.
 */

// Directions
const ACROSS = 'across';
const DOWN = 'down';

/**
 * Create an empty grid of given size.
 * Cells: null = undecided, '#' = black, '' = empty white, or a letter.
 */
function createGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

/**
 * Enforce 180° rotational symmetry: if (r,c) is black, so is (size-1-r, size-1-c).
 */
function setBlack(grid, r, c) {
  const size = grid.length;
  grid[r][c] = '#';
  grid[size - 1 - r][size - 1 - c] = '#';
}

function isBlack(grid, r, c) {
  const size = grid.length;
  return r < 0 || r >= size || c < 0 || c >= size || grid[r][c] === '#';
}

/**
 * Find all word slots (across and down) in the grid.
 * A slot is a maximal run of non-black cells of length >= minLength.
 */
function findSlots(grid, minLength = 3) {
  const size = grid.length;
  const slots = [];

  // Across slots
  for (let r = 0; r < size; r++) {
    let start = null;
    for (let c = 0; c <= size; c++) {
      if (c < size && !isBlack(grid, r, c)) {
        if (start === null) start = c;
      } else {
        if (start !== null && c - start >= minLength) {
          slots.push({
            row: r, col: start, dir: ACROSS,
            length: c - start,
            cells: Array.from({ length: c - start }, (_, i) => [r, start + i])
          });
        }
        start = null;
      }
    }
  }

  // Down slots
  for (let c = 0; c < size; c++) {
    let start = null;
    for (let r = 0; r <= size; r++) {
      if (r < size && !isBlack(grid, r, c)) {
        if (start === null) start = r;
      } else {
        if (start !== null && r - start >= minLength) {
          slots.push({
            row: start, col: c, dir: DOWN,
            length: r - start,
            cells: Array.from({ length: r - start }, (_, i) => [start + i, c])
          });
        }
        start = null;
      }
    }
  }

  return slots;
}

/**
 * Check if all white cells in the grid are connected (flood fill).
 */
function isConnected(grid) {
  const size = grid.length;
  let startR = -1, startC = -1;
  let whiteCount = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== '#') {
        whiteCount++;
        if (startR === -1) { startR = r; startC = c; }
      }
    }
  }

  if (whiteCount === 0) return true;

  const visited = new Set();
  const stack = [[startR, startC]];
  while (stack.length) {
    const [r, c] = stack.pop();
    const key = r * size + c;
    if (visited.has(key)) continue;
    visited.add(key);
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] !== '#') {
        stack.push([nr, nc]);
      }
    }
  }

  return visited.size === whiteCount;
}

/**
 * Generate a layout with symmetric black squares.
 * Uses random placement with connectivity/min-run validation.
 * This produces layouts with a mix of short and long slots.
 */
function generateLayout(size, rng = Math.random) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const grid = createGrid(size);
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        grid[r][c] = '';

    // Target 15-20% black squares
    const target = Math.floor(size * size * (0.15 + rng() * 0.05));
    let placed = 0;
    const half = Math.ceil(size / 2);

    for (let tries = 0; tries < 500 && placed < target; tries++) {
      const r = Math.floor(rng() * half);
      const c = Math.floor(rng() * size);
      if (grid[r][c] === '#') continue;
      const sr = size - 1 - r, sc = size - 1 - c;
      grid[r][c] = '#';
      grid[sr][sc] = '#';

      // Check connectivity
      if (!isConnected(grid)) { grid[r][c] = ''; grid[sr][sc] = ''; continue; }
      placed += (r === sr && c === sc) ? 1 : 2;
    }

    // Validate: no runs shorter than 3
    let valid = true;
    for (let r = 0; r < size && valid; r++) {
      let run = 0;
      for (let c = 0; c <= size; c++) {
        if (c < size && grid[r][c] !== '#') run++;
        else { if (run > 0 && run < 3) valid = false; run = 0; }
      }
    }
    for (let c = 0; c < size && valid; c++) {
      let run = 0;
      for (let r = 0; r <= size; r++) {
        if (r < size && grid[r][c] !== '#') run++;
        else { if (run > 0 && run < 3) valid = false; run = 0; }
      }
    }
    if (!valid) continue;

    const slots = findSlots(grid);
    if (slots.length >= 16) return { grid, slots };
  }

  // Fallback: open grid with center black
  const grid = createGrid(size);
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) grid[r][c] = '';
  if (size % 2 === 1) grid[Math.floor(size/2)][Math.floor(size/2)] = '#';
  return { grid, slots: findSlots(grid) };
}

/**
 * Build intersection map: for each slot, which other slots share a cell.
 */
function buildIntersections(slots) {
  const cellToSlot = new Map(); // "r,c" -> [{slotIdx, posInSlot}]

  slots.forEach((slot, si) => {
    slot.cells.forEach(([r, c], pi) => {
      const key = `${r},${c}`;
      if (!cellToSlot.has(key)) cellToSlot.set(key, []);
      cellToSlot.get(key).push({ slotIdx: si, posInSlot: pi });
    });
  });

  // For each slot, list of {otherSlot, myPos, otherPos}
  const intersections = slots.map(() => []);
  for (const entries of cellToSlot.values()) {
    if (entries.length === 2) {
      const [a, b] = entries;
      intersections[a.slotIdx].push({
        otherSlot: b.slotIdx, myPos: a.posInSlot, otherPos: b.posInSlot
      });
      intersections[b.slotIdx].push({
        otherSlot: a.slotIdx, myPos: b.posInSlot, otherPos: a.posInSlot
      });
    }
  }

  return intersections;
}

/**
 * Filter word list to candidates that match current constraints for a slot.
 */
function getCandidates(slot, grid, wordsByLength) {
  const words = wordsByLength.get(slot.length) || [];
  return words.filter(w => {
    for (let i = 0; i < slot.cells.length; i++) {
      const [r, c] = slot.cells[i];
      const cell = grid[r][c];
      if (cell && cell !== '' && cell !== w.word[i]) return false;
    }
    return true;
  });
}

/**
 * Place a word in the grid, return the previous cell values for undo.
 */
function placeWord(grid, slot, word) {
  const prev = [];
  for (let i = 0; i < slot.cells.length; i++) {
    const [r, c] = slot.cells[i];
    prev.push(grid[r][c]);
    grid[r][c] = word[i];
  }
  return prev;
}

function removeWord(grid, slot, prev) {
  for (let i = 0; i < slot.cells.length; i++) {
    const [r, c] = slot.cells[i];
    grid[r][c] = prev[i];
  }
}

/**
 * Main solver: backtracking fill of all slots.
 * @param {object} layout - {grid, slots} from generateLayout
 * @param {Array} wordList - [{word, clue}]
 * @param {function} onStep - callback({action, slotIdx, word, grid}) for visualization
 * @returns {object|null} - {grid, placements: [{slot, word, clue}]} or null
 */
async function solve(layout, wordList, onStep = null, maxSteps = 100000) {
  const { grid, slots } = layout;
  const intersections = buildIntersections(slots);

  // Check that every slot length has at least some candidates
  const wordsByLength = new Map();
  for (const entry of wordList) {
    const len = entry.word.length;
    if (!wordsByLength.has(len)) wordsByLength.set(len, []);
    wordsByLength.get(len).push(entry);
  }
  for (const slot of slots) {
    if (!(wordsByLength.get(slot.length) || []).length) return null;
  }

  const placements = new Array(slots.length).fill(null);
  const usedWords = new Set();
  let steps = 0;

  // Dynamic MRV: pick the unfilled slot with fewest current candidates
  function pickNextSlot() {
    let bestIdx = -1, bestCount = Infinity;
    for (let i = 0; i < slots.length; i++) {
      if (placements[i]) continue;
      const cands = getCandidates(slots[i], grid, wordsByLength);
      const available = cands.filter(c => !usedWords.has(c.word));
      if (available.length < bestCount) {
        bestCount = available.length;
        bestIdx = i;
        if (bestCount === 0) break; // Prune immediately
      }
    }
    return { idx: bestIdx, count: bestCount };
  }

  let filled = 0;
  const totalSlots = slots.length;

  async function backtrack() {
    if (filled === totalSlots) return true;
    if (steps >= maxSteps) return false;

    const { idx: si, count } = pickNextSlot();
    if (si === -1 || count === 0) return false;

    const slot = slots[si];
    let candidates = getCandidates(slot, grid, wordsByLength)
      .filter(c => !usedWords.has(c.word));

    // Shuffle for variety
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    // Limit branching to keep search tractable
    if (candidates.length > 50) candidates = candidates.slice(0, 50);

    for (const entry of candidates) {
      const prev = placeWord(grid, slot, entry.word);
      usedWords.add(entry.word);
      placements[si] = entry;
      filled++;
      steps++;

      if (onStep && steps % 5 === 0) {
        await onStep({
          action: 'place', slotIdx: si, word: entry.word,
          grid: grid.map(r => [...r]), steps
        });
      }

      // Forward check: all intersecting unfilled slots must still have options
      let viable = true;
      for (const ix of intersections[si]) {
        if (placements[ix.otherSlot]) continue;
        const otherCands = getCandidates(slots[ix.otherSlot], grid, wordsByLength);
        if (!otherCands.some(c => !usedWords.has(c.word))) {
          viable = false;
          break;
        }
      }

      if (viable && await backtrack()) return true;

      // Undo
      removeWord(grid, slot, prev);
      usedWords.delete(entry.word);
      placements[si] = null;
      filled--;
    }

    return false;
  }

  const success = await backtrack();
  if (!success) return null;

  return {
    grid: grid.map(r => [...r]),
    placements: slots.map((slot, i) => ({
      row: slot.row, col: slot.col, dir: slot.dir,
      word: placements[i].word, clue: placements[i].clue
    }))
  };
}

/**
 * Assign clue numbers to the grid (standard crossword numbering).
 */
function numberGrid(grid, slots) {
  const size = grid.length;
  const numbers = Array.from({ length: size }, () => Array(size).fill(0));
  let num = 1;

  // A cell gets a number if it starts an across or down word
  const slotStarts = new Set(slots.map(s => `${s.row},${s.col}`));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '#') continue;
      const startsAcross = slotStarts.has(`${r},${c}`) &&
        slots.some(s => s.row === r && s.col === c && s.dir === ACROSS);
      const startsDown = slotStarts.has(`${r},${c}`) &&
        slots.some(s => s.row === r && s.col === c && s.dir === DOWN);
      if (startsAcross || startsDown) {
        numbers[r][c] = num++;
      }
    }
  }

  return numbers;
}

/**
 * Organic crossword builder — places words one at a time, growing outward.
 * Works well with limited word lists where grid-first backtracking fails.
 * @param {Array} wordList - [{word, clue}]
 * @param {number} targetSize - max grid dimension
 * @param {function} onStep - callback for animation
 * @returns {object} - {grid, placements, size}
 */
/**
 * Score a word by how "crossword-friendly" its letters are.
 * Words with common letters (E,A,R,S,T,O,N,I,L) score higher
 * because they create more crossing opportunities.
 */
const LETTER_FREQ = {
  E: 13, A: 12, R: 11, S: 10, T: 9, O: 8, N: 7, I: 6, L: 5,
  C: 4, U: 4, D: 4, P: 3, M: 3, H: 3, G: 2, B: 2, F: 2,
  Y: 2, W: 2, K: 1, V: 1, X: 0, Z: 0, J: 0, Q: 0
};

function wordFreqScore(word) {
  let score = 0;
  for (const ch of word) score += (LETTER_FREQ[ch] || 0);
  return score / word.length;
}

async function buildOrganic(wordList, targetSize, onStep = null) {
  const cells = new Map(); // "r,c" -> letter
  const placed = [];
  const usedWords = new Set();
  let steps = 0;

  // Index words by length for gap-filling, and a Set for O(1) validity checks
  const byLen = new Map();
  const validWords = new Set();
  for (const e of wordList) {
    const len = e.word.length;
    if (!byLen.has(len)) byLen.set(len, []);
    byLen.get(len).push(e);
    validWords.add(e.word);
  }

  function getCell(r, c) { return cells.get(`${r},${c}`) || null; }
  function setCell(r, c, ch) { cells.set(`${r},${c}`, ch); }

  /**
   * Improved canPlace — relaxed adjacency rule.
   * Allows perpendicular adjacency IF the adjacent run forms a valid
   * word in the dictionary (checked via byLen lookup).
   */
  function canPlace(word, row, col, dir) {
    const dr = dir === ACROSS ? 0 : 1;
    const dc = dir === ACROSS ? 1 : 0;
    let crossings = 0;

    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i, c = col + dc * i;
      const existing = getCell(r, c);
      if (existing) {
        if (existing !== word[i]) return -1;
        crossings++;
      } else {
        // Check perpendicular adjacency
        const pr = dir === ACROSS ? 1 : 0, pc = dir === ACROSS ? 0 : 1;
        const above = getCell(r - pr, c - pc);
        const below = getCell(r + pr, c + pc);
        if (above || below) {
          // Adjacency exists — check if inserting this letter creates a valid
          // perpendicular word. Build the full perpendicular run.
          let run = word[i];
          let cr = r - pr, cc = c - pc;
          while (getCell(cr, cc)) { run = getCell(cr, cc) + run; cr -= pr; cc -= pc; }
          cr = r + pr; cc = c + pc;
          while (getCell(cr, cc)) { run += getCell(cr, cc); cr += pr; cc += pc; }
          // Check if this run is a valid word
          if (!validWords.has(run)) return -1;
        }
      }
    }
    // Check cells before and after the word
    if (getCell(row - dr, col - dc)) return -1;
    if (getCell(row + dr * word.length, col + dc * word.length)) return -1;
    if (placed.length > 0 && crossings === 0) return -1;
    return crossings;
  }

  function placePiece(entry, row, col, dir) {
    const dr = dir === ACROSS ? 0 : 1;
    const dc = dir === ACROSS ? 1 : 0;
    for (let i = 0; i < entry.word.length; i++)
      setCell(row + dr * i, col + dc * i, entry.word[i]);
    placed.push({ ...entry, row, col, dir });
    usedWords.add(entry.word);
  }

  function removePiece(idx) {
    const entry = placed[idx];
    const dr = entry.dir === ACROSS ? 0 : 1;
    const dc = entry.dir === ACROSS ? 1 : 0;
    // Only clear cells not shared with other words
    const otherCells = new Set();
    for (let j = 0; j < placed.length; j++) {
      if (j === idx) continue;
      const p = placed[j];
      const pdr = p.dir === ACROSS ? 0 : 1;
      const pdc = p.dir === ACROSS ? 1 : 0;
      for (let i = 0; i < p.word.length; i++)
        otherCells.add(`${p.row + pdr * i},${p.col + pdc * i}`);
    }
    for (let i = 0; i < entry.word.length; i++) {
      const key = `${entry.row + dr * i},${entry.col + dc * i}`;
      if (!otherCells.has(key)) cells.delete(key);
    }
    usedWords.delete(entry.word);
    placed.splice(idx, 1);
  }

  function fitsInBounds(row, col, dir, wordLen) {
    const dr = dir === ACROSS ? 0 : 1;
    const dc = dir === ACROSS ? 1 : 0;
    const endR = row + dr * (wordLen - 1);
    const endC = col + dc * (wordLen - 1);
    let tMinR = row, tMaxR = endR, tMinC = col, tMaxC = endC;
    for (const key of cells.keys()) {
      const [r, c] = key.split(',').map(Number);
      tMinR = Math.min(tMinR, r); tMaxR = Math.max(tMaxR, r);
      tMinC = Math.min(tMinC, c); tMaxC = Math.max(tMaxC, c);
    }
    return tMaxR - tMinR + 1 <= targetSize && tMaxC - tMinC + 1 <= targetSize;
  }

  /** Try to place a word, returns true if placed. */
  function tryPlace(entry) {
    let bestScore = -1, bestPos = null;
    for (const dir of [ACROSS, DOWN]) {
      const dr = dir === ACROSS ? 0 : 1;
      const dc = dir === ACROSS ? 1 : 0;
      for (const p of placed) {
        const pdir = p.dir;
        if (dir === pdir) continue;
        const pdr = pdir === ACROSS ? 0 : 1;
        const pdc = pdir === ACROSS ? 1 : 0;
        for (let pi = 0; pi < p.word.length; pi++) {
          for (let ei = 0; ei < entry.word.length; ei++) {
            if (p.word[pi] !== entry.word[ei]) continue;
            const crossR = p.row + pdr * pi, crossC = p.col + pdc * pi;
            const startR = crossR - dr * ei, startC = crossC - dc * ei;
            const score = canPlace(entry.word, startR, startC, dir);
            if (score > bestScore && fitsInBounds(startR, startC, dir, entry.word.length)) {
              bestScore = score;
              bestPos = { row: startR, col: startC, dir };
            }
          }
        }
      }
    }
    if (bestPos) {
      placePiece(entry, bestPos.row, bestPos.col, bestPos.dir);
      steps++;
      return true;
    }
    return false;
  }

  // ── Improvement 3: Sort by letter frequency (common letters first) ──
  const sorted = [...wordList].sort((a, b) => wordFreqScore(b.word) - wordFreqScore(a.word));
  // Shuffle within frequency tiers for variety
  for (let i = 0; i < sorted.length; i += 20) {
    const end = Math.min(i + 20, sorted.length);
    for (let j = end - 1; j > i; j--) {
      const k = i + Math.floor(Math.random() * (j - i + 1));
      [sorted[j], sorted[k]] = [sorted[k], sorted[j]];
    }
  }

  // Place first word at origin
  placePiece(sorted[0], 0, 0, ACROSS);

  // ── Main placement pass ──────────────────────────────────────────────
  for (let wi = 1; wi < sorted.length; wi++) {
    const entry = sorted[wi];
    if (usedWords.has(entry.word)) continue;
    tryPlace(entry);
  }

  // ── Improvement 4: Limited backtracking ──────────────────────────────
  // Build cell→word index for fast crossing counts
  function getCrossingCount(idx) {
    const p = placed[idx];
    const dr = p.dir === ACROSS ? 0 : 1;
    const dc = p.dir === ACROSS ? 1 : 0;
    let cx = 0;
    for (let j = 0; j < p.word.length; j++) {
      const r = p.row + dr * j, c = p.col + dc * j;
      // A cell is shared if another word in the OTHER direction also covers it
      for (const q of placed) {
        if (q === p) continue;
        if (q.dir === p.dir) continue;
        const qdr = q.dir === ACROSS ? 0 : 1;
        const qdc = q.dir === ACROSS ? 1 : 0;
        for (let l = 0; l < q.word.length; l++) {
          if (q.row + qdr * l === r && q.col + qdc * l === c) { cx++; break; }
        }
      }
    }
    return cx;
  }

  // Try removing lightly-connected words and fitting 2+ in their place
  for (let trial = 0; trial < 10; trial++) {
    let worstIdx = -1, worstCx = Infinity;
    for (let i = 1; i < placed.length; i++) {
      const cx = getCrossingCount(i);
      if (cx < worstCx) { worstCx = cx; worstIdx = i; }
    }
    if (worstIdx < 0 || worstCx > 1) break;

    const removed = { ...placed[worstIdx] };
    const countBefore = placed.length;
    removePiece(worstIdx);

    let added = 0;
    for (const entry of sorted) {
      if (usedWords.has(entry.word)) continue;
      if (tryPlace(entry)) added++;
      if (added >= 3) break;
    }

    // Keep if net gain, otherwise restore
    if (added < 2) {
      // Undo: remove the new words and restore the original
      while (placed.length > countBefore - 1) removePiece(placed.length - 1);
      placePiece(removed, removed.row, removed.col, removed.dir === ACROSS ? ACROSS : DOWN);
    }
  }

  // ── Improvement 1: Gap-filling pass ──────────────────────────────────
  // Scan the grid for empty runs adjacent to existing letters and try to fill them
  const { grid: tempGrid, size: tempSize, offsetR, offsetC } = buildGrid(cells, placed, targetSize);

  // Adjust placed coordinates to grid space for gap scanning
  for (const p of placed) { p.row += offsetR; p.col += offsetC; }
  // Rebuild cells in grid coordinates
  cells.clear();
  for (const p of placed) {
    const dr = p.dir === ACROSS ? 0 : 1;
    const dc = p.dir === ACROSS ? 1 : 0;
    for (let i = 0; i < p.word.length; i++)
      setCell(p.row + dr * i, p.col + dc * i, p.word[i]);
  }

  // Find gaps: runs of empty cells (in grid coords) bordered by letters
  for (let pass = 0; pass < 3; pass++) {
    let filled = false;
    for (const dir of [ACROSS, DOWN]) {
      const dr = dir === ACROSS ? 0 : 1;
      const dc = dir === ACROSS ? 1 : 0;
      const primary = dir === ACROSS ? tempSize : tempSize;
      const secondary = dir === ACROSS ? tempSize : tempSize;

      for (let a = 0; a < tempSize; a++) {
        for (let startB = 0; startB < tempSize; startB++) {
          const r0 = dir === ACROSS ? a : startB;
          const c0 = dir === ACROSS ? startB : a;
          if (getCell(r0, c0)) continue; // not empty

          // Find the run of empty cells
          let len = 0;
          let r = r0, c = c0;
          while (r >= 0 && r < tempSize && c >= 0 && c < tempSize && !getCell(r, c)) {
            len++; r += dr; c += dc;
          }
          if (len < 3 || len > 15) continue;

          // Check if bordered by existing content (at least one adjacent letter)
          let hasAdjacent = false;
          for (let i = 0; i < len; i++) {
            const cr = r0 + dr * i, cc = c0 + dc * i;
            const pr = dir === ACROSS ? 1 : 0, pc = dir === ACROSS ? 0 : 1;
            if (getCell(cr - pr, cc - pc) || getCell(cr + pr, cc + pc)) { hasAdjacent = true; break; }
          }
          if (!hasAdjacent) continue;

          // Try to place a word here
          const candidates = byLen.get(len) || [];
          for (const entry of candidates) {
            if (usedWords.has(entry.word)) continue;
            const score = canPlace(entry.word, r0, c0, dir);
            if (score >= 0) {
              placePiece(entry, r0, c0, dir);
              steps++;
              filled = true;
              break;
            }
          }
        }
      }
    }
    if (!filled) break;
  }

  // Build final grid
  const finalGrid = Array.from({ length: tempSize }, () => Array(tempSize).fill('#'));
  for (const [key, letter] of cells) {
    const [r, c] = key.split(',').map(Number);
    if (r >= 0 && r < tempSize && c >= 0 && c < tempSize) finalGrid[r][c] = letter;
  }

  const slots = placed.map(p => ({
    row: p.row, col: p.col, dir: p.dir,
    length: p.word.length,
    cells: Array.from({ length: p.word.length }, (_, i) =>
      p.dir === ACROSS ? [p.row, p.col + i] : [p.row + i, p.col])
  }));

  const numbers = numberGrid(finalGrid, slots);

  if (onStep) {
    await onStep({
      action: 'place', slotIdx: placed.length - 1,
      word: `${placed.length} words`, grid: finalGrid, steps
    });
  }

  return {
    grid: finalGrid, size: tempSize, numbers,
    placements: placed.map(p => ({
      row: p.row, col: p.col, dir: p.dir, word: p.word, clue: p.clue
    }))
  };
}

function buildGrid(cells, placed, targetSize) {
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const key of cells.keys()) {
    const [r, c] = key.split(',').map(Number);
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  }
  const rawH = maxR - minR + 1, rawW = maxC - minC + 1;
  const size = Math.max(targetSize, rawH, rawW);
  const offsetR = Math.floor((size - rawH) / 2) - minR;
  const offsetC = Math.floor((size - rawW) / 2) - minC;
  const grid = Array.from({ length: size }, () => Array(size).fill('#'));
  for (const [key, letter] of cells) {
    const [r, c] = key.split(',').map(Number);
    grid[r + offsetR][c + offsetC] = letter;
  }
  return { grid, size, offsetR, offsetC };
}

/**
 * Check if a grid's black squares have 180° rotational symmetry.
 */
/**
 * Count how many black-square pairs violate 180° rotational symmetry.
 * Returns 0 for perfect symmetry.
 */
function symmetryViolations(grid) {
  const size = grid.length;
  let violations = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if ((grid[r][c] === '#') !== (grid[size - 1 - r][size - 1 - c] === '#'))
        violations++;
  return violations / 2; // each mismatch is counted twice (r,c) and (sr,sc)
}

function isSymmetric(grid, tolerance = 0) {
  return symmetryViolations(grid) <= tolerance;
}

/**
 * Symmetric organic builder — places words in mirror pairs so the black
 * square pattern always has 180° rotational symmetry.
 *
 * Strategy:
 * 1. Work on a fixed-size grid. Track which cells are "committed white"
 *    (have a letter) and "committed black" (explicitly black).
 * 2. Place the first word through the center.
 * 3. For each subsequent word, find placements that cross existing words.
 *    After placing, mirror the word's footprint: if the mirror cells are
 *    uncommitted, mark them as "need letter" (white). Then immediately
 *    try to fill those mirror cells with another word.
 * 4. If we can't fill the mirror, undo and try the next candidate.
 *
 * @param {Array} wordList - [{word, clue}]
 * @param {number} size - grid dimension
 * @param {object} opts - { minWords, maxAttempts, onStep }
 * @returns {object|null}
 */
async function buildSymmetric(wordList, size, opts = {}) {
  const { minWords = 15, maxAttempts = 300, onStep = null, symmetryTolerance = 0 } = opts;
  let best = null;

  // Index words for mirror filling
  const byLenMap = new Map();
  const validSet = new Set();
  for (const e of wordList) {
    const len = e.word.length;
    if (!byLenMap.has(len)) byLenMap.set(len, []);
    byLenMap.get(len).push(e);
    validSet.add(e.word);
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = Array.from({ length: size }, () => Array(size).fill('#'));
    const placed = [];
    const usedWords = new Set();

    function getCell(r, c) {
      if (r < 0 || r >= size || c < 0 || c >= size) return '#';
      return grid[r][c];
    }

    function canPlaceWord(word, row, col, dir) {
      const dr = dir === ACROSS ? 0 : 1;
      const dc = dir === ACROSS ? 1 : 0;
      let crossings = 0;
      for (let i = 0; i < word.length; i++) {
        const r = row + dr * i, c = col + dc * i;
        if (r < 0 || r >= size || c < 0 || c >= size) return false;
        const cell = grid[r][c];
        if (cell === '#') {
          const pr = dir === ACROSS ? 1 : 0, pc = dir === ACROSS ? 0 : 1;
          if (getCell(r - pr, c - pc) !== '#') return false;
          if (getCell(r + pr, c + pc) !== '#') return false;
        } else if (cell === word[i]) {
          crossings++;
        } else {
          return false;
        }
      }
      if (getCell(row - dr, col - dc) !== '#') return false;
      if (getCell(row + dr * word.length, col + dc * word.length) !== '#') return false;
      return placed.length === 0 || crossings > 0;
    }

    function placeWord(entry, row, col, dir) {
      const dr = dir === ACROSS ? 0 : 1;
      const dc = dir === ACROSS ? 1 : 0;
      for (let i = 0; i < entry.word.length; i++)
        grid[row + dr * i][col + dc * i] = entry.word[i];
      placed.push({ ...entry, row, col, dir: dir === ACROSS ? 'across' : 'down' });
      usedWords.add(entry.word);
    }

    function undoLast() {
      const entry = placed.pop();
      const dr = entry.dir === 'across' ? 0 : 1;
      const dc = entry.dir === 'across' ? 1 : 0;
      const otherCells = new Set();
      for (const p of placed) {
        const pdr = p.dir === 'across' ? 0 : 1;
        const pdc = p.dir === 'across' ? 1 : 0;
        for (let i = 0; i < p.word.length; i++)
          otherCells.add(`${p.row + pdr * i},${p.col + pdc * i}`);
      }
      for (let i = 0; i < entry.word.length; i++) {
        const r = entry.row + dr * i, c = entry.col + dc * i;
        if (!otherCells.has(`${r},${c}`)) grid[r][c] = '#';
      }
      usedWords.delete(entry.word);
    }

    function tryMirrorFill(row, col, dir, wordLen) {
      const dr = dir === ACROSS ? 0 : 1;
      const dc = dir === ACROSS ? 1 : 0;
      const endR = row + dr * (wordLen - 1);
      const endC = col + dc * (wordLen - 1);
      const mirStartR = size - 1 - endR;
      const mirStartC = size - 1 - endC;

      let alreadyFilled = true;
      for (let i = 0; i < wordLen; i++) {
        const r = mirStartR + dr * i, c = mirStartC + dc * i;
        if (r < 0 || r >= size || c < 0 || c >= size) return false;
        if (grid[r][c] === '#') { alreadyFilled = false; break; }
      }
      if (alreadyFilled) return true;

      const candidates = (byLenMap.get(wordLen) || []).filter(e => !usedWords.has(e.word));
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      for (const entry of candidates) {
        if (canPlaceWord(entry.word, mirStartR, mirStartC, dir)) {
          placeWord(entry, mirStartR, mirStartC, dir);
          return true;
        }
      }
      return false;
    }

    // Shuffle
    const shuffled = [...wordList].sort(() => Math.random() - 0.5);

    // Place first word through center
    const center = Math.floor(size / 2);
    const firstWord = shuffled.find(e => e.word.length >= 3 && e.word.length <= size);
    if (!firstWord) continue;
    const startCol = center - Math.floor(firstWord.word.length / 2);
    if (canPlaceWord(firstWord.word, center, startCol, ACROSS)) {
      placeWord(firstWord, center, startCol, ACROSS);
      tryMirrorFill(center, startCol, ACROSS, firstWord.word.length);
    }

    // Phase 1: paired placements (strict symmetry)
    for (const entry of shuffled) {
      if (usedWords.has(entry.word) || placed.length >= 80) continue;
      for (const dir of [ACROSS, DOWN]) {
        let done = false;
        const dr = dir === ACROSS ? 0 : 1;
        const dc = dir === ACROSS ? 1 : 0;
        for (const p of [...placed]) {
          if (done) break;
          const pdir = p.dir === 'across' ? ACROSS : DOWN;
          if (dir === pdir) continue;
          const pdr = pdir === ACROSS ? 0 : 1;
          const pdc = pdir === ACROSS ? 1 : 0;
          for (let pi = 0; pi < p.word.length && !done; pi++) {
            for (let ei = 0; ei < entry.word.length && !done; ei++) {
              if (p.word[pi] !== entry.word[ei]) continue;
              const sR = p.row + pdr * pi - dr * ei;
              const sC = p.col + pdc * pi - dc * ei;
              if (!canPlaceWord(entry.word, sR, sC, dir)) continue;
              placeWord(entry, sR, sC, dir);
              if (tryMirrorFill(sR, sC, dir, entry.word.length)) {
                done = true;
              } else {
                undoLast();
              }
            }
          }
        }
        if (done) break;
      }
    }

    // Phase 2: unpaired placements (use tolerance budget for extra density)
    if (symmetryTolerance > 0) {
      for (const entry of shuffled) {
        if (usedWords.has(entry.word) || placed.length >= 80) continue;
        if (symmetryViolations(grid) >= symmetryTolerance) break;
        for (const dir of [ACROSS, DOWN]) {
          let done = false;
          const dr = dir === ACROSS ? 0 : 1;
          const dc = dir === ACROSS ? 1 : 0;
          for (const p of [...placed]) {
            if (done) break;
            const pdir = p.dir === 'across' ? ACROSS : DOWN;
            if (dir === pdir) continue;
            const pdr = pdir === ACROSS ? 0 : 1;
            const pdc = pdir === ACROSS ? 1 : 0;
            for (let pi = 0; pi < p.word.length && !done; pi++) {
              for (let ei = 0; ei < entry.word.length && !done; ei++) {
                if (p.word[pi] !== entry.word[ei]) continue;
                const sR = p.row + pdr * pi - dr * ei;
                const sC = p.col + pdc * pi - dc * ei;
                if (!canPlaceWord(entry.word, sR, sC, dir)) continue;
                placeWord(entry, sR, sC, dir);
                // Check if we're still within budget
                if (symmetryViolations(grid) <= symmetryTolerance) {
                  done = true;
                } else {
                  undoLast();
                }
              }
            }
          }
          if (done) break;
        }
      }
    }

    // Check result
    if (placed.length >= minWords && isSymmetric(grid, symmetryTolerance)) {
      const slots = placed.map(p => ({
        row: p.row, col: p.col, dir: p.dir,
        length: p.word.length,
        cells: Array.from({ length: p.word.length }, (_, i) =>
          p.dir === 'across' ? [p.row, p.col + i] : [p.row + i, p.col])
      }));
      const numbers = numberGrid(grid, slots);
      const result = { grid, size, numbers,
        placements: placed.map(p => ({ row: p.row, col: p.col, dir: p.dir, word: p.word, clue: p.clue }))
      };
      if (!best || result.placements.length > best.placements.length) {
        best = result;
        if (onStep) {
          await onStep({ action: 'place', slotIdx: 0,
            word: `(${symmetryViolations(grid)} violations, ${placed.length} words)`,
            grid: grid.map(r => [...r]), steps: attempt });
        }
      }
      if (best.placements.length >= minWords + 10) break;
    }
  }

  return best;
}

export {
  ACROSS, DOWN,
  createGrid, generateLayout, findSlots,
  buildIntersections, solve, numberGrid,
  buildOrganic, buildSymmetric, isSymmetric, symmetryViolations,
  isConnected, setBlack
};
