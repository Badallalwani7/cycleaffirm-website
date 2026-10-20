// CycleAffirm website: small progressive enhancements. Every page works without it.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PHASES = ['men', 'fol', 'ovu', 'lut'];
  const NAMES = { men: 'Menstrual', fol: 'Follicular', ovu: 'Ovulatory', lut: 'Luteal' };

  // Fade a text node out, swap it, fade it back in.
  const swapText = (el, text) => {
    if (!el || el.textContent === text) return;
    if (reduce) { el.textContent = text; return; }
    el.classList.add('is-out');
    setTimeout(() => { el.textContent = text; el.classList.remove('is-out'); }, 220);
  };

  // Hero: the bloom cycles through the phases, and today's line follows.
  const hero = document.querySelector('[data-hero]');
  if (hero) {
    const HERO_LINES = {
      men: 'Low battery mode is a feature, not a bug.',
      fol: 'New era unlocked. Start the thing.',
      ovu: 'Take the compliment. Do not argue with it.',
      lut: "Extra sensitive is just feelings in 4K. Nothing's wrong with you.",
    };
    const phaseEl = hero.querySelector('[data-hero-phase]');
    const lineEl = hero.querySelector('[data-hero-line]');
    const btn = hero.querySelector('[data-pause]');
    let i = PHASES.indexOf(hero.dataset.active);
    let timer = null;
    let visible = true;
    let paused = reduce;
    const step = () => {
      i = (i + 1) % PHASES.length;
      const p = PHASES[i];
      hero.dataset.active = p;
      swapText(phaseEl, NAMES[p]);
      swapText(lineEl, HERO_LINES[p]);
    };
    const sync = () => {
      clearInterval(timer);
      timer = !paused && visible ? setInterval(step, 4200) : null;
      hero.classList.toggle('is-paused', paused);
      if (btn) { btn.textContent = paused ? 'Play' : 'Pause'; btn.setAttribute('aria-pressed', String(paused)); }
    };
    btn?.addEventListener('click', () => { paused = !paused; sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(hero);
    }
    sync();
  }

  // Ribbon of lines: pause button.
  const ribbon = document.querySelector('.ribbon');
  const ribbonBtn = document.querySelector('[data-ribbon-pause]');
  if (ribbon && ribbonBtn) {
    if (reduce) ribbonBtn.hidden = true;
    ribbonBtn.addEventListener('click', () => {
      const p = ribbon.classList.toggle('is-paused');
      ribbonBtn.textContent = p ? 'Play' : 'Pause';
      ribbonBtn.setAttribute('aria-pressed', String(p));
    });
  }

  // How it works: the page tint and the turning bloom follow the phase in view.
  const phases = document.querySelectorAll('.phase[data-phase]');
  const bloom = document.querySelector('.bloom--journey');
  if (phases.length && 'IntersectionObserver' in window) {
    const journey = document.querySelector('.journey');
    let inJourney = false;
    let current = 'men';
    const apply = () => { document.body.dataset.tint = inJourney ? current : 'neutral'; };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        current = e.target.dataset.phase;
        if (bloom) bloom.dataset.active = current;
      }
      apply();
    }, { rootMargin: '-45% 0px -45% 0px' });
    phases.forEach((el) => io.observe(el));
    if (journey) {
      new IntersectionObserver(([e]) => { inJourney = e.isIntersecting; apply(); }, { rootMargin: '-10% 0px -10% 0px' }).observe(journey);
    }
  }

  // Try a check-in: pick a phase and moods, get the best-fitting line from the app's library.
  const demo = document.querySelector('[data-demo]');
  const data = document.getElementById('lines');
  if (demo && data) {
    let library = {};
    try { library = JSON.parse(data.textContent); } catch { /* keep the static line */ }
    const lineEl = demo.querySelector('[data-demo-line]');
    const metaEl = demo.querySelector('[data-demo-meta]');
    const next = demo.querySelector('[data-demo-next]');
    const PHASE_NAMES = { menstrual: 'Menstrual', follicular: 'Follicular', ovulatory: 'Ovulatory', luteal: 'Luteal' };
    const picked = []; // moods in the order she picked them, at most 3
    let pool = [];
    let at = 0;

    const moodLabel = (id) => demo.querySelector(`input[name="mood"][value="${id}"] + span`)?.textContent.toLowerCase() ?? id;

    const update = (fresh) => {
      const phase = demo.querySelector('input[name="phase"]:checked')?.value ?? 'luteal';
      demo.dataset.phase = phase;
      const items = library[phase] ?? [];
      if (!items.length) return;
      if (fresh) {
        const score = (x) => x.m.filter((m) => picked.includes(m)).length;
        const best = Math.max(...items.map(score));
        pool = items.filter((x) => score(x) === best).map((x) => x.t);
        for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
        if (pool.length > 1 && pool[0] === lineEl.textContent) pool.push(pool.shift());
        at = 0;
      } else {
        at = (at + 1) % pool.length;
      }
      swapText(lineEl, pool[at]);
      metaEl.textContent = picked.length
        ? `${PHASE_NAMES[phase]} · for feeling ${picked.map(moodLabel).join(' + ')}`
        : `${PHASE_NAMES[phase]} · pick a mood or two`;
      next.hidden = pool.length < 2;
    };

    demo.addEventListener('change', (e) => {
      const t = e.target;
      if (t.name === 'mood') {
        if (t.checked) {
          picked.push(t.value);
          if (picked.length > 3) {
            const drop = picked.shift();
            const old = demo.querySelector(`input[name="mood"][value="${drop}"]`);
            if (old) old.checked = false;
          }
        } else {
          const k = picked.indexOf(t.value);
          if (k >= 0) picked.splice(k, 1);
        }
      }
      update(true);
    });
    demo.addEventListener('submit', (e) => e.preventDefault());
    next?.addEventListener('click', () => update(pool.length === 0));
  }

  // Beta list. With an endpoint (the Google Apps Script in website/waitlist), the name and
  // email go to the owner's private sheet. Without one, her email app opens with it filled in.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const joinWaitlist = async (form) => {
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    if (!name) return { error: 'Add your first name, so we know what to call you.', field: 'name' };
    if (!EMAIL_RE.test(email)) return { error: 'Add the email of the Google account you use on Google Play.', field: 'email' };
    if (!form.elements.adult.checked) return { error: 'The beta is for people 18 and over with an Android phone.', field: 'adult' };
    const endpoint = form.dataset.endpoint;
    if (!endpoint) {
      const body = `Hi! I'd like to join the CycleAffirm beta.\n\nName: ${name}\nThe Google account I use on Google Play: ${email}\n\nI'm 18 or over and I have an Android phone.`;
      window.location.href = `mailto:${form.dataset.email}?subject=${form.dataset.subject}&body=${encodeURIComponent(body)}`;
      return { ok: true, name, via: 'email' };
    }
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ name, email, adult: true, source: form.dataset.source || '', website: form.elements.website?.value || '' }),
      });
      const out = await res.json();
      if (out.ok) return { ok: true, name, via: 'list', already: !!out.already };
      return { error: out.error === 'busy' ? 'Lots of people at once. Try again in a minute?' : 'That didn’t go through. Check your details and try again.' };
    } catch {
      return { error: `Couldn’t reach the list. Try again, or email ${form.dataset.email}.` };
    }
  };
  window.CycleAffirm = { joinWaitlist };

  // The invite cards on the home and beta pages (the quiz has its own, in intro.js).
  document.querySelectorAll('.invite form[data-waitlist]').forEach((form) => {
    const msg = form.querySelector('.form-error');
    const btn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.hidden = true;
      btn.disabled = true;
      const r = await joinWaitlist(form);
      btn.disabled = false;
      if (r.error) {
        msg.textContent = r.error; msg.hidden = false;
        if (r.field) form.elements[r.field]?.focus();
        return;
      }
      const done = form.querySelector('.invite-done');
      done.querySelector('[data-done-name]').textContent = `${r.name}.`;
      done.querySelector('[data-done-lead]').textContent = r.via === 'email' ? 'Almost there,' : 'You’re on the list,';
      done.querySelector('[data-done-text]').textContent = r.via === 'email'
        ? 'Your email app should open now. Hit send and you’re on the list.'
        : (r.already ? 'You were already on it. We’ll email you when your invite’s ready.' : 'We’ll email you when your invite’s ready.');
      [...form.children].forEach((el) => { if (el !== done) el.hidden = true; });
      done.hidden = false;
    });
  });

  // Copy-to-clipboard buttons.
  document.querySelectorAll('button[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const label = btn.textContent;
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = 'Copied';
      } catch {
        btn.textContent = 'Couldn’t copy';
      }
      setTimeout(() => { btn.textContent = label; }, 1800);
    });
  });
})();
