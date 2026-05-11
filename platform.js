/* =====================================================
   WinX Business · cockpit demo
   State machine driving POS · Business · AI panels two-way.
   ===================================================== */
(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- INITIAL STATE ---------- */
  const initial = {
    balance:       42_180_000,
    todaySales:    8_420_000,
    todayQr:       5_130_000,
    todayCash:     2_740_000,
    todayInvoices: 24,
    duePay:       14_600_000,
    runwayDays:    6.5,
    invoiceSeq:   192,
    auditSeq:     8,

    inventory: {
      omachi:   { name: 'Mì Omachi sườn hầm',   qty: 23, lowAt: 10 },
      chinsu:   { name: 'Chinsu cá cơm',         qty: 15, lowAt: 5  },
      wakeup:   { name: 'Wake-Up 247',           qty:  8, lowAt: 10 },
      vinacafe: { name: 'Vinacafé 3in1',         qty: 41, lowAt: 8  },
      skuX:     { name: 'SKU X · tồn 38 ngày',   qty: 12, slow: true },
    },

    cart: {
      total: 181_000,
      lines: [
        { sku: 'omachi',   qty: 2 },
        { sku: 'chinsu',   qty: 1 },
        { sku: 'wakeup',   qty: 3 },
        { sku: 'vinacafe', qty: 1 },
      ],
    },

    approval: {
      pending: true,
      done: false,
      gross: 12_400_000,
      net:   11_980_000,
      discount: 420_000,
      counterparty: 'NPP MCH HCMC-07',
      invoice: 'MCH-4412',
    },

    posBusy: false,
  };
  let state = clone(initial);

  function clone(o){ return JSON.parse(JSON.stringify(o)); }

  /* ---------- VND FORMATTING ---------- */
  const fmtVnd = n => n.toLocaleString('vi-VN');
  const fmtTr  = n => (n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + 'tr';
  const fmtNgay = n => n.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  /* ---------- CLOCK ---------- */
  const clockEl = $('#ckClock');
  function tickClock(){
    if (!clockEl) return;
    const d = new Date();
    clockEl.textContent = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  tickClock();
  setInterval(tickClock, 30_000);

  /* ---------- RENDERERS ---------- */
  function renderAll(){
    renderBusiness();
    renderPos();
    renderApproval();
    // inventory + staff render lazily (only on mutation)
  }

  function renderBusiness(){
    setVnd('#bizBalance', state.balance);
    setVnd('#todaySales', state.todaySales);
    setVnd('#todayQr',    state.todayQr);
    setVnd('#todayCash',  state.todayCash);
    setVnd('#duePay',     state.duePay);
    const deltaToday = state.todaySales - 0; // ticks-up from intraday
    const deltaEl = $('#bizDelta');
    if (deltaEl) deltaEl.textContent = `▲ ${fmtTr(state.todaySales)} hôm nay`;
    const runwayEl = $('#runwayDays');
    if (runwayEl) runwayEl.textContent = fmtNgay(state.runwayDays);
  }

  function renderPos(){
    const inv = $('#posInvoiceId');
    if (inv) inv.textContent = String(state.invoiceSeq).padStart(5,'0');
    setVnd('#todayInvoices', state.todayInvoices);
    setVnd('#posTotal', state.cart.total);
    setVnd('#posCollectAmt', state.cart.total);
    const qrAmt = $('#qrAmt');
    if (qrAmt) qrAmt.textContent = `${fmtVnd(state.cart.total)} ₫`;
    const qrDoneAmt = $('#qrDoneAmt');
    if (qrDoneAmt) qrDoneAmt.textContent = `${fmtVnd(state.cart.total)} ₫`;
  }

  function renderApproval(){
    const card = $('#bizApproval');
    if (!card) return;
    setVnd('#bzaAmtGross', state.approval.gross);
    setVnd('#bzaAmtNet',   state.approval.net);

    const btn = $('#bzaApprove');
    const success = $('#bzaSuccess');

    if (state.approval.done) {
      card.classList.add('is-done');
      if (btn) btn.style.display = 'none';
      const gate = card.querySelector('.bza-gate');
      if (gate) gate.style.display = 'none';
      if (success) success.classList.add('is-on');
    } else {
      card.classList.remove('is-done');
      if (btn){
        btn.style.display = '';
        btn.disabled = false;
        btn.textContent = `Phê duyệt & trả · ${fmtVnd(state.approval.net)} ₫`;
      }
      const gate = card.querySelector('.bza-gate');
      if (gate) gate.style.display = '';
      if (success) success.classList.remove('is-on');
    }
  }

  function setVnd(sel, n){
    const el = typeof sel === 'string' ? $(sel) : sel;
    if (!el) return;
    const cur = parseInt(el.textContent.replace(/\D/g,''), 10) || 0;
    if (cur === n) return;
    animateNumber(el, cur, n, 600);
  }

  function animateNumber(el, from, to, ms){
    el.classList.add('is-counting');
    const start = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);
    function step(now){
      const t = Math.min(1, (now - start) / ms);
      const v = Math.round(from + (to - from) * ease(t));
      el.textContent = v.toLocaleString('vi-VN');
      if (t < 1) requestAnimationFrame(step);
      else setTimeout(() => el.classList.remove('is-counting'), 200);
    }
    requestAnimationFrame(step);
  }

  function flashPanel(productKey){
    const col = $(`[data-product="${productKey}"]`);
    if (!col) return;
    col.classList.remove('is-flash');
    void col.offsetWidth;
    col.classList.add('is-flash');
    setTimeout(() => col.classList.remove('is-flash'), 1300);
  }

  function flashEl(el){
    if (!el) return;
    el.classList.remove('is-flash');
    void el.offsetWidth;
    el.classList.add('is-flash');
    setTimeout(() => el.classList.remove('is-flash'), 1700);
  }

  /* ---------- INVENTORY RENDER + helpers ---------- */
  function renderInventory(){
    Object.entries(state.inventory).forEach(([sku, item]) => {
      const li = $(`#ckInvList li[data-sku="${sku}"]`);
      if (!li) return;
      const qtyEl = li.querySelector('.inv-qty');
      if (qtyEl) qtyEl.textContent = item.qty;
      if (!item.slow){
        li.classList.toggle('is-low', item.qty <= (item.lowAt || 8));
      }
    });
  }

  function highlightInvRow(sku){
    const li = $(`#ckInvList li[data-sku="${sku}"]`);
    flashEl(li);
  }

  function highlightStaff(name){
    const row = $(`#ckStaffList .st-row[data-staff="${name}"]`);
    flashEl(row);
  }

  /* ---------- EVENT LOG ---------- */
  const logListEl = $('#ckLogList');
  const channelLabel = {
    pos: 'POS', vietqr: 'VietQR', biz: 'Business', inv: 'Inv',
    ai: 'AI', bank: 'Bank', compl: 'Compl', einv: 'eInv', ncc: 'NCC',
  };

  function logEvent(chan, text, when){
    if (!logListEl) return;
    const li = document.createElement('li');
    li.className = 'ck-log-item';
    const time = when || clockEl?.textContent || '10:42';
    const label = channelLabel[chan] || chan;
    li.innerHTML = `
      <span class="ck-log-time">${time}</span>
      <span class="ck-log-chan ck-log-chan-${label}">${label}</span>
      <span class="ck-log-text">${text}</span>
    `;
    logListEl.prepend(li);
    // keep at most 30 lines
    while (logListEl.children.length > 30){
      logListEl.removeChild(logListEl.lastChild);
    }
  }

  function seedLog(){
    if (!logListEl) return;
    logListEl.innerHTML = '';
    const seed = [
      { t: '10:31', c: 'ai',    x: 'Khớp <strong>HĐ #MCH-4412</strong> với PO + GR · phát hiện 420.000 ₫ CK Tết chưa khai · đề xuất trả ròng 11.980.000 ₫' },
      { t: '10:25', c: 'ncc',   x: '<strong>NPP MCH HCMC-07</strong> gửi hóa đơn #MCH-4412 · 12.400.000 ₫ → chờ chủ tiệm duyệt' },
      { t: '10:08', c: 'ai',    x: 'Cảnh báo tồn: <strong>Wake-Up 247</strong> còn 8 thùng · hết trong ~1,2 ngày · gợi ý đặt lại NPP' },
      { t: '09:45', c: 'pos',   x: 'Huy bán HĐ #WX-00188 · 78.000 ₫' },
      { t: '09:12', c: 'pos',   x: 'Lan bán HĐ #WX-00187 · 142.000 ₫ · HĐĐT-MTT phát hành' },
      { t: '08:30', c: 'biz',   x: 'Mai đối soát số dư đầu ngày · 33.760.000 ₫' },
    ];
    // prepend in order (oldest first) so prepend stacks newest on top
    [...seed].reverse().forEach(e => logEvent(e.c, e.x, e.t));
  }

  /* ---------- ACTION: POS COLLECT (Khả năng 2 + 6) ---------- */
  const posCollect = $('#posCollect');
  const posQrCard  = $('#posQrCard');
  const posQrDone  = $('#posQrDone');
  const posQrDoneSub = $('#posQrDoneSub');
  const posEmpty   = posQrCard?.previousElementSibling; // .pos-qr-empty

  async function runPosCollect(){
    if (state.posBusy) return;
    state.posBusy = true;

    const time = clockEl?.textContent || '10:42';
    const amt = state.cart.total;
    const newSeq = state.invoiceSeq + 1;
    const invoiceNum = `WX-${String(newSeq).padStart(5,'0')}`;

    // step 1: hide empty, show QR
    if (posCollect){ posCollect.disabled = true; posCollect.textContent = 'Đang tạo QR...'; }
    if (posEmpty)  posEmpty.style.display = 'none';
    if (posQrDone) posQrDone.classList.remove('is-on');
    if (posQrCard) posQrCard.classList.add('is-on');

    flashPanel('pos');
    logEvent('pos',    `Mở giỏ <strong>#${invoiceNum}</strong> · ${fmtVnd(amt)} ₫ · 4 SKU · Lan thu`, time);

    await wait(450);
    logEvent('vietqr', `Phát mã QR động · VA Quầy 9821 0001 9872 · NAPAS247`, time);

    await wait(900);
    logEvent('pos',    `Quét QR thành công · NAPAS247 đối soát 0,4s`, time);

    // step 2: QR done → ledger update
    if (posQrCard) posQrCard.classList.remove('is-on');
    if (posQrDoneSub) posQrDoneSub.innerHTML = `HĐĐT-MTT #${invoiceNum} · NĐ70 · ↗ ví doanh nghiệp`;
    if (posQrDone) posQrDone.classList.add('is-on');

    // mutate state
    state.balance      += amt;
    state.todaySales   += amt;
    state.todayQr      += amt;
    state.todayInvoices += 1;
    state.invoiceSeq    = newSeq;
    // Decrement per cart qty so the log line and inventory rows stay consistent
    state.cart.lines.forEach(line => {
      const inv = state.inventory[line.sku];
      if (inv) inv.qty = Math.max(0, inv.qty - line.qty);
    });

    renderBusiness();
    renderPos();
    renderInventory();
    flashPanel('biz');

    await wait(200);
    logEvent('biz',  `+${fmtVnd(amt)} ₫ vào ví · giữ tại NH đối tác · TK đảm bảo`, time);

    await wait(220);
    logEvent('einv', `<strong>HĐĐT-MTT #${invoiceNum}</strong> phát hành theo Nghị định 70 · gửi GDT`, time);

    await wait(220);
    logEvent('inv',  `Trừ tồn · Om -2 · Cs -1 · W -3 · Vc -1`, time);

    // highlight inventory rows
    ['omachi','chinsu','wakeup','vinacafe'].forEach(s => highlightInvRow(s));

    await wait(300);
    flashPanel('ai');
    logEvent('ai',   `Ca Lan giờ này <strong>+12%</strong> vs trung bình 90 ngày · pattern cập nhật`, time);

    await wait(260);
    logEvent('bank', `NH đối tác xác nhận ghi nhận VA-01 · 1,2s · audit log`, time);

    // settle UI
    await wait(900);
    if (posQrDone) posQrDone.classList.remove('is-on');
    if (posEmpty)  posEmpty.style.display = '';
    if (posCollect){
      posCollect.disabled = false;
      posCollect.innerHTML = `Thu QR tiếp · <span id="posCollectAmt">${fmtVnd(amt)}</span> ₫`;
    }
    state.posBusy = false;
  }

  posCollect?.addEventListener('click', runPosCollect);

  function wait(ms){ return new Promise(res => setTimeout(res, ms)); }

  /* ---------- ACTION: APPROVE NCC PAYMENT (Khả năng 3) ---------- */
  const bzaApprove = $('#bzaApprove');
  async function runApproveNcc(){
    if (state.approval.done) return;
    if (!bzaApprove) return;

    bzaApprove.disabled = true;
    bzaApprove.textContent = 'Đang xử lý phê duyệt...';

    const time = clockEl?.textContent || '10:42';
    flashPanel('biz');
    logEvent('biz',   `Cô Minh Anh phê duyệt NCC <strong>MCH HCMC-07</strong> #MCH-4412 · 11.980.000 ₫ (đã áp CK 420.000 ₫)`, time);

    await wait(900);
    logEvent('compl', `Quy tắc > 1tr · owner duyệt · Lan/Huy không có quyền (tuân thủ NĐ 13/2023 PDPA)`, time);

    await wait(500);
    state.balance  -= state.approval.net;
    state.duePay   -= state.approval.gross;
    if (state.duePay < 0) state.duePay = 0;
    state.runwayDays = Math.max(1, +(state.runwayDays - 1.3).toFixed(1));
    state.auditSeq  += 1;
    state.approval.done = true;

    const auditId = `AL-${time.replace(':','')}-${String(state.auditSeq).padStart(2,'0')}`;
    const auditEl = $('#bzaAuditId');
    if (auditEl) auditEl.textContent = `#${auditId}`;

    renderBusiness();
    renderApproval();

    logEvent('biz',   `Chuyển khoản NCC · 11.980.000 ₫ · audit <strong>#${auditId}</strong>`, time);

    await wait(280);
    flashPanel('ai');
    logEvent('ai',    `Cập nhật runway tiền mặt: 6,5 → ${fmtNgay(state.runwayDays)} ngày · tỷ lệ trả NCC đúng hạn vẫn giữ 96%`, time);

    await wait(220);
    logEvent('bank',  `NH đối tác trừ VA-01 · audit ghi nhận song song · ISO 27001`, time);
  }
  bzaApprove?.addEventListener('click', runApproveNcc);

  /* ---------- ACTION: AI CHAT SUGGEST PILLS ---------- */
  const aicBody    = $('#aicBody');
  const aicSuggest = $('#aicSuggest');

  function appendUserBubble(text){
    if (!aicBody) return;
    const b = document.createElement('div');
    b.className = 'bubble bubble-user';
    const p = document.createElement('p');
    p.textContent = text;
    b.appendChild(p);
    aicBody.appendChild(b);
    aicBody.scrollTop = aicBody.scrollHeight;
  }

  function appendAiBubble(html){
    if (!aicBody) return;
    const b = document.createElement('div');
    b.className = 'bubble bubble-ai';
    b.innerHTML = html;
    aicBody.appendChild(b);
    aicBody.scrollTop = aicBody.scrollHeight;
    return b;
  }

  function appendTyping(){
    if (!aicBody) return null;
    const b = document.createElement('div');
    b.className = 'bubble is-typing';
    b.innerHTML = '<span></span><span></span><span></span>';
    aicBody.appendChild(b);
    aicBody.scrollTop = aicBody.scrollHeight;
    return b;
  }

  const aiAnswers = {
    skux: {
      userText: 'SKU X tồn 38 ngày — làm gì?',
      thinking: 900,
      html: `
        <p>Bán chậm hơn ngưỡng 30 ngày (hiện 38 ngày, vòng quay 9% so với SKU khác). Có hai cách:</p>
        <ul class="bubble-ul">
          <li>Giảm 15% (25.000 → <strong>21.250 ₫</strong>) — doanh số dự kiến tuần sau <strong>+320k</strong>.</li>
          <li>Trả lại NPP cùng đợt CK Tết (đang còn 6 ngày).</li>
        </ul>
        <button type="button" class="bubble-buy-cta" data-cta="markdown-skux">Áp giảm 15% lên POS →</button>
      `,
      onShow: () => {
        highlightInvRow('skuX');
        logEvent('ai', `User hỏi: SKU X tồn 38 ngày — làm gì? · AI đề xuất giảm 15% hoặc trả lại NPP`);
      }
    },
    nhap30: {
      userText: 'Tuần này có nên nhập 30tr không?',
      thinking: 1100,
      html: `
        <p>Được, nhưng phải chọn 1 trong 2:</p>
        <ul class="bubble-ul">
          <li>Rút <strong>80 triệu ₫</strong> từ hạn mức pre-approved (9,5%/năm · 8,7tr/tháng) — đã duyệt sẵn từ doanh số 90 ngày POS.</li>
          <li>Hoãn <strong>12 triệu ₫</strong> công nợ chưa gấp (NCC đá viên, anh Tâm giao).</li>
        </ul>
        <p>Đề xuất danh mục nhập:</p>
        <div class="bubble-buy">
          <div class="buy-row"><span class="prod-chip prod-omachi">Om</span><span>Omachi (sắp hết)</span><strong>12tr ₫</strong></div>
          <div class="buy-row"><span class="prod-chip prod-chinsu">Cs</span><span>Chinsu cá cơm</span><strong>8tr ₫</strong></div>
          <div class="buy-row"><span class="prod-chip prod-wakeup">W</span><span>Wake-Up 247</span><strong>5tr ₫</strong></div>
          <div class="buy-row"><span class="prod-chip prod-vinacafe">Vc</span><span>Vinacafé 3in1</span><strong>5tr ₫</strong></div>
          <div class="buy-row buy-row-x"><span class="prod-chip prod-x">X</span><span>SKU X (chậm)</span><strong>0 ₫ · tránh</strong></div>
        </div>
        <button type="button" class="bubble-buy-cta" data-cta="po-create">Tạo PO gửi NPP MCH →</button>
      `,
      onShow: () => {
        logEvent('ai', `User hỏi: tuần này nhập 30tr? · AI đề xuất danh mục 4 SKU + 2 phương án vốn`);
      }
    },
    anomaly: {
      userText: 'Có gì bất thường ca này?',
      thinking: 800,
      html: `
        <p>Có 1 bất thường:</p>
        <p><strong>Ca Lan 17-18h thứ Sáu</strong> doanh thu 0,65tr — thấp hơn pattern 90 ngày 550k (avg 1,2tr). Số hóa đơn 12 vs trung bình 18.</p>
        <p>3 khả năng:</p>
        <ul class="bubble-ul">
          <li>Khách thưa thật (kiểm tra camera quầy).</li>
          <li>Hóa đơn chưa phát hành (kiểm tra HĐĐT-MTT log).</li>
          <li>Tiền mặt chưa khai (kiểm tra két).</li>
        </ul>
        <p>Đề xuất: kiểm tra log ca Lan và đối soát két cuối ca.</p>
      `,
      onShow: () => {
        highlightStaff('lan');
        logEvent('ai', `User hỏi: bất thường ca này? · AI flag Lan 17-18h · -550k vs pattern`);
      }
    }
  };

  function answerAi(key){
    const ans = aiAnswers[key];
    if (!ans || !aicBody) return;
    appendUserBubble(ans.userText);
    const typing = appendTyping();
    flashPanel('ai');
    setTimeout(() => {
      typing?.remove();
      const bubble = appendAiBubble(ans.html);
      ans.onShow && ans.onShow();
      // wire CTAs inside the bubble
      bubble?.querySelectorAll('[data-cta]').forEach(btn => {
        btn.addEventListener('click', () => handleAiCta(btn.dataset.cta, btn));
      });
    }, ans.thinking);
  }

  aicSuggest?.querySelectorAll('.suggest-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const q = pill.dataset.q;
      if (!aiAnswers[q]) return;
      pill.disabled = true;
      answerAi(q);
    });
  });

  function handleAiCta(cta, btn){
    const time = clockEl?.textContent || '10:42';
    if (cta === 'markdown-skux'){
      // back-direction: AI drives POS
      btn.disabled = true;
      btn.textContent = '✓ Đã áp giảm 15% lên POS';
      const invLi = $(`#ckInvList li[data-sku="skuX"]`);
      if (invLi){
        invLi.classList.add('is-flash');
        const name = invLi.querySelector('.inv-name');
        if (name) name.innerHTML = 'SKU X · <strong style="color:#C73E3A">-15% AI</strong>';
        setTimeout(() => invLi.classList.remove('is-flash'), 1600);
      }
      flashPanel('pos');
      logEvent('ai',  `User chấp nhận đề xuất · áp giảm 15% lên SKU X tại POS`, time);
      logEvent('pos', `Cập nhật giá khuyến mãi SKU X · 25.000 → <strong>21.250 ₫</strong>`, time);
    }
    if (cta === 'po-create'){
      btn.disabled = true;
      btn.textContent = '✓ Đã tạo PO gửi NPP MCH';
      flashPanel('biz');
      logEvent('biz', `Tạo PO nhập hàng · 30.000.000 ₫ · gửi NPP MCH HCMC-07 · chờ duyệt chuyển khoản`, time);
      logEvent('ai',  `Tự soạn bản nháp PO từ doanh số 90 ngày · 4 SKU · ưu tiên Omachi`, time);
    }
  }

  /* ---------- ACTION: AI FREE INPUT ---------- */
  const aicForm = $('#aicForm');
  const aicInput = $('#aicInputText');
  aicForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (aicInput?.value || '').trim();
    if (!v) return;
    appendUserBubble(v);
    if (aicInput) aicInput.value = '';
    const typing = appendTyping();
    flashPanel('ai');
    setTimeout(() => {
      typing?.remove();
      appendAiBubble(`<p>Câu này demo chưa wire sẵn. Bấm thử 3 gợi ý phía trên — mỗi câu sẽ kéo data từ POS, Business hoặc lịch sử NPP MCH và trả về một đề xuất kèm action.</p>`);
    }, 700);
  });

  /* ---------- ACTION: ANOMALY CARD CLICK (AI → Staff) ---------- */
  const anomalyCard = $('#aiCardAnomaly');
  anomalyCard?.addEventListener('click', () => {
    highlightStaff('lan');
    flashPanel('biz');
    logEvent('ai', `Mở chi tiết cảnh báo · ca Lan 17-18h · -550k vs pattern`);
  });

  /* ---------- BUSINESS QUICK ACTIONS ---------- */
  $$('.biz-qa').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'staff'){
        openModal('modalStaff');
      } else if (action === 'einvoice'){
        openModal('modalEinv');
      } else if (action === 'weekly'){
        openModal('modalWeekly');
      } else if (action === 'trancc'){
        // scroll/focus to approval card on the same panel
        const ap = $('#bizApproval');
        if (ap){
          ap.scrollIntoView({ behavior: 'smooth', block: 'center' });
          flashEl(ap);
        }
      } else if (action === 'payroll'){
        const time = clockEl?.textContent || '10:42';
        flashPanel('biz');
        logEvent('biz', `Mở lịch trả lương · 3 nhân viên · 14,4tr · lập ngày 15`, time);
      } else if (action === 'tax'){
        const time = clockEl?.textContent || '10:42';
        flashPanel('biz');
        logEvent('biz', `Mở khai thuế GTGT · tự tổng hợp từ HĐĐT-MTT NĐ70`, time);
        logEvent('einv', `Tổng hợp HĐĐT-MTT tuần · 312 hóa đơn · sẵn sàng nộp`, time);
      }
    });
  });

  /* ---------- AI BRIEF OPEN ---------- */
  $('#aiBriefOpen')?.addEventListener('click', () => openModal('modalWeekly'));

  /* ---------- E-INVOICE VIEW ---------- */
  $('#posEinvView')?.addEventListener('click', () => openModal('modalEinv'));

  /* ---------- VA VIEW ---------- */
  $('#bizVaView')?.addEventListener('click', () => openModal('modalVa'));

  /* ---------- MODAL PLUMBING ---------- */
  function openModal(id){
    const m = document.getElementById(id);
    if (!m) return;
    m.hidden = false;
    document.body.style.overflow = 'hidden';
    // sync e-invoice number with current seq
    if (id === 'modalEinv'){
      const num = $('#einvNumber');
      const date = $('#einvDate');
      if (num)  num.textContent  = `WX-${String(state.invoiceSeq).padStart(5,'0')}`;
      if (date) date.textContent = `${new Date().toLocaleDateString('vi-VN')} · ${clockEl?.textContent || '10:42'}`;
      const cqt = $('#einvCqt');
      if (cqt) cqt.textContent = `00C73E3A-2026-WX${String(state.invoiceSeq).slice(-3)}`;
    }
  }
  function closeModal(m){
    m.hidden = true;
    document.body.style.overflow = '';
  }
  $$('[data-close]').forEach(el => {
    el.addEventListener('click', () => {
      const m = el.closest('.ck-modal');
      if (m) closeModal(m);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape'){
      $$('.ck-modal').forEach(m => { if (!m.hidden) closeModal(m); });
    }
  });

  /* ---------- STAFF FORM SUBMIT ---------- */
  const staffForm = $('#staffForm');
  staffForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name  = $('#sfName')?.value || 'thành viên mới';
    const phone = $('#sfPhone')?.value || '';
    const role  = (document.querySelector('input[name="sfRole"]:checked')?.value) || 'cashier';
    const limit = $('#sfLimit')?.value || '';
    const roleVi = { cashier: 'Thu ngân', sales: 'Bán hàng', accountant: 'Kế toán' }[role] || 'Nhân viên';
    const time = clockEl?.textContent || '10:42';

    flashPanel('biz');
    logEvent('biz',   `Mời thành viên <strong>${name}</strong> (${phone}) · vai trò ${roleVi} · hạn mức ${limit}`, time);
    logEvent('compl', `Cập nhật ma trận phân quyền · audit log bật mặc định · NĐ 13/2023 PDPA`, time);
    const m = $('#modalStaff');
    if (m) closeModal(m);
  });

  /* ---------- RESET ---------- */
  $('#ckReset')?.addEventListener('click', () => {
    state = clone(initial);
    state.posBusy = false;
    renderAll();
    renderInventory();
    seedLog();
    // reset UI
    $$('.bubble-user, .bubble-ai:not(:first-child), .bubble.is-typing').forEach(b => b.remove());
    $$('.suggest-pill').forEach(p => p.disabled = false);
    $('#bzaSuccess')?.classList.remove('is-on');
    $('#bizApproval')?.classList.remove('is-done');
    $('#posQrCard')?.classList.remove('is-on');
    $('#posQrDone')?.classList.remove('is-on');
    const posEmptyEl = $('#posQrStage .pos-qr-empty');
    if (posEmptyEl) posEmptyEl.style.display = '';
    const btn = $('#posCollect');
    if (btn){
      btn.disabled = false;
      btn.innerHTML = `Thu QR · <span id="posCollectAmt">${fmtVnd(state.cart.total)}</span> ₫`;
    }
    // reset inv-name for SKU X
    const invX = $(`#ckInvList li[data-sku="skuX"] .inv-name`);
    if (invX) invX.textContent = 'SKU X · tồn 38 ngày';
  });

  /* ---------- INIT ---------- */
  renderAll();
  renderInventory();
  seedLog();
})();
