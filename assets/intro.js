// The "find your bloom" quiz: four light questions, a bloom and a line from the app,
// then the beta list, then the site. Answers stay in this page; only the name and
// email she chooses to send go to the beta list (see site.js, joinWaitlist).
(() => {
  const intro = document.querySelector('[data-intro]');
  if (!intro) return;
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const card = intro.querySelector('.intro-card');
  const steps = [...intro.querySelectorAll('.intro-step')];
  const count = intro.querySelector('[data-intro-count]');
  const petals = [...intro.querySelectorAll('.ip')];
  const stepNamed = (name) => steps.find((s) => s.dataset.step === name);
  const question = (n) => steps.find((s) => s.dataset.q === String(n));

  // Each bloom is one of the app's phase worlds; the line is from the app's library.
  const BLOOMS = {
    men: { name: 'Blush', about: 'Soft but strong. You know rest is part of the plan, not a break from it.', line: 'Soft era activated. No notes.' },
    fol: { name: 'Sage', about: 'Fresh-start energy. You’re always halfway into a new era, and it suits you.', line: 'New era unlocked. Start the thing.' },
    ovu: { name: 'Honey', about: 'Warm, bright and a little loud, in the best way. Main character, obviously.', line: 'You’re not too much. You’re the whole vibe.' },
    lut: { name: 'Lavender', about: 'Slow, deep, a little mysterious. You feel everything in 4K.', line: 'Cozy, quiet, and slow is a perfectly elite plan.' },
  };
  let answers = [];
  let busy = false;

  const show = (step) => {
    steps.forEach((s) => s.classList.toggle('is-active', s === step));
    intro.scrollTop = 0;
    step.querySelector('[tabindex="-1"]')?.focus({ preventScroll: true });
  };

  // A little burst of flowers from an element.
  const burst = (from, bloom, n = 8, spread = 90) => {
    if (reduce) return;
    const a = from.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const x = a.left - c.left + a.width / 2;
    const y = a.top - c.top + a.height / 2;
    for (let i = 0; i < n; i++) {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 100 100');
      s.setAttribute('class', `spark s-${i % 3 === 0 ? 'rose' : bloom}`);
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#bloom');
      s.appendChild(use);
      s.style.left = `${x - 9}px`;
      s.style.top = `${y - 9}px`;
      card.appendChild(s);
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.6;
      const dist = spread * (0.6 + Math.random() * 0.6);
      const anim = s.animate([
        { transform: 'translate(0,0) scale(.3) rotate(0deg)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(${0.7 + Math.random() * 0.6}) rotate(${Math.random() * 240 - 120}deg)`, opacity: 0 },
      ], { duration: 750 + Math.random() * 350, easing: 'cubic-bezier(.2,.8,.2,1)' });
      anim.onfinish = () => s.remove();
    }
  };

  const reset = () => {
    answers = [];
    petals.forEach((p, i) => p.setAttribute('class', `ip ip-${i + 1}`));
    intro.querySelectorAll('.opt').forEach((o) => { o.className = 'opt'; o.removeAttribute('aria-pressed'); });
    count.textContent = '';
    intro.removeAttribute('data-bloom');
    intro.removeAttribute('data-done');
  };

  const open = () => {
    reset();
    root.classList.add('show-intro');
    show(stepNamed('hello'));
  };

  const close = () => {
    try { localStorage.setItem('ca-intro', 'done'); } catch { /* fine */ }
    const done = () => {
      root.classList.remove('show-intro');
      intro.classList.remove('is-leaving');
      document.getElementById('hero-title')?.focus({ preventScroll: true });
    };
    if (reduce) return done();
    intro.classList.add('is-leaving');
    setTimeout(done, 650);
  };

  const result = () => {
    const tally = { men: 0, fol: 0, ovu: 0, lut: 0 };
    answers.forEach((b) => { tally[b]++; });
    const top = Math.max(...Object.values(tally));
    // Ties go to the most recent answer.
    const bloom = [...answers].reverse().find((b) => tally[b] === top) || 'lut';
    const r = BLOOMS[bloom];
    intro.dataset.bloom = bloom;
    intro.querySelector('[data-result-name]').textContent = r.name;
    intro.querySelector('[data-result-about]').textContent = r.about;
    intro.querySelector('[data-result-line]').textContent = r.line;
    count.textContent = 'Your bloom';
    const step = stepNamed('result');
    show(step);
    setTimeout(() => burst(step.querySelector('.result-bloom'), bloom, 14, 140), 350);
  };

  const pick = (opt) => {
    if (busy) return;
    busy = true;
    const n = Number(opt.closest('.intro-step').dataset.q);
    const bloom = opt.dataset.bloom;
    answers[n - 1] = bloom;
    opt.classList.add('is-picked', `b-${bloom}`);
    opt.setAttribute('aria-pressed', 'true');
    petals[n - 1].setAttribute('class', `ip ip-${n} is-${bloom}`);
    burst(opt, bloom);
    setTimeout(() => {
      busy = false;
      if (n < 4) { count.textContent = `${n + 1} of 4`; show(question(n + 1)); } else { result(); }
    }, reduce ? 120 : 620);
  };

  intro.addEventListener('click', (e) => {
    const opt = e.target.closest('.opt');
    if (opt) return pick(opt);
    if (e.target.closest('[data-intro-start]')) { count.textContent = '1 of 4'; return show(question(1)); }
    if (e.target.closest('[data-intro-skip], [data-intro-enter]')) return close();
  });

  // The beta list, inside the quiz.
  const form = intro.querySelector('form[data-waitlist]');
  const msg = form.querySelector('.form-error');
  const submit = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.hidden = true;
    submit.disabled = true;
    const label = submit.textContent;
    submit.textContent = 'Saving…';
    const r = await window.CycleAffirm.joinWaitlist(form);
    submit.disabled = false;
    submit.textContent = label;
    if (r.error) {
      msg.textContent = r.error;
      msg.hidden = false;
      if (r.field) form.elements[r.field]?.focus();
      return;
    }
    intro.querySelector('[data-done-name]').textContent = `${r.name}.`;
    intro.querySelector('[data-done-lead]').textContent = r.via === 'email' ? 'Almost there,' : 'You’re on the list,';
    intro.querySelector('[data-done-text]').textContent = r.via === 'email'
      ? 'Your email app should open now. Hit send and you’re on the list. Until then, come look around.'
      : (r.already ? 'You were already on it, so you’re all set. Come look around.' : 'We’ll email you when your invite’s ready. Until then, come look around.');
    count.textContent = 'Saved';
    intro.dataset.done = '';
    const step = stepNamed('done');
    show(step);
    setTimeout(() => burst(step.querySelector('.done-bloom'), intro.dataset.bloom || 'men', 18, 170), 300);
  });

  // Esc skips; Tab stays inside the quiz while it's open.
  intro.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = [...intro.querySelectorAll('button, input, a[href]')].filter((el) => el.offsetParent !== null && !el.closest('.hp'));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  document.querySelectorAll('[data-open-intro]').forEach((b) => b.addEventListener('click', open));
  if (root.classList.contains('show-intro')) show(stepNamed('hello'));
})();
