/* =====================================================
   WinX Platform · live demo interactions
   ===================================================== */

(() => {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- POS time tick ---------- */
  const tickPosTime = () => {
    const el = $('#posTime');
    if (!el) return;
    const d = new Date();
    el.textContent = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  tickPosTime();
  setInterval(tickPosTime, 30 * 1000);

  /* ---------- LIVE DEMO: cross-product event panel ---------- */
  const liveCollect = $('#liveCollect');
  const livePanel   = $('.live-panel');
  const lpStatus    = $('#lpStatus');
  const sysEls = {
    pos:    $('#sys-pos'),
    vietqr: $('#sys-vietqr'),
    biz:    $('#sys-biz'),
    inv:    $('#sys-inv'),
    ai:     $('#sys-ai'),
    bank:   $('#sys-bank'),
  };

  const sequence = [
    { key: 'pos',    delay: 0,    line: 'Xác thực giỏ 7 SKU · 186.000 ₫ · Lan thu' },
    { key: 'vietqr', delay: 480,  line: 'Phát QR động · đích VA-01 cửa hàng' },
    { key: 'biz',    delay: 1100, line: '+ 186.000 ₫ vào ví · HĐ #WX-00192 · KM MCH 5k' },
    { key: 'inv',    delay: 1700, line: 'Trừ tồn: Om -2 · Cs -1 · W -3 · Vc -1' },
    { key: 'ai',     delay: 2200, line: 'Cập nhật pattern giờ · so với 90 ngày · điểm tín dụng' },
    { key: 'bank',   delay: 2800, line: 'Đối soát ví ↔ TK đảm bảo · 1,2 giây' },
  ];

  const resetSystems = () => {
    Object.values(sysEls).forEach(el => {
      if (!el) return;
      el.classList.remove('is-active');
      const line = el.querySelector('.sys-line');
      if (line) line.textContent = line.dataset.default;
    });
    livePanel?.classList.remove('is-busy');
    if (lpStatus) lpStatus.innerHTML = '<span class="lph-dot"></span> Đang chờ POS event';
    if (liveCollect) {
      liveCollect.textContent = 'Thu tiền với QR · 186.000 ₫';
      liveCollect.disabled = false;
    }
  };

  const runSequence = () => {
    livePanel?.classList.add('is-busy');
    if (lpStatus) lpStatus.innerHTML = '<span class="lph-dot"></span> Đang xử lý cross-product event';
    if (liveCollect) {
      liveCollect.textContent = 'Đang xử lý ...';
      liveCollect.disabled = true;
    }

    sequence.forEach(step => {
      setTimeout(() => {
        const el = sysEls[step.key];
        if (!el) return;
        el.classList.add('is-active');
        const line = el.querySelector('.sys-line');
        if (line) line.textContent = step.line;
      }, step.delay);
    });

    // final state
    setTimeout(() => {
      if (lpStatus) lpStatus.innerHTML = '<span class="lph-dot"></span> ✓ Hoàn tất · cả 6 hệ thống đã đồng bộ';
      if (liveCollect) {
        liveCollect.textContent = 'Hoàn tất · bấm để chạy lại';
        liveCollect.disabled = false;
      }
    }, 3300);
  };

  if (liveCollect) {
    liveCollect.addEventListener('click', () => {
      // If we're already in a finished state, reset and re-run
      if (livePanel?.classList.contains('is-busy')) return;
      // If any system is active, this is a "run again" click — reset first
      const anyActive = Object.values(sysEls).some(el => el?.classList.contains('is-active'));
      if (anyActive) {
        resetSystems();
        // small breath before re-running
        setTimeout(runSequence, 250);
      } else {
        runSequence();
      }
    });
  }

  /* ---------- Mobile nav (reused) ---------- */
  const burger = $('#navBurger');
  const navLinks = $('.nav-links');
  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      const open = navLinks.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('.nav-links a').forEach(a => a.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }));
  }

  /* ---------- Side dot nav active state on scroll ---------- */
  const sections = ['hero', 'scene-pos', 'scene-business', 'scene-ai', 'scene-architecture', 'closing']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  const navAnchors = $$('.nav-links a');
  const sideAnchors = $$('.sn-dot');

  const setActive = (id) => {
    navAnchors.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    sideAnchors.forEach(a => a.classList.toggle('is-active', a.dataset.target === id));
  };

  const spy = () => {
    const y = window.scrollY + window.innerHeight * 0.35;
    let current = sections[0]?.id || 'hero';
    let onDark = false;
    for (const s of sections) {
      const top = s.offsetTop;
      const bot = top + s.offsetHeight;
      if (y >= top && y < bot) {
        current = s.id;
        onDark = s.classList.contains('scene-dark') || s.classList.contains('scene-ai');
        break;
      }
    }
    setActive(current);
    document.body.classList.toggle('is-on-dark', onDark);
  };
  window.addEventListener('scroll', spy, { passive: true });
  window.addEventListener('resize', spy);
  spy();

  /* ---------- Reveal on scroll (lightweight) ---------- */
  const revealTargets = [
    '.demo-intro', '.live-pos', '.live-panel',
    '.scene-copy', '.scene-mockup', '.scene-header',
    '.arch-layer', '.ask-card', '.closing-left',
    '.ai-stage', '.ai-chat'
  ];
  $$(revealTargets.join(',')).forEach(el => el.classList.add('reveal'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    $$('.reveal').forEach(el => io.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('is-visible'));
  }
})();
