// Beyond Borders · landing scripts

// Smooth scroll for in-page anchors (JS instead of native jump, per prototype rules)
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute('href');
  if (id === '#') { e.preventDefault(); return; }
  const target = document.querySelector(id);
  if (!target) return;
  e.preventDefault();
  closeMenu();
  // sections are sticky (js/anim.js), so measure their static position via the anchor placed before them
  const prev = target.previousElementSibling;
  const ref = prev && prev.classList.contains('stack-anchor') ? prev : target;
  const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  window.scrollTo({ top: ref.getBoundingClientRect().top + window.scrollY, behavior: smooth });
});

// Mobile menu: pushes content down via max-height
const burger = document.querySelector('.burger');
const menu = document.getElementById('mobile-menu');
function closeMenu() {
  if (!menu) return;
  menu.classList.remove('is-open');
  burger?.setAttribute('aria-expanded', 'false');
  burger?.setAttribute('aria-label', 'Open menu');
}
burger?.addEventListener('click', () => {
  const open = menu.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});

// Sliders: native scroll-snap + arrows, counter and dots
document.querySelectorAll('[data-slider]').forEach((slider) => {
  const track = slider.querySelector('.slider__track');
  const domItems = [...track.children];
  // visual order may differ from DOM order (CSS `order`), so sort by position
  let items = domItems;
  const sortItems = () => { items = [...domItems].sort((a, b) => a.offsetLeft - b.offsetLeft); };
  sortItems();
  const prev = slider.querySelector('[data-prev]');
  const next = slider.querySelector('[data-next]');
  const count = slider.querySelector('[data-count]');
  const dotsBox = slider.querySelector('[data-dots]');
  const dots = items.map(() => { const d = document.createElement('i'); dotsBox?.appendChild(d); return d; });

  const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  // scroll positions at which each item is aligned to the track's start
  const stops = () => {
    const base = items[0].getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    const max = track.scrollWidth - track.clientWidth;
    return items.map((it) => Math.min(max, Math.max(0, it.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft - base)));
  };
  const atEnd = () => track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  const current = () => { // first item aligned closest to the current position
    const s = stops(), left = track.scrollLeft;
    let idx = 0, best = Infinity;
    s.forEach((v, i) => { const d = Math.abs(v - left); if (d < best - 0.5) { best = d; idx = i; } });
    return idx;
  };
  const isStatic = () => track.scrollWidth <= track.clientWidth + 2;
  const update = () => {
    slider.classList.toggle('is-static', isStatic());
    if (isStatic()) return;
    const i = current();
    if (count) count.textContent = `${i + 1} / ${items.length}`;
    const dot = atEnd() ? items.length - 1 : i;
    dots.forEach((d, k) => d.classList.toggle('is-active', k === dot));
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  };
  const goTo = (i) => {
    const s = stops();
    i = Math.min(items.length - 1, Math.max(0, i));
    track.scrollTo({ left: s[i], behavior: smooth });
    setTimeout(update, 450);
  };
  prev?.addEventListener('click', () => {
    // move to the last item whose stop is before the current position
    const s = stops(), left = track.scrollLeft;
    let i = 0;
    s.forEach((v, k) => { if (v < left - 4) i = k; });
    goTo(i);
  });
  next?.addEventListener('click', () => {
    // move to the first item whose stop is beyond the current position
    const s = stops(), left = track.scrollLeft;
    const i = s.findIndex((v) => v > left + 4);
    goTo(i === -1 ? items.length - 1 : i);
  });
  dots.forEach((d, k) => d.addEventListener('click', () => goTo(k)));

  // drag with the mouse on desktop (touch keeps native swipe)
  let drag = null;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || isStatic()) return;
    drag = { x: e.clientX, left: track.scrollLeft, moved: false };
    track.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 5) drag.moved = true;
    track.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    const moved = drag.moved;
    track.classList.remove('is-dragging');
    drag = null;
    if (moved) {
      goTo(current());
      // swallow the click that follows a drag
      const swallow = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
      track.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => track.removeEventListener('click', swallow, { capture: true }), 0);
    }
  });

  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  window.addEventListener('resize', () => { sortItems(); update(); });
  update();
});

// Quiz: 3 single-choice steps + contact form
(() => {
  const form = document.getElementById('quiz-form');
  if (!form) return;
  const steps = [...form.querySelectorAll('.qstep')];
  const done = form.querySelector('.qdone');
  const contactBox = document.getElementById('quiz-contact');
  const contact = form.querySelector('.qcontact');
  const success = form.querySelector('.qsuccess');
  const error = form.querySelector('.form-error');
  const phone = form.elements.phone;
  let step = 0;

  const show = (i) => {
    step = i;
    steps.forEach((s, k) => { s.hidden = k !== i; });
    done.hidden = i < steps.length;
    contactBox.classList.toggle('is-ready', i >= steps.length);
  };
  const answered = (i) => !!steps[i].querySelector('input:checked');

  form.addEventListener('change', (e) => {
    const s = e.target.closest('.qstep');
    if (!s || e.target.type !== 'radio') return;
    const i = steps.indexOf(s);
    setTimeout(() => show(i + 1), 280); // auto-advance after a pick
  });
  form.querySelectorAll('[data-next-step]').forEach((b) => b.addEventListener('click', () => {
    if (!answered(step)) { steps[step].querySelector('input')?.focus(); return; }
    show(step + 1);
  }));
  form.querySelectorAll('[data-prev-step]').forEach((b) => b.addEventListener('click', () => show(Math.max(0, step - 1))));
  form.querySelector('[data-restart]')?.addEventListener('click', () => show(0));

  const fail = (msg, el) => { error.textContent = msg; error.hidden = false; el?.classList.add('is-invalid'); el?.focus(); };
  phone.addEventListener('input', () => { phone.classList.remove('is-invalid'); error.hidden = true; });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    error.hidden = true;
    const digits = phone.value.replace(/\D/g, '');
    if (digits.length < 7) return fail('Please enter your phone number', phone);
    if (!form.elements.consent.checked) return fail('Please agree to the processing of your personal data');
    // Fictional site: no data is sent anywhere
    contact.hidden = true;
    success.hidden = false;
  });
})();

// Final sign-up form (fictional: nothing is sent)
(() => {
  const form = document.getElementById('signup-form');
  if (!form) return;
  const phone = form.elements.phone;
  const error = form.querySelector('.form-error');
  const fail = (msg, el) => { error.textContent = msg; error.hidden = false; el?.classList.add('is-invalid'); el?.focus(); };
  phone.addEventListener('input', () => { phone.classList.remove('is-invalid'); error.hidden = true; });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    error.hidden = true;
    if (phone.value.replace(/\D/g, '').length < 7) return fail('Please enter your phone number', phone);
    if (!form.elements.consent.checked) return fail('Please agree to the processing of your personal data');
    form.querySelector('.signup__fields').hidden = true;
    form.querySelector('.signup__success').hidden = false;
  });
})();

// FAQ: smooth open / close (height + fade); summary padding and the +/− icon animate in CSS
document.querySelectorAll('.qa').forEach((qa) => {
  const summary = qa.querySelector('summary');
  const body = qa.querySelector('.qa__body');
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const opts = { duration: 400, easing: 'cubic-bezier(.4, 0, .2, 1)' };
  let anim = null;
  summary.addEventListener('click', (e) => {
    e.preventDefault();
    const opening = !qa.classList.contains('is-open');
    const from = qa.open ? body.offsetHeight : 0;
    anim?.cancel();
    qa.classList.toggle('is-open', opening);
    if (opening) qa.open = true;
    if (reduce()) { qa.open = opening; return; }
    const to = opening ? body.scrollHeight : 0;
    anim = body.animate([
      { height: from + 'px', opacity: opening ? 0 : 1 },
      { height: to + 'px', opacity: opening ? 1 : 0 },
    ], opts);
    anim.onfinish = () => { anim = null; if (!opening) qa.open = false; };
  });
});

// Schedule: age toggle (visible on mobile, both posters shown on desktop)
document.querySelectorAll('.age-tabs__btn').forEach((btn, _, all) => {
  btn.addEventListener('click', () => {
    all.forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
      document.getElementById(b.getAttribute('aria-controls'))?.classList.toggle('is-active', on);
    });
  });
});

// Floating contact button
const fab = document.getElementById('fab');
const fabBtn = fab?.querySelector('.fab__btn');
const fabMenu = document.getElementById('fab-menu');
fabBtn?.addEventListener('click', () => {
  const open = fabMenu.hidden;
  fabMenu.hidden = !open;
  fab.classList.toggle('is-open', open);
  fabBtn.setAttribute('aria-expanded', String(open));
});
// "Still unsure? Message us" opens the contact menu
document.querySelectorAll('[data-open-fab]').forEach((b) => b.addEventListener('click', (e) => {
  e.stopPropagation();
  if (fabMenu.hidden) fabBtn.click();
  fabMenu.querySelector('a')?.focus();
}));
document.addEventListener('click', (e) => {
  if (fab && !fab.contains(e.target) && !fabMenu.hidden) {
    fabMenu.hidden = true;
    fab.classList.remove('is-open');
    fabBtn.setAttribute('aria-expanded', 'false');
  }
});

// Coaches slider on mobile: the card closest to the centre of the track turns colour while scrolling (no tap needed)
(() => {
  const track = document.querySelector('.coaches__list');
  if (!track) return;
  const mq = matchMedia('(max-width: 767px)');
  const cards = [...track.children];
  let raf = 0;
  const light = () => {
    raf = 0;
    if (!mq.matches) { cards.forEach((c) => c.classList.remove('is-lit')); return; }
    const t = track.getBoundingClientRect();
    const mid = t.left + t.width / 2;
    let best = null, dist = Infinity;
    cards.forEach((c) => { const r = c.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < dist) { dist = d; best = c; } });
    cards.forEach((c) => c.classList.toggle('is-lit', c === best));
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(light); };
  track.addEventListener('scroll', queue, { passive: true });
  mq.addEventListener('change', queue);
  addEventListener('resize', queue);
  light();
})();
