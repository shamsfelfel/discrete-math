/* =========================================================
   Discrete Math study site — shared lesson runtime
   Used by all lesson HTML files. Reads window.LESSON_DATA
   and window.UI_STRINGS (set by each page) and builds the UI.
   ========================================================= */
(function(){
  'use strict';

  const DATA = window.LESSON_DATA;
  const T    = window.UI_STRINGS || {};
  const LANG = document.documentElement.lang || 'en';
  const RTL  = document.documentElement.dir === 'rtl';

  const $  = (s, r=document) => r.querySelector(s);
  const el = (tag, attrs={}, ...kids) => {
    const n = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    kids.flat().forEach(k => n.append(k && k.nodeType ? k : document.createTextNode(k)));
    return n;
  };

  // Inline-symbol marker: @text@ becomes <span class="sym">text</span>
  function fmtInline(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/@([^@]+)@/g, '<span class="sym">$1</span>');
  }

  // ======== SCHEMA NORMALIZATION ========
  // Two authoring formats exist in the project:
  //   ch01 — { concepts:[{title, body:[{type,...}], examples:[{label,body}]}],
  //            questions:[{id,type,level:1..3,prompt,...,explanation}] }
  //   ch02 — { cards:[{title, blocks:[{def|p|ul|ol|table|note|example|mermaid}]}],
  //            subtitle, questions:[{type:'fill'|...,level:'basic'|...,q,...,explain}] }
  // The renderer below speaks the ch01 shape; normalize ch02 data into it so a
  // single code path drives both chapters. Idempotent for data already in ch01 form.
  (function normalize() {
    if (!DATA || typeof DATA !== 'object') return;

    if (DATA.chapter == null && typeof DATA.id === 'string') DATA.chapter = DATA.id.split('.')[0];
    if (DATA.lede == null && DATA.subtitle != null) DATA.lede = DATA.subtitle;

    // qLevels may be an object {basic,applied,challenge}; the header wants an array.
    if (T.qLevels && !Array.isArray(T.qLevels)) {
      T.qLevels = [T.qLevels.basic, T.qLevels.applied, T.qLevels.challenge];
    }

    function normBlock(b) {
      if (!b || typeof b !== 'object') return b;
      if (b.type) return b;                                  // already ch01-style
      if (b.p != null)       return { type: 'p',   text: b.p };
      if (b.def)             return { type: 'def', text: (b.def.term ? '<strong>' + b.def.term + '.</strong> ' : '') + (b.def.text || '') };
      if (b.ul)              return { type: 'ul',  items: b.ul };
      if (b.ol)              return { type: 'ol',  items: b.ol };
      if (b.table)           return { type: 'table', headers: b.table.head || b.table.headers || [], rows: b.table.rows || [] };
      if (b.note)            return { type: 'note', kind: b.note.kind || 'tip', text: b.note.text || '' };
      if (b.example)         return { type: 'example', title: b.example.title || '', blocks: (b.example.blocks || []).map(normBlock) };
      if (b.mermaid != null) return { type: 'mermaid', code: b.mermaid };
      return b;
    }

    if (!Array.isArray(DATA.concepts) && Array.isArray(DATA.cards)) {
      DATA.concepts = DATA.cards.map((c, i) => ({
        id: c.id || ('c' + (i + 1)),
        title: c.title || '',
        body: Array.isArray(c.body) ? c.body
            : Array.isArray(c.blocks) ? c.blocks.map(normBlock) : [],
        examples: Array.isArray(c.examples) ? c.examples : []
      }));
    }

    const LV = { basic: 1, applied: 2, challenge: 3 };
    if (Array.isArray(DATA.questions)) {
      DATA.questions = DATA.questions.map((q, i) => {
        const o = Object.assign({}, q);
        if (o.id == null) o.id = 'q' + (i + 1);
        if (o.type === 'fill') o.type = 'fillblank';
        if (o.prompt == null && o.q != null) o.prompt = o.q;
        if (o.explanation == null && o.explain != null) o.explanation = o.explain;
        if (typeof o.level !== 'number') o.level = LV[o.level] || 1;

        if (o.type === 'short') {
          // ch02 short answers carry a model answer in `answer` (no canonical/acceptable).
          if (o.canonical == null && !Array.isArray(o.acceptable) && o.answer != null) o.canonical = o.answer;
        } else if (o.type === 'reorder') {
          // ch02 lists reorder items already in the correct order, with no answer[].
          if (!Array.isArray(o.answer) && Array.isArray(o.items)) o.answer = o.items.map((_, k) => k);
        } else if (o.type === 'fillblank') {
          // ch02 puts [[n]] placeholders in the prompt and a flat blanks[] array.
          if (o.template == null) {
            if (/\[\[/.test(o.prompt || '')) { o.template = o.prompt; o.prompt = ''; }
            else if (/\[\[/.test(o.q || '')) { o.template = o.q; o.prompt = ''; }
          }
          if (Array.isArray(o.blanks) && o.blanks.length && typeof o.blanks[0] !== 'object') {
            o.blanks = o.blanks.map((e, k) => Array.isArray(e)
              ? { id: String(k + 1), type: 'input', answer: e[0], acceptable: e }
              : { id: String(k + 1), type: 'input', answer: e, acceptable: [e] });
          } else if (Array.isArray(o.blanks)) {
            o.blanks = o.blanks.map((b, k) => Object.assign({ id: String(k + 1), type: 'input' }, b));
          }
        }
        return o;
      });
    }
  })();

  // ======== HEADER ========
  document.title = `${DATA.id} ${DATA.title} — ${T.siteTitle || 'Discrete Mathematics'}`;
  $('#kicker').textContent = (T.kickerPrefix || 'Chapter') + ' ' + DATA.chapter + ' · ' + (T.lesson || 'Lesson') + ' ' + DATA.id;
  $('#title').textContent = DATA.title;
  $('#lede').innerHTML = fmtInline(DATA.lede);
  const cb = $('#crumb-current'); if (cb) cb.textContent = DATA.id;

  // ======== CONCEPTS ========
  const concepts = $('#concepts');
  DATA.concepts.forEach(c => {
    const card = el('div', { class: 'card flash', id: 'concept-' + c.id });
    card.append(el('h3', {}, c.title));
    c.body.forEach(b => renderBlock(b, card));
    if (c.examples && c.examples.length) {
      c.examples.forEach(ex => {
        const e = el('div', { class: 'example' });
        e.append(el('div', { class: 'ex-label' }, ex.label));
        e.append(el('div', { class: 'ex-body', html: fmtInline(ex.body) }));
        card.append(e);
      });
    }
    concepts.append(card);
  });

  // Render a single concept block into `host`. Hoisted, so it is callable above.
  function renderBlock(b, host) {
    if (!b) return;
    if (b.type === 'p')   host.append(el('p',   { html: fmtInline(b.text) }));
    else if (b.type === 'def') host.append(el('div', { class: 'definition', html: fmtInline(b.text) }));
    else if (b.type === 'ol') {
      const ol = el('ol');
      b.items.forEach(it => ol.append(el('li', { html: fmtInline(it) })));
      host.append(ol);
    } else if (b.type === 'ul') {
      const ul = el('ul');
      b.items.forEach(it => ul.append(el('li', { html: fmtInline(it) })));
      host.append(ul);
    } else if (b.type === 'truthTable') {
      const wrap = el('div', { class: 'tt-wrap' });
      const t = el('table', { class: 'tt' });
      const thead = el('thead'), trh = el('tr');
      b.headers.forEach(h => trh.append(el('th', { html: fmtInline(h) })));
      thead.append(trh); t.append(thead);
      const tbody = el('tbody');
      b.rows.forEach(row => {
        const tr = el('tr');
        row.forEach(cell => {
          const cls = cell === 'T' ? 't' : (cell === 'F' ? 'f' : '');
          tr.append(el('td', { class: cls }, cell));
        });
        tbody.append(tr);
      });
      t.append(tbody); wrap.append(t); host.append(wrap);
    } else if (b.type === 'table') {
      // Generic data table (cells may contain inline HTML), distinct from truthTable.
      const wrap = el('div', { class: 'tt-wrap' });
      const t = el('table', { class: 'tt' });
      const thead = el('thead'), trh = el('tr');
      (b.headers || []).forEach(h => trh.append(el('th', { html: fmtInline(h) })));
      thead.append(trh); t.append(thead);
      const tbody = el('tbody');
      (b.rows || []).forEach(row => {
        const tr = el('tr');
        row.forEach(cell => tr.append(el('td', { html: fmtInline(cell) })));
        tbody.append(tr);
      });
      t.append(tbody); wrap.append(t); host.append(wrap);
    } else if (b.type === 'note') {
      host.append(el('div', { class: 'note note-' + (b.kind || 'tip'), html: fmtInline(b.text) }));
    } else if (b.type === 'example') {
      const e = el('div', { class: 'example' });
      if (b.title) e.append(el('div', { class: 'ex-label' }, b.title));
      const body = el('div', { class: 'ex-body' });
      (b.blocks || []).forEach(sb => renderBlock(sb, body));
      e.append(body);
      host.append(e);
    } else if (b.type === 'mermaid') {
      host.append(el('div', { class: 'diagram mermaid' }, b.code));
    }
  }

  // ======== QUESTIONS ========
  const qBox = $('#questions');
  DATA.questions.forEach((q, idx) => {
    const card = el('div', { class: 'question', id: 'q-' + q.id });

    const head = el('div', { class: 'q-head' });
    head.append(el('span', { class: 'q-num' }, (T.q || 'Q') + (idx + 1)));
    head.append(el('span', { class: 'q-type' }, (T.qTypes && T.qTypes[q.type]) || q.type.toUpperCase()));
    const lvLabels = T.qLevels || ['Basic','Applied','Challenge'];
    head.append(el('span', { class: 'q-level', 'data-lv': q.level }, lvLabels[q.level-1]));
    card.append(head);

    card.append(el('div', { class: 'q-prompt', html: fmtInline(q.prompt) }));

    const body = el('div');
    if (q.type === 'mcq')         renderMCQ(q, body);
    else if (q.type === 'tf')     renderTF(q, body);
    else if (q.type === 'short')  renderShort(q, body);
    else if (q.type === 'reorder')renderReorder(q, body);
    else if (q.type === 'fillblank') renderFillBlank(q, body);
    card.append(body);

    const actions = el('div', { class: 'q-actions' });
    actions.append(el('button', { class: 'qbtn primary', onclick: () => checkAnswer(q, card) }, T.btnCheck || 'Check answer'));
    actions.append(el('button', { class: 'qbtn',         onclick: () => revealAnswer(q, card) }, T.btnReveal || 'Show answer'));
    actions.append(el('button', { class: 'qbtn',         onclick: () => toggleHint(q, card) },   T.btnHint || 'Hint'));
    if (q.moreExamples && q.moreExamples.length)
      actions.append(el('button', { class: 'qbtn', onclick: () => toggleMore(q, card) }, T.btnMore || 'More examples'));
    card.append(actions);

    qBox.append(card);
  });

  // -- MCQ
  function renderMCQ(q, host) {
    const opts = el('div', { class: 'options' });
    q.options.forEach((text, i) => {
      const lbl = el('label', { class: 'opt' });
      lbl.append(el('input', { type: 'radio', name: q.id, value: i }));
      lbl.append(el('span', { class: 'opt-text', html: fmtInline(text) }));
      opts.append(lbl);
    });
    host.append(opts);
  }

  // -- TF
  function renderTF(q, host) {
    const opts = el('div', { class: 'options' });
    [['true', T.true || 'True'], ['false', T.false || 'False']].forEach(([v, label]) => {
      const lbl = el('label', { class: 'opt' });
      lbl.append(el('input', { type: 'radio', name: q.id, value: v }));
      lbl.append(el('span', { class: 'opt-text' }, label));
      opts.append(lbl);
    });
    host.append(opts);
  }

  // -- Short answer (with optional symbol palette)
  function renderShort(q, host) {
    if (q.palette) host.append(buildPalette(q.palette, () => host.querySelector('.text-input')));
    host.append(el('input', { class: 'text-input', type: 'text', placeholder: T.typeAnswer || 'Type your answer…' }));
  }

  // -- Reorder (drag and drop)
  function renderReorder(q, host) {
    const shuffled = q.items.map((t, i) => ({ t, i })).sort(() => Math.random() - 0.5);
    const list = el('div', { class: 'reorder-list', 'data-q': q.id });
    shuffled.forEach(({ t, i }, pos) => {
      const item = el('div', {
        class: 'reorder-item',
        draggable: 'true',
        'data-orig': i
      });
      item.append(el('span', { class: 'grip' }, '⋮⋮'));
      item.append(el('span', { class: 'step-num' }, (T.step || 'Step') + ' ' + (pos + 1)));
      item.append(el('span', {}, t));
      list.append(item);
    });
    attachDnD(list);
    host.append(list);
  }

  function attachDnD(list) {
    let dragged = null;
    list.addEventListener('dragstart', e => {
      const item = e.target.closest('.reorder-item');
      if (!item) return;
      dragged = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    list.addEventListener('dragend', e => {
      const item = e.target.closest('.reorder-item');
      if (item) item.classList.remove('dragging');
      list.querySelectorAll('.drop-over').forEach(n => n.classList.remove('drop-over'));
      renumber(list);
      dragged = null;
    });
    list.addEventListener('dragover', e => {
      e.preventDefault();
      const over = e.target.closest('.reorder-item');
      if (!over || over === dragged) return;
      list.querySelectorAll('.drop-over').forEach(n => n.classList.remove('drop-over'));
      over.classList.add('drop-over');
      const r = over.getBoundingClientRect();
      const after = (e.clientY - r.top) > r.height / 2;
      if (after) over.after(dragged); else over.before(dragged);
    });
  }

  function renumber(list) {
    list.querySelectorAll('.reorder-item').forEach((it, i) => {
      it.querySelector('.step-num').textContent = (T.step || 'Step') + ' ' + (i + 1);
    });
  }

  // -- Fill in blank
  function renderFillBlank(q, host) {
    if (q.palette) host.append(buildPalette(q.palette, () => host.querySelector('.blank-input.text')));
    const wrap = el('div', { class: 'fib-line' });
    const lines = q.template.split(/\n/);
    lines.forEach((ln, idx) => {
      const parts = ln.split(/(\[\[[^\]]+\]\])/);
      parts.forEach(part => {
        const m = part.match(/^\[\[([^\]]+)\]\]$/);
        if (m) {
          const blank = q.blanks.find(b => b.id === m[1]);
          if (!blank) return;
          if (blank.type === 'select') {
            const sel = el('select', { class: 'blank-input', 'data-blank': blank.id });
            sel.append(el('option', { value: '' }, '—'));
            blank.options.forEach(o => sel.append(el('option', { value: o }, o)));
            wrap.append(sel);
          } else {
            wrap.append(el('input', {
              class: 'blank-input text',
              type: 'text',
              placeholder: '?',
              'data-blank': blank.id
            }));
          }
        } else {
          wrap.append(document.createTextNode(part));
        }
      });
      if (idx < lines.length - 1) wrap.append(el('br'));
    });
    host.append(wrap);
  }

  // -- Symbol palette
  function buildPalette(symbols, getInput) {
    const pal = el('div', { class: 'palette' });
    pal.append(el('div', { class: 'palette-label' }, T.symbols || 'Symbols'));
    symbols.forEach(s => {
      pal.append(el('button', {
        class: 'pkey',
        type: 'button',
        onclick: () => insertAtCursor(getInput(), s)
      }, s));
    });
    return pal;
  }

  function insertAtCursor(input, text) {
    if (!input) return;
    input.focus();
    const start = input.selectionStart ?? input.value.length;
    const end   = input.selectionEnd   ?? input.value.length;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    const pos = start + text.length;
    input.setSelectionRange(pos, pos);
  }

  // ======== ANSWER CHECKING ========
  function normalize(s) {
    return (s || '')
      .replace(/\s+/g, '')
      .replace(/~/g, '¬').replace(/!/g, '¬')
      .replace(/<->/g, '↔')
      .replace(/->/g, '→').replace(/-->/g, '→')
      .replace(/&&|&/g, '∧').replace(/\|\|/g, '∨')
      .replace(/\bv\b/gi, '∨')
      .toLowerCase();
  }

  function checkAnswer(q, card) {
    let correct = false, expected = null;
    if (q.type === 'mcq' || q.type === 'tf') {
      const sel = card.querySelector(`input[name="${q.id}"]:checked`);
      if (!sel) { showFeedback(card, 'hint', T.selectFirst || 'Select an option first.'); return; }
      if (q.type === 'mcq') {
        correct = parseInt(sel.value, 10) === q.answer;
        expected = q.options[q.answer];
      } else {
        correct = (sel.value === 'true') === q.answer;
        expected = q.answer ? (T.true || 'True') : (T.false || 'False');
      }
      card.querySelectorAll('.opt').forEach(o => {
        o.classList.remove('correct','wrong');
        const r = o.querySelector('input');
        if (q.type === 'mcq') {
          if (parseInt(r.value, 10) === q.answer) o.classList.add('correct');
          else if (r.checked) o.classList.add('wrong');
        } else {
          if ((r.value === 'true') === q.answer) o.classList.add('correct');
          else if (r.checked) o.classList.add('wrong');
        }
      });
    }
    else if (q.type === 'short') {
      const inp = card.querySelector('.text-input');
      const userAnswer = inp.value.trim();
      if (!userAnswer) { showFeedback(card, 'hint', T.typeFirst || 'Type an answer first.'); return; }
      const accepted = (q.acceptable || [q.canonical]).map(normalize);
      correct = accepted.includes(normalize(userAnswer));
      expected = q.canonical || (q.acceptable && q.acceptable[0]);
    }
    else if (q.type === 'reorder') {
      const items = [...card.querySelectorAll('.reorder-item')];
      const order = items.map(it => parseInt(it.dataset.orig, 10));
      correct = order.every((v, i) => v === q.answer[i]);
      expected = q.answer.map(i => q.items[i]).join(' → ');
    }
    else if (q.type === 'fillblank') {
      let allOk = true;
      q.blanks.forEach(b => {
        const node = card.querySelector(`[data-blank="${b.id}"]`);
        const val = (node.value || '').trim();
        if (b.type === 'select') {
          if (val !== b.answer) allOk = false;
        } else {
          const accepted = (b.acceptable || [b.answer]).map(normalize);
          if (!accepted.includes(normalize(val))) allOk = false;
        }
      });
      correct = allOk;
      expected = q.blanks.map(b => `${b.id}=${b.answer}`).join('  •  ');
    }

    if (correct) {
      showFeedback(card, 'correct', `✓ ${T.correct || 'Correct.'} ${q.explanation}`);
    } else {
      const html = `<strong>✗ ${T.wrong || 'Not quite.'}</strong> ${q.explanation}` +
                   (expected ? `<div class="answer-block">${T.expected || 'Expected:'} ${fmtInline(String(expected))}</div>` : '');
      showFeedback(card, 'wrong', html);
    }
  }

  function revealAnswer(q, card) {
    let expected = '';
    if (q.type === 'mcq') expected = q.options[q.answer];
    else if (q.type === 'tf') expected = q.answer ? (T.true || 'True') : (T.false || 'False');
    else if (q.type === 'short') expected = q.canonical || q.acceptable[0];
    else if (q.type === 'reorder') expected = q.answer.map(i => q.items[i]).join(' → ');
    else if (q.type === 'fillblank') expected = q.blanks.map(b => `${b.id}: ${b.answer}`).join(' • ');
    showFeedback(card, 'hint',
      `<strong>${T.answer || 'Answer'}:</strong> <span class="sym">${expected}</span><div style="margin-top:8px">${q.explanation}</div>`);
  }

  function toggleHint(q, card) {
    const existing = card.querySelector('.feedback.hint-temp');
    if (existing) { existing.remove(); return; }
    const fb = el('div', {
      class: 'feedback hint hint-temp',
      html: `<strong>${T.hint || 'Hint:'}</strong> ${fmtInline(q.explanation.split('.')[0])}.`
    });
    card.querySelector('.q-actions').after(fb);
  }

  function toggleMore(q, card) {
    let m = card.querySelector('.more-examples');
    if (m) { m.remove(); return; }
    m = el('div', { class: 'more-examples' });
    q.moreExamples.forEach(ex => {
      const e = el('div', { class: 'example' });
      e.append(el('div', { class: 'ex-label' }, ex.label));
      e.append(el('div', { class: 'ex-body', html: fmtInline(ex.body) }));
      m.append(e);
    });
    card.append(m);
  }

  function showFeedback(card, kind, html) {
    const old = card.querySelector('.feedback:not(.hint-temp)');
    if (old) old.remove();
    const fb = el('div', { class: `feedback ${kind} answer-reveal`, html });
    card.querySelector('.q-actions').after(fb);
  }

  // ======== TOOLBAR ========
  const themeBtn = $('#theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = cur === 'dark' ? 'light' : 'dark';
    setTimeout(renderMermaid, 50);
  });
  const printBtn = $('#print-btn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());

  // ======== MERMAID (v9 API) ========
  function renderMermaid() {
    if (typeof mermaid === 'undefined') return;
    const isDark = document.documentElement.dataset.theme === 'dark';
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'neutral',
        securityLevel: 'loose',
        flowchart: { htmlLabels: true, curve: 'basis' },
        themeVariables: {
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '14px'
        }
      });
    } catch (e) { console.warn('mermaid init', e); }

    const nodes = document.querySelectorAll('.mermaid');
    nodes.forEach(n => {
      if (!n.dataset.source) n.dataset.source = n.textContent.trim();
      n.removeAttribute('data-processed');
      n.innerHTML = n.dataset.source;
    });
    try { mermaid.init(undefined, nodes); }
    catch (e) { console.warn('mermaid render', e); }
  }
  setTimeout(renderMermaid, 0);
})();
