/* ═══════════════════════════════════════════════════════════════════
   Try-it tokenizer — an illustrative simulation, not a live model.

   The one real, measured example (6 tokens vs 15, from MicroG's own
   benchmarks) stays as static markup right above this. This widget is
   a separate, clearly-labelled toy: it approximates the *pattern* of
   that measured result — chunky morpheme-sized pieces vs diacritics
   shattered into broken fragments — on whatever the visitor types.
   Keeping the two visually and textually distinct is the point: a
   simulation dressed up as a measurement would break the page's own
   "measured, not assumed" rule.
   ═══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const input = document.getElementById('tokDemoInput');
  const oursRow = document.getElementById('tokDemoOurs');
  const gptRow = document.getElementById('tokDemoGpt');
  const oursCount = document.getElementById('tokDemoOursCount');
  const gptCount = document.getElementById('tokDemoGptCount');
  if (!input || !oursRow || !gptRow) return;

  const VOWELS = 'aeiouyąęó';
  const DIACRITICS = 'ąćęłńóśźż';

  // Chunky, syllable-ish pieces: walk the word and cut after a vowel once a
  // run has reached a few characters — a rough stand-in for a handful of
  // BPE merges landing on morpheme-sized units.
  function splitOurs(word) {
    const chunks = [];
    let cur = '';
    for (const ch of word) {
      cur += ch;
      if (cur.length >= 4 && VOWELS.includes(ch.toLowerCase())) {
        chunks.push(cur);
        cur = '';
      }
    }
    if (cur) chunks.push(cur);
    return chunks.length ? chunks : [word];
  }

  // Every diacritic becomes its own piece (standing in for the documented
  // "splits every diacritic into two broken bytes"), everything else is cut
  // every two characters — a byte-level tokenizer fitted to English chews
  // Polish into far more, far smaller pieces.
  function splitGpt(word) {
    const pieces = [];
    let i = 0;
    while (i < word.length) {
      const ch = word[i];
      if (DIACRITICS.includes(ch.toLowerCase())) {
        pieces.push(ch);
        i += 1;
      } else {
        pieces.push(word.slice(i, i + 2));
        i += 2;
      }
    }
    return pieces;
  }

  function render(row, countEl, words, splitter) {
    row.innerHTML = '';
    let total = 0;
    words.forEach((word) => {
      splitter(word).forEach((piece) => {
        const span = document.createElement('span');
        span.textContent = piece;
        row.appendChild(span);
        total += 1;
      });
    });
    countEl.textContent = `${total} token${total === 1 ? '' : 's'}`;
    return total;
  }

  function update() {
    const text = input.value.trim();
    const words = text.length ? text.split(/\s+/) : [];
    render(oursRow, oursCount, words, splitOurs);
    render(gptRow, gptCount, words, splitGpt);
  }

  input.addEventListener('input', update);
  update();
})();
