/* =====================================================
   WinX Business demo · interactivity
   ===================================================== */

(() => {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Mobile nav ---------- */
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

  /* ---------- Scroll spy: nav + side dots + dark theme ---------- */
  const sections = ['hero', 'scene-1', 'scene-2', 'scene-3', 'scene-4', 'scene-5', 'scene-6', 'scene-7', 'scene-8', 'closing']
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
        onDark = s.classList.contains('scene-dark');
        break;
      }
    }
    setActive(current);
    document.body.classList.toggle('is-on-dark', onDark);
  };
  window.addEventListener('scroll', spy, { passive: true });
  window.addEventListener('resize', spy);
  spy();

  /* ---------- Reveal on scroll ---------- */
  const revealTargets = [
    '.hero-copy', '.hero-mockup',
    '.persona-card', '.intro-right',
    '.scene-copy', '.scene-mockup', '.scene-header',
    '.dash-panel', '.compare-grid', '.compare-card',
    '.tablet-frame', '.desktop-frame',
    '.report-card', '.ai-chat',
    '.comp-toggle', '.comp-grid',
    '.closing-left', '.closing-right'
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

  /* ---------- Onboarding flow ---------- */
  const obStage = $('#obStage');
  const obPrev  = $('#obPrev');
  const obNext  = $('#obNext');
  const obStepEl = $('.ob-step');
  if (obStage && obNext) {
    let step = 1;
    const totalSteps = 5;
    const panes = $$('.ob-step-pane', obStage);

    const renderStep = () => {
      panes.forEach(p => p.classList.toggle('is-active', Number(p.dataset.pane) === step));
      if (obStepEl) obStepEl.textContent = step <= 4 ? `Bước ${step}/4` : 'Hoàn tất';

      if (step === 5) {
        obNext.textContent = 'Chạy lại demo';
        obNext.dataset.role = 'reset';
      } else if (step === 4) {
        obNext.innerHTML = 'Tạo tài khoản';
        delete obNext.dataset.role;
      } else {
        obNext.innerHTML = 'Tiếp tục';
        delete obNext.dataset.role;
      }

      obPrev.style.visibility = step === 1 || step === 5 ? 'hidden' : 'visible';
    };

    obNext.addEventListener('click', () => {
      if (obNext.dataset.role === 'reset') {
        step = 1;
      } else {
        step = Math.min(totalSteps, step + 1);
      }
      renderStep();
    });
    obPrev.addEventListener('click', () => {
      step = Math.max(1, step - 1);
      renderStep();
    });

    renderStep();
  }

  /* ---------- POS checkout & QR flow ---------- */
  const posCollect = $('#posCollect');
  const qrEmpty   = $('#qrEmpty');
  const qrCard    = $('#qrCard');
  const qrSuccess = $('#qrSuccess');
  const btnScan   = $('#btnScan');
  const posBottom = $('#posBottom');

  let posState = 'idle';
  const setPosState = (next) => {
    posState = next;
    if (!qrEmpty || !qrCard || !qrSuccess) return;

    qrEmpty.style.display    = next === 'idle' ? 'flex' : 'none';
    qrCard.classList.toggle('is-on',     next === 'qr' || next === 'scanning');
    qrCard.classList.toggle('is-scanning', next === 'scanning');
    qrSuccess.classList.toggle('is-on',  next === 'paid');
    posBottom?.classList.toggle('is-on', next === 'paid');

    if (posCollect) {
      if (next === 'paid') posCollect.textContent = 'Giao dịch hoàn tất · Bấm để chạy lại';
      else if (next === 'qr' || next === 'scanning') posCollect.textContent = 'Đang chờ khách quét...';
      else posCollect.textContent = 'Thu tiền với WinX Business';
    }
  };

  if (posCollect) {
    posCollect.addEventListener('click', () => {
      if (posState === 'paid' || posState === 'idle') {
        setPosState(posState === 'paid' ? 'idle' : 'qr');
        if (posState === 'qr') {
          // small auto-advance hint after a moment if user doesn't click scan
          setTimeout(() => { if (posState === 'qr') {/* still waiting */} }, 600);
        }
      }
    });
  }

  if (btnScan) {
    btnScan.addEventListener('click', () => {
      if (posState !== 'qr') return;
      setPosState('scanning');
      setTimeout(() => setPosState('paid'), 1300);
    });
  }

  /* ---------- POS clock ---------- */
  const posTime = $('#posTime');
  if (posTime) {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      posTime.textContent = `${hh}:${mm}`;
    };
    tick();
    setInterval(tick, 30 * 1000);
  }

  /* ---------- Approval flow (scene 5) ---------- */
  const btnApprove = $('#btnApprove');
  const acSuccess  = $('#acSuccess');
  if (btnApprove && acSuccess) {
    btnApprove.addEventListener('click', () => {
      if (acSuccess.classList.contains('is-on')) {
        acSuccess.classList.remove('is-on');
        btnApprove.textContent = 'Phê duyệt & chi';
        btnApprove.disabled = false;
      } else {
        btnApprove.disabled = true;
        btnApprove.textContent = 'Đang xử lý...';
        setTimeout(() => {
          acSuccess.classList.add('is-on');
          btnApprove.disabled = false;
          btnApprove.textContent = 'Chạy lại demo';
        }, 1100);
      }
    });
  }

  /* ---------- Compliance mode toggle ---------- */
  const ctButtons = $$('.ct-btn');
  const ctViews   = $$('.comp-view');
  ctButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      ctButtons.forEach(b => b.classList.toggle('ct-active', b === btn));
      ctViews.forEach(v => v.classList.toggle('comp-view-on', v.dataset.view === mode));
    });
  });

  /* ---------- AI chat: typing animation + suggest pills ---------- */
  const bubbleAI = $('#bubbleAI');
  const aicInput = $('#aicInput');
  const aicSend  = $('.aic-send');
  const aicBody  = $('#aicBody');
  const suggestPills = $$('.suggest-pill');

  if (bubbleAI) {
    // Show typing once when scrolled into view, then reveal full content.
    let revealed = false;
    const showAI = () => {
      if (revealed) return;
      revealed = true;
      bubbleAI.classList.add('is-typing');
      setTimeout(() => bubbleAI.classList.remove('is-typing'), 1500);
    };
    if ('IntersectionObserver' in window) {
      const aio = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { showAI(); aio.unobserve(e.target); } });
      }, { threshold: 0.4 });
      aio.observe(bubbleAI);
    } else {
      showAI();
    }
  }

  const canned = {
    'tuần sau bán mạnh sku nào': {
      user: 'Tuần sau bán mạnh SKU nào?',
      ai: [
        'Dựa trên 12 tuần dữ liệu POS và mùa vụ:',
        { type: 'list', items: [
          '<strong>Mì Omachi sườn hầm</strong> — đỉnh mua tăng 18% các tuần đầu tháng',
          '<strong>Wake-Up 247</strong> — tăng 22% nhờ thời tiết nóng',
          '<strong>Chinsu cá cơm</strong> — đều, không biến động'
        ]},
        'Đề xuất giữ nguyên tồn Omachi/Wake-Up; theo dõi chiết khấu MCH cho gia vị Tết Đoan Ngọ.'
      ]
    },
    'có nên giảm giá wake-up': {
      user: 'Có nên giảm giá Wake-Up không?',
      ai: [
        'Không khuyến nghị. Lý do:',
        { type: 'list', items: [
          'Biên hiện tại Wake-Up: <strong>16,2%</strong> (cao hơn TB cửa hàng)',
          'Nhu cầu đang tăng tự nhiên (+22% YoY)',
          'KM MCH hiện đang tài trợ 5k/thùng — bạn đã hưởng rồi'
        ]},
        'Thay vì giảm giá, đề xuất bán combo Wake-Up + Vinacafé — biên cao hơn 4%.'
      ]
    },
    'lan có biểu hiện gì lạ': {
      user: 'Lan có biểu hiện gì lạ?',
      ai: [
        'Có 2 tín hiệu cần lưu ý ở Lan tuần này:',
        { type: 'list', items: [
          'Chênh tiền mặt 550k tập trung ca 17–18h (3 hóa đơn)',
          'Tỷ lệ hoàn của Lan: 1,2% — vẫn dưới mức cảnh báo (3%)'
        ]},
        'Đề xuất nói chuyện trực tiếp về 3 hóa đơn nói trên trước khi đưa ra kết luận. Mở "Cảnh báo AI" trong dashboard để xem chi tiết.'
      ]
    }
  };

  const renderAIBubble = (parts) => {
    const html = parts.map(p => {
      if (typeof p === 'string') return `<p>${p}</p>`;
      if (p.type === 'list') return `<ul class="bubble-ul">${p.items.map(i => `<li>${i}</li>`).join('')}</ul>`;
      return '';
    }).join('');
    return html;
  };

  const sendCanned = (key) => {
    if (!aicBody) return;
    const data = canned[key];
    if (!data) return;
    const userBubble = document.createElement('div');
    userBubble.className = 'bubble bubble-user';
    userBubble.innerHTML = `<p>${data.user}</p>`;
    aicBody.appendChild(userBubble);

    const aiBubble = document.createElement('div');
    aiBubble.className = 'bubble bubble-ai is-typing';
    aiBubble.innerHTML = renderAIBubble(data.ai);
    aicBody.appendChild(aiBubble);
    aicBody.scrollTop = aicBody.scrollHeight;

    setTimeout(() => {
      aiBubble.classList.remove('is-typing');
      aicBody.scrollTop = aicBody.scrollHeight;
    }, 1100);
  };

  suggestPills.forEach(p => {
    p.addEventListener('click', () => {
      const text = p.textContent.trim().toLowerCase().replace(/\?$/, '');
      sendCanned(text);
    });
  });

  const sendInput = () => {
    if (!aicInput) return;
    const txt = aicInput.value.trim();
    if (!txt) return;

    const userBubble = document.createElement('div');
    userBubble.className = 'bubble bubble-user';
    userBubble.innerHTML = `<p>${txt.replace(/[<>]/g,'')}</p>`;
    aicBody.appendChild(userBubble);

    const aiBubble = document.createElement('div');
    aiBubble.className = 'bubble bubble-ai is-typing';
    aiBubble.innerHTML = `<p>Câu trả lời này cần truy cập dữ liệu POS, công nợ, và lịch sử mua MCH của <strong>Tạp hóa Minh Anh</strong>. Trong demo, AI chỉ trả lời các câu hỏi mẫu phía dưới — bấm thử xem nhé.</p>`;
    aicBody.appendChild(aiBubble);

    aicInput.value = '';
    aicBody.scrollTop = aicBody.scrollHeight;

    setTimeout(() => {
      aiBubble.classList.remove('is-typing');
      aicBody.scrollTop = aicBody.scrollHeight;
    }, 900);
  };

  if (aicSend) aicSend.addEventListener('click', sendInput);
  if (aicInput) aicInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendInput(); });

  /* ---------- KPI counter animation (scene 4) ---------- */
  const counters = $$('[data-counter]');
  const animateCount = (el) => {
    const target = Number(el.dataset.counter);
    if (!isFinite(target)) return;
    const duration = 1100;
    const start = performance.now();
    const fmt = (n) => Math.round(n).toLocaleString('vi-VN') + ' ₫';
    const orig = el.textContent;
    const run = (t) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(target * eased);
      if (k < 1) requestAnimationFrame(run);
      else el.textContent = orig;
    };
    requestAnimationFrame(run);
  };

  if ('IntersectionObserver' in window && counters.length) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCount(e.target);
          cio.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(el => cio.observe(el));
  }
})();
