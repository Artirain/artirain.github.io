/* Артур - портфолио. Появление блоков + живой конвейер в секции «Что я делаю». */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─────────────────  появление при скролле  ───────────────── */

(() => {
  const items = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
    document.querySelectorAll('.card, .job').forEach((el) => el.classList.add('in'));
    return;
  }

  // соседи внутри одной группы появляются каскадом
  const groups = ['.cards', '.contact__list', '.stack__grid', '.closed__list'];
  groups.forEach((sel) => {
    document.querySelectorAll(sel).forEach((group) => {
      [...group.children].forEach((child, i) => {
        if (child.classList.contains('reveal')) child.style.transitionDelay = `${i * 90}ms`;
      });
    });
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

  items.forEach((el) => io.observe(el));

  // герой показывается сразу, без ожидания скролла
  requestAnimationFrame(() => {
    document.querySelectorAll('.hero .reveal').forEach((el) => el.classList.add('in'));
  });
})();

/* ─────────────────  конвейер  ───────────────── */

const SAMPLES = [
  {
    src: 'telegram · рабочий чат',
    project: 'tracking-movements',
    input: 'завтра перекинь 3 коробки с центрального склада на точку у вокзала, там почти пусто',
    stages: ['сбор', 'фильтр', 'llm-извлечение', 'нормализация', 'запись'],
    output: {
      from: 'Центральный склад',
      to: 'Точка у вокзала',
      sku: 'SKU-4417',
      qty: 3,
      when: '2026-08-05',
    },
  },
  {
    src: 'hh.ru · карточка вакансии',
    project: 'job-hunter',
    input: 'Ищем Python-разработчика в команду, которая внедряет ИИ в поддержку. Удалённо.',
    stages: ['поиск', 'фильтр', 'llm-отбор', 'письмо', 'отклик'],
    output: {
      match: true,
      why: 'LLM в проде, удалёнка',
      letter: 'сгенерировано под вакансию',
      applied: true,
      chat: 'ответ рекрутёру отправлен',
    },
  },
  {
    src: 'корпус документов · 2013 чанков',
    project: 'artirain-rag',
    input: 'как запускать фоновые задачи, чтобы не блокировать ответ клиенту?',
    stages: ['гибридный поиск', 'реранк', 'генерация', 'проверка'],
    output: {
      answer: 'BackgroundTasks в обработчике',
      sources: ['async.md:12', 'tasks.md:5'],
      grounded: true,
      attempts: 1,
    },
  },
];

(() => {
  const pipe = document.querySelector('[data-pipe]');
  if (!pipe) return;

  const elSrc = pipe.querySelector('[data-pipe-src]');
  const elProj = pipe.querySelector('[data-pipe-proj]');
  const elIn = pipe.querySelector('[data-pipe-in]');
  const elStages = pipe.querySelector('[data-pipe-stages]');
  const elOut = pipe.querySelector('[data-pipe-out]');
  const elDot = pipe.querySelector('[data-pipe-dot]');
  const elRail = pipe.querySelector('.pipe__rail');

  // точка встаёт ровно по центру узла, а не по доле ширины
  const moveDotTo = (node) => {
    if (!node || !elRail) return;
    const rail = elRail.getBoundingClientRect();
    if (!rail.width) return;
    const box = node.getBoundingClientRect();
    elDot.style.left = `${((box.left + box.width / 2 - rail.left) / rail.width) * 100}%`;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function jsonRows(obj) {
    const rows = ['{'];
    const keys = Object.keys(obj);
    keys.forEach((key, i) => {
      const raw = obj[key];
      let val;
      if (typeof raw === 'string') val = `<span class="s">"${esc(raw)}"</span>`;
      else if (Array.isArray(raw)) val = `<span class="s">[${raw.map((v) => `"${esc(v)}"`).join(', ')}]</span>`;
      else val = `<span class="n">${esc(raw)}</span>`;
      rows.push(`  <span class="k">"${esc(key)}"</span>: ${val}${i < keys.length - 1 ? ',' : ''}`);
    });
    rows.push('}');
    return rows;
  }

  function renderStages(names) {
    elStages.innerHTML = names.map((n) => `<li>${esc(n)}</li>`).join('');
    return [...elStages.children];
  }

  function renderOutput(obj, animated) {
    const rows = jsonRows(obj);
    elOut.innerHTML = rows
      .map((row, i) => `<span class="row" style="animation-delay:${animated ? i * 70 : 0}ms">${row}</span>`)
      .join('\n');
  }

  /* статичный кадр, если анимация выключена */
  if (reduceMotion) {
    const s = SAMPLES[0];
    elSrc.textContent = s.src;
    elProj.textContent = s.project;
    elIn.textContent = s.input;
    renderStages(s.stages).forEach((li) => li.classList.add('on'));
    renderOutput(s.output, false);
    pipe.classList.add('done');
    return;
  }

  let visible = false;
  const vio = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  }, { threshold: 0.25 });
  vio.observe(pipe);

  const awaitVisible = async () => {
    while (!visible || document.hidden) await sleep(220);
  };

  async function typeInput(text) {
    elIn.textContent = '';
    for (let i = 0; i < text.length; i++) {
      elIn.textContent += text[i];
      // на пробелах чуть длиннее - читается как живой набор
      await sleep(text[i] === ' ' ? 42 : 20);
    }
  }

  async function runSample(sample) {
    pipe.classList.remove('done', 'running');
    elSrc.textContent = sample.src;
    elProj.textContent = sample.project;
    elOut.innerHTML = '';
    const stages = renderStages(sample.stages);
    elDot.style.left = '0%';

    await typeInput(sample.input);
    pipe.classList.add('done', 'running');
    await sleep(420);

    for (let i = 0; i < stages.length; i++) {
      moveDotTo(stages[i]);
      stages[i].classList.add('on');
      await sleep(i === stages.length - 1 ? 520 : 380);
    }

    renderOutput(sample.output, true);
    await sleep(3400);

    pipe.classList.remove('running');
    stages.forEach((li) => li.classList.remove('on'));
    await sleep(500);
  }

  (async () => {
    let i = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await awaitVisible();
      await runSample(SAMPLES[i % SAMPLES.length]);
      i++;
    }
  })();
})();

/* ─────────────────  подсветка активного раздела в шапке  ───────────────── */

(() => {
  const links = [...document.querySelectorAll('.topbar__nav a')];
  if (!links.length || !('IntersectionObserver' in window)) return;

  const map = new Map();
  links.forEach((a) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) map.set(target, a);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const link = map.get(entry.target);
      if (!link) return;
      link.style.color = entry.isIntersecting ? 'var(--ink)' : '';
      link.style.borderBottomColor = entry.isIntersecting ? 'var(--accent)' : '';
    });
  }, { rootMargin: '-45% 0px -45% 0px' });

  map.forEach((_, target) => io.observe(target));
})();
