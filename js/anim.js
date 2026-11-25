// Beyond Borders · motion
// 1) stacking sections: each section sticks and the next one slides over it (shade darkens the covered one)
// 2) reveals on scroll: headings rise line by line from a mask, other elements fade up, photos open with a clip
// 3) handwritten texts (Permanent Marker) are "written" letter by letter
(() => {
  const root = document.documentElement;
  const ready = () => root.classList.add('anim-ready');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { gsap, SplitText } = window;
  if (reduce || !gsap || !SplitText) { ready(); return; }

  /* ---------- 1. stacking sections ---------- */
  // only these blocks stick and get covered by the next one (no effect around the hero, studio videos, stage block and footer)
  const stack = [...document.querySelectorAll('#coaches, #styles, #quiz, #reviews, #prices, #schedule, #faq')];
  stack.forEach((el) => {
    el.classList.add('stack-item');
    const anchor = document.createElement('i'); // static position for anchor links
    anchor.className = 'stack-anchor';
    anchor.setAttribute('aria-hidden', 'true');
    el.before(anchor);
    const shade = document.createElement('span');
    shade.className = 'stack-shade';
    shade.setAttribute('aria-hidden', 'true');
    el.append(shade);
    el._shade = shade;
    el._next = el.nextElementSibling;
    while (el._next && (el._next.classList.contains('stack-anchor') || getComputedStyle(el._next).position === 'fixed')) el._next = el._next.nextElementSibling;
    el._next?.classList.add('stack-over'); // casts the shadow while sliding over
  });
  // tall sections stick when their bottom reaches the bottom of the screen
  const setTops = () => stack.forEach((el) => { el.style.top = Math.min(0, innerHeight - el.offsetHeight) + 'px'; });
  const shadeAll = () => {
    const vh = innerHeight;
    stack.forEach((el) => {
      if (!el._next) return;
      const p = Math.min(1, Math.max(0, 1 - el._next.getBoundingClientRect().top / vh));
      const o = (p * 0.6).toFixed(3);
      if (el._shade._o !== o) { el._shade._o = o; el._shade.style.opacity = o; }
    });
  };
  setTops();
  new ResizeObserver(() => { setTops(); shadeAll(); }).observe(document.body);
  addEventListener('resize', setTops);

  /* ---------- 2 + 3. reveals ---------- */
  const LINES = '.hero__title, .h2, .brand-line, .poster__title';
  const HAND = '.hero__note, .hand, .schedule__note, .faq__ask, .footer__slogan';
  const PHOTOS = '.coach__photo, .review__photo img, .polaroid img';
  const FADE = [
    '.hero__tag', '.hero__lead', '.hero__cta', '.anchors > li',
    '.studio__track > li', '.facts > li', '.coaches__list > li', '.coaches__cta',
    '.style-list > li', '.styles__foot', '.qbox',
    '.timeline > li', '.stage__lead', '.collage', '.events > li', '.stage__cta',
    '.shy__lead', '.messages > *', '.review',
    '.receipts > li', '.prices__note', '.slider__nav',
    '.age-tabs', '.posters > *', '.faq__list > *', '.signup__lead', '.signup__form',
    '.footer__top > *', '.map', '.footer__bottom',
  ].join(',');

  const pending = []; // { el, play }
  const add = (el, play) => pending.push({ el, play });

  const build = () => {
    document.querySelectorAll(LINES).forEach((el) => {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', autoSplit: true, aria: 'auto',
        onSplit(self) {
          if (el._shown) return;
          gsap.set(self.masks, { paddingTop: '0.14em', paddingBottom: '0.1em', marginTop: '-0.24em', top: '0.1em' }); // extra room for umlauts and commas without changing line spacing
          gsap.set(self.lines, { yPercent: 100, opacity: 0 });
          if (!el._queued) { el._queued = true; add(el, (delay) => { el._shown = true; gsap.to(el._lines, { yPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.1, delay }); }); }
          el._lines = self.lines;
        },
      });
    });

    document.querySelectorAll(HAND).forEach((el) => {
      const split = SplitText.create(el, { type: 'words,chars', aria: 'auto' });
      const from = 'inset(-40% 110% -40% -10%)', to = 'inset(-40% -20% -40% -10%)';
      gsap.set(split.chars, { clipPath: from });
      add(el, (delay) => gsap.to(split.chars, {
        clipPath: to, duration: 0.11, ease: 'power1.in', stagger: 0.05, delay: delay + 0.35,
        onComplete: () => gsap.set(split.chars, { clearProps: 'clipPath' }),
      }));
    });

    document.querySelectorAll(PHOTOS).forEach((el) => {
      gsap.set(el, { clipPath: 'inset(100% 0% 0% 0%)' });
      add(el, (delay) => gsap.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut', delay, clearProps: 'clipPath' }));
    });

    // fade via CSS variables + the separate `translate` property, so rotated / shifted blocks keep their own transform
    document.querySelectorAll(FADE).forEach((el) => {
      el.classList.add('rv');
      // inside a horizontal scroller a vertical shift would be clipped by the track: fade only
      const inScroller = getComputedStyle(el.parentElement).overflowX !== 'visible';
      gsap.set(el, { '--rv-o': 0, '--rv-y': inScroller ? '0px' : '28px' });
      add(el, (delay) => gsap.to(el, {
        '--rv-o': 1, '--rv-y': '0px', duration: 0.8, ease: 'power3.out', delay,
        onComplete: () => { el.classList.remove('rv'); el.style.removeProperty('--rv-o'); el.style.removeProperty('--rv-y'); },
      }));
    });
  };

  // play everything that has entered the screen; one stagger per frame batch
  const check = (initial) => {
    const line = initial === true ? innerHeight : innerHeight * 0.9;
    const batch = [];
    for (let i = pending.length - 1; i >= 0; i--) {
      const r = pending[i].el.getBoundingClientRect();
      if (r.top < line) { batch.push({ ...pending[i], top: r.bottom < 0 ? -1 : r.top, left: r.left }); pending.splice(i, 1); }
    }
    batch.sort((a, b) => a.top - b.top || a.left - b.left);
    let k = 0;
    batch.forEach((b) => {
      if (b.top < 0) b.play(0); // already scrolled past: show without waiting
      else b.play(Math.min(k++, 8) * 0.08);
    });
  };

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; shadeAll(); if (pending.length) check(); });
  }, { passive: true });

  const start = () => {
    if (start.done) return;
    start.done = true;
    build();
    setTops(); shadeAll();
    ready();
    check(true);
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
  setTimeout(start, 2500); // safety net
  window.bbAnim = { check, shadeAll, setTops }; // handy for debugging
})();
