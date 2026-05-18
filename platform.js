/* =====================================================
   WinX Business · cockpit demo v2
   GT-relevant state machine · every tile interactive
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
      omachi:   { name: 'Mì Omachi sườn hầm', qty: 23, lowAt: 10 },
      chinsu:   { name: 'Chinsu cá cơm',       qty: 15, lowAt: 5  },
      wakeup:   { name: 'Wake-Up 247',         qty:  8, lowAt: 10 },
      vinacafe: { name: 'Vinacafé 3in1',       qty: 41, lowAt: 8  },
      skuX:     { name: 'SKU X · tồn 38 ngày', qty: 12, slow: true },
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
      done: false,
      gross: 12_400_000,
      net:   11_980_000,
      discount: 420_000,
      counterparty: 'NPP MCH HCM-07',
      invoice: 'MCH-4412',
    },

    debt: {
      total: 1_230_000,
      count: 4,
      customers: {
        anh:   { name: 'Chú An',    phone: '0907·xxx·128', days: 18, amt: 350_000, sent: false },
        huong: { name: 'Chị Hương', phone: '0908·xxx·215', days:  9, amt: 220_000, sent: false },
        tai:   { name: 'Anh Tài',   phone: '0905·xxx·702', days:  5, amt: 480_000, sent: false },
        lan:   { name: 'Cô Lan',    phone: '0903·xxx·844', days:  2, amt: 180_000, sent: false },
      },
    },

    loan: { drawn: false, drawAmt: 80_000_000 },

    loyalty: {
      monthlyCommission: 1_870_000,
      todayScans: 12,
      todayRedemptions: 4,
      todayCommission: 53_000,
      crossSellSent: false,
      posmOrdered: {},
      activeCampaigns: 5,
    },

    compliance: {
      einv: true,
      tax:  true,
    },

    posBusy: false,
  };
  let state = clone(initial);

  function clone(o){ return JSON.parse(JSON.stringify(o)); }

  /* ---------- FORMATTING ---------- */
  const fmtVnd  = n => n.toLocaleString('vi-VN');
  const fmtTr   = n => (n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + 'tr';
  const fmtNgay = n => n.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  /* ---------- CLOCK ---------- */
  const clockEl = $('#ckClock');
  function tickClock(){
    if (!clockEl) return;
    const d = new Date();
    clockEl.textContent = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  function now(){ return clockEl?.textContent || '10:42'; }
  tickClock();
  setInterval(tickClock, 30_000);

  /* ---------- RENDERERS ---------- */
  function renderAll(){
    renderBusiness();
    renderPos();
    renderApproval();
    renderDebt();
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

  function renderBusiness(){
    setVnd('#bizBalance', state.balance);
    setVnd('#todayQr',    state.todayQr);
    setVnd('#todayCash',  state.todayCash);
    setVnd('#duePay',     state.duePay);
    setVnd('#todaySales', state.todaySales);
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
    setVnd('#bzaAmtNet', state.approval.net);

    const btn = $('#bzaApprove');
    const success = $('#bzaSuccess');
    const main = card.querySelector('.bza-main');
    const ai   = card.querySelector('.bza-ai');
    const gate = card.querySelector('.bza-gate');

    if (state.approval.done){
      card.classList.add('is-done');
      if (btn)  btn.style.display  = 'none';
      if (main) main.style.opacity = '.55';
      if (ai)   ai.style.display   = 'none';
      if (gate) gate.style.display = 'none';
      if (success) success.classList.add('is-on');
    } else {
      card.classList.remove('is-done');
      if (btn){
        btn.style.display = '';
        btn.disabled = false;
        btn.textContent = `Phê duyệt & trả ${fmtVnd(state.approval.net)} ₫`;
      }
      if (main) main.style.opacity = '';
      if (ai)   ai.style.display   = '';
      if (gate) gate.style.display = '';
      if (success) success.classList.remove('is-on');
    }
  }

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
    const lowCount = Object.values(state.inventory).filter(i => !i.slow && i.qty <= (i.lowAt || 8)).length;
    const lcEl = $('#lowCount');
    if (lcEl) lcEl.textContent = lowCount;
  }

  function renderDebt(){
    const totalEl = $('#debtTotal');
    const countEl = $('#debtCount');
    if (totalEl) totalEl.textContent = fmtVnd(state.debt.total);
    if (countEl) countEl.textContent = state.debt.count;
    Object.entries(state.debt.customers).forEach(([key, c]) => {
      const li = $(`#ckDebtList li[data-cust="${key}"]`);
      if (!li) return;
      const amt = li.querySelector('.dt-amt');
      if (amt){
        const k = Math.round(c.amt / 1000);
        amt.textContent = c.sent ? `${k}k · ⏳ nhắc` : `${k}k`;
        amt.style.color = c.sent ? 'var(--ok)' : '';
      }
    });
  }

  /* ---------- PANEL FLASH + ROW HIGHLIGHT ---------- */
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
  function highlightInvRow(sku){ flashEl($(`#ckInvList li[data-sku="${sku}"]`)); }
  function highlightStaff(name){ flashEl($(`#ckStaffList .st-row[data-staff="${name}"]`)); }

  /* ---------- EVENT TICKER (single-line + full log) ---------- */
  const tickerListEl = $('#ckTickerList');
  const logFullEl = $('#ckLogFull');
  const channelLabel = {
    pos: 'POS', vietqr: 'VietQR', biz: 'Business', inv: 'Inv',
    ai: 'AI', bank: 'Bank', compl: 'Compl', einv: 'eInv', ncc: 'NCC',
  };
  const allEvents = [];

  function logEvent(chan, text, when){
    const time = when || now();
    const label = channelLabel[chan] || chan;
    const entry = { time, chan: label, text };
    allEvents.unshift(entry);
    if (allEvents.length > 60) allEvents.length = 60;
    renderTicker();
    renderFullLog();
  }

  function renderTicker(){
    if (!tickerListEl) return;
    tickerListEl.innerHTML = '';
    const latest = allEvents[0];
    if (!latest) return;
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="ck-log-time">${latest.time}</span>
      <span class="ck-log-chan ck-log-chan-${latest.chan}">${latest.chan}</span>
      <span class="ck-log-text">${latest.text}</span>
    `;
    tickerListEl.appendChild(li);
  }

  function renderFullLog(){
    if (!logFullEl) return;
    logFullEl.innerHTML = '';
    allEvents.forEach(e => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="ck-log-time">${e.time}</span>
        <span class="ck-log-chan ck-log-chan-${e.chan}">${e.chan}</span>
        <span class="ck-log-text">${e.text}</span>
      `;
      logFullEl.appendChild(li);
    });
  }

  function seedLog(){
    allEvents.length = 0;
    // Seed in chronological order — push so the last item is newest
    const seed = [
      { t: '08:14', c: 'ncc',   x: 'NV MCH route-truck <strong>anh Hùng (RT-1207)</strong> check-in tại tiệm · 4 SKU sell-in mới' },
      { t: '08:30', c: 'biz',   x: 'Mai đối soát số dư đầu ngày · 33.760.000 ₫' },
      { t: '09:12', c: 'pos',   x: 'Lan bán HĐ #WX-00187 · 142.000 ₫ · HĐĐT-MTT phát hành' },
      { t: '09:32', c: 'biz',   x: 'Cô Lan đổi voucher <strong>Omachi −25k</strong> tại tiệm · + 18k hoa hồng' },
      { t: '09:45', c: 'pos',   x: 'Huy bán HĐ #WX-00188 · 78.000 ₫' },
      { t: '10:02', c: 'biz',   x: 'Trả <strong>Vinamilk NPP Bình Tân</strong> qua WinX QR-out · 6.800.000 ₫ · không cần Vinamilk đồng ý' },
      { t: '10:08', c: 'ai',    x: 'Cảnh báo tồn: <strong>Wake-Up 247</strong> còn 8 thùng · hết trong ~1,2 ngày' },
      { t: '10:20', c: 'biz',   x: 'Anh Tài đổi voucher <strong>MEATDeli −15k</strong> · + 12k hoa hồng cho tiệm' },
      { t: '10:25', c: 'ncc',   x: '<strong>NPP MCH HCM-07</strong> gửi HĐ #MCH-4412 · 12.400.000 ₫ → chờ chủ tiệm duyệt' },
      { t: '10:31', c: 'ai',    x: 'Khớp <strong>#MCH-4412</strong> với đơn đặt + phiếu giao · phát hiện 420.000 ₫ CK Tết chưa khai · đề xuất trả ròng 11.980.000 ₫' },
      { t: '10:35', c: 'ai',    x: 'Dual-ledger match · <strong>MCH sell-in × POS sell-out</strong> · Omachi velocity +18% vs tháng trước → đề xuất nâng hạn mức nhập hàng 25tr → 30tr' },
      { t: '10:38', c: 'ai',    x: 'Chú An (hạng Bạc, 18 lần Chin-Su) sắp đạt voucher VIP · gợi ý gửi nhắc · WIN consumer graph match' },
    ];
    // Newest first: unshift each in order so the last seed entry (10:31) ends up at index 0
    seed.forEach(e => allEvents.unshift({ time: e.t, chan: channelLabel[e.c], text: e.x }));
    renderTicker();
    renderFullLog();
  }

  /* ---------- POS COLLECT ---------- */
  const posCollect = $('#posCollect');
  const posQrCard  = $('#posQrCard');
  const posQrDone  = $('#posQrDone');
  const posQrDoneSub = $('#posQrDoneSub');
  const posEmpty   = $('#posQrEmpty');

  async function runPosCollect(){
    if (state.posBusy) return;
    state.posBusy = true;

    const time = now();
    const amt = state.cart.total;
    const newSeq = state.invoiceSeq + 1;
    const invoiceNum = `WX-${String(newSeq).padStart(5,'0')}`;

    if (posCollect){ posCollect.disabled = true; posCollect.textContent = 'Đang tạo QR...'; }
    if (posEmpty)   posEmpty.style.display = 'none';
    if (posQrDone)  posQrDone.classList.remove('is-on');
    if (posQrCard)  posQrCard.classList.add('is-on');

    flashPanel('pos');
    logEvent('pos',    `Mở giỏ <strong>#${invoiceNum}</strong> · ${fmtVnd(amt)} ₫ · 4 SKU · Lan thu`, time);

    await wait(420);
    logEvent('vietqr', `Phát mã QR động · VA Quầy 9821 0001 9872 · NAPAS247`, time);

    await wait(880);
    logEvent('pos',    `Quét QR thành công · NAPAS247 đối soát 0,4 giây`, time);

    if (posQrCard) posQrCard.classList.remove('is-on');
    if (posQrDoneSub){
      posQrDoneSub.innerHTML = state.compliance.einv
        ? `HĐĐT-MTT #${invoiceNum} · NĐ70 · ↗ ví`
        : `Đã thu · HĐĐT thủ công (NĐ 70 đang tắt) · ↗ ví`;
    }
    if (posQrDone) posQrDone.classList.add('is-on');

    state.balance      += amt;
    state.todaySales   += amt;
    state.todayQr      += amt;
    state.todayInvoices += 1;
    state.invoiceSeq    = newSeq;
    state.cart.lines.forEach(line => {
      const inv = state.inventory[line.sku];
      if (inv) inv.qty = Math.max(0, inv.qty - line.qty);
    });

    renderBusiness();
    renderPos();
    renderInventory();
    flashPanel('biz');

    await wait(180);
    logEvent('biz',  `+${fmtVnd(amt)} ₫ vào ví · giữ tại NH đối tác · TK đảm bảo`, time);

    await wait(200);
    if (state.compliance.einv){
      logEvent('einv', `<strong>HĐĐT-MTT #${invoiceNum}</strong> phát hành theo Nghị định 70 · gửi GDT`, time);
    } else {
      logEvent('compl', `Lưu giao dịch thủ công · HĐĐT-MTT đang tắt · NĐ 70 vẫn bắt buộc, cần phát hành sau`, time);
    }

    await wait(200);
    logEvent('inv',  `Trừ tồn · Om −2 · Cs −1 · W −3 · Vc −1`, time);

    ['omachi','chinsu','wakeup','vinacafe'].forEach(s => highlightInvRow(s));

    await wait(280);
    flashPanel('ai');
    logEvent('ai',   `Ca Lan giờ này <strong>+12%</strong> vs trung bình 90 ngày`, time);

    await wait(240);
    logEvent('bank', `NH đối tác xác nhận ghi nhận VA-01 · 1,2 giây · audit log`, time);

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

  /* ---------- POS GHI SỔ (write to customer credit ledger) ---------- */
  const posGhiNo = $('#posGhiNo');
  async function runPosGhiNo(){
    if (state.posBusy) return;
    state.posBusy = true;

    const time = now();
    const amt = state.cart.total;
    const newSeq = state.invoiceSeq + 1;
    const invoiceNum = `WX-${String(newSeq).padStart(5,'0')}`;

    if (posGhiNo){ posGhiNo.disabled = true; posGhiNo.textContent = 'Đang ghi sổ...'; }
    if (posCollect) posCollect.disabled = true;

    flashPanel('pos');
    logEvent('pos', `Ghi sổ <strong>#${invoiceNum}</strong> · Chú An · ${fmtVnd(amt)} ₫ · chưa thanh toán`, time);

    await wait(500);
    state.debt.customers.anh.amt += amt;
    state.debt.total += amt;
    // todaySales still increments (accrual basis)
    state.todaySales   += amt;
    state.todayInvoices += 1;
    state.invoiceSeq    = newSeq;
    state.cart.lines.forEach(line => {
      const inv = state.inventory[line.sku];
      if (inv) inv.qty = Math.max(0, inv.qty - line.qty);
    });

    renderBusiness();
    renderPos();
    renderInventory();
    renderDebt();
    flashEl($(`#ckDebtList li[data-cust="anh"]`));
    flashPanel('pos');

    await wait(220);
    if (state.compliance.einv){
      logEvent('einv', `<strong>HĐĐT-MTT #${invoiceNum}</strong> phát hành theo Nghị định 70 · MST khách: cá nhân`, time);
    } else {
      logEvent('compl', `Ghi sổ thủ công · HĐĐT đang tắt · NĐ 70 vẫn bắt buộc phát hành cho giao dịch này`, time);
    }

    await wait(220);
    logEvent('biz', `Sổ nợ Chú An: 350k → <strong>${fmtVnd(state.debt.customers.anh.amt)}</strong> ₫ · 18 ngày`, time);

    await wait(260);
    flashPanel('ai');
    logEvent('ai', `Cảnh báo: Chú An nợ &gt; 500k. Gợi ý gửi nhắc VietQR ngay.`, time);

    await wait(800);
    if (posGhiNo){
      posGhiNo.disabled = false;
      posGhiNo.textContent = `Ghi sổ Chú An · ${fmtVnd(state.cart.total)} ₫`;
    }
    if (posCollect) posCollect.disabled = false;
    state.posBusy = false;
  }
  posGhiNo?.addEventListener('click', runPosGhiNo);

  function wait(ms){ return new Promise(res => setTimeout(res, ms)); }

  /* ---------- APPROVE NCC ---------- */
  const bzaApprove = $('#bzaApprove');
  async function runApproveNcc(){
    if (state.approval.done || !bzaApprove) return;

    bzaApprove.disabled = true;
    bzaApprove.textContent = 'Đang xử lý phê duyệt...';

    const time = now();
    flashPanel('biz');
    logEvent('biz', `Cô Minh Anh phê duyệt NCC <strong>MCH HCM-07</strong> #MCH-4412 · 11.980.000 ₫ (đã áp CK 420.000 ₫)`, time);

    await wait(850);
    logEvent('compl', `Quy tắc &gt; 1tr · chỉ chủ tiệm duyệt · Lan/Huy không có quyền · audit ghi nhận`, time);

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

    logEvent('biz', `Chuyển khoản NCC · 11.980.000 ₫ · audit <strong>#${auditId}</strong>`, time);

    await wait(260);
    flashPanel('ai');
    logEvent('ai',  `Cập nhật runway tiền mặt: 6,5 → ${fmtNgay(state.runwayDays)} ngày · tỷ lệ trả NCC đúng hạn vẫn giữ 96%`, time);

    await wait(220);
    logEvent('bank',`NH đối tác trừ VA-01 · ISO 27001 · log ghi song song`, time);
  }
  bzaApprove?.addEventListener('click', runApproveNcc);

  /* ---------- AI CHAT ---------- */
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
    if (!aicBody) return null;
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
    loyalty: {
      userText: 'Brand nào trả hoa hồng nhiều nhất?',
      thinking: 950,
      html: `
        <p>Tháng này tổng hoa hồng <strong>1.870.000 ₫</strong> trên 5 brand. Xếp theo CR3 (tỷ lệ đổi voucher):</p>
        <ul class="bubble-ul">
          <li><strong>Omachi 41%</strong> — đứng đầu cả thị trường GT · 510k hoa hồng tháng.</li>
          <li><strong>MEATDeli 22%</strong> · 280k — đặc biệt mạnh với khách đã mua Chin-Su.</li>
          <li><strong>Nam Ngư x10 16%</strong> · 480k · Chin-Su Tết 15,8% · 420k.</li>
        </ul>
        <p>Cô Minh Anh đang ở <strong>top 8% GT retailer</strong> (CR3 18% vs trung bình GT 11%). Tham chiếu Tết Vàng Đến Ví 2026: 254K hội viên mới, 2,4M voucher.</p>
        <button type="button" class="bubble-buy-cta" data-cta="open-loyalty">Mở loyalty console →</button>
      `,
      onShow: () => {
        logEvent('ai', `User hỏi: brand nào trả hoa hồng nhiều nhất? · AI xếp top 5 · Omachi đứng đầu CR3 41%`);
      }
    },
    debt: {
      userText: 'Khách nào nợ lâu nhất?',
      thinking: 800,
      html: `
        <p><strong>Chú An</strong> (0907·xxx·128) đang nợ <strong>350.000 ₫</strong> từ ngày 23/04 — <strong>18 ngày</strong>. Có 4 lần mua trong sổ nợ, 1 lần trả góp 45k.</p>
        <p>Đề xuất gửi nhắc qua VietQR có link 1-click. Tự xoá nợ khi khách thanh toán.</p>
        <button type="button" class="bubble-buy-cta" data-cta="reminder-anh">Gửi nhắc Chú An 350k →</button>
      `,
      onShow: () => {
        logEvent('ai', `User hỏi: ai nợ lâu nhất? · AI gợi nhắc Chú An 350k · 18 ngày`);
      }
    },
    skux: {
      userText: 'SKU X tồn 38 ngày — làm gì?',
      thinking: 900,
      html: `
        <p>Bán chậm hơn ngưỡng 30 ngày (hiện 38 ngày, vòng quay chỉ bằng 9% trung bình toàn tiệm). Hai cách:</p>
        <ul class="bubble-ul">
          <li>Giảm 15% (25.000 → <strong>21.250 ₫</strong>) — doanh số dự kiến tuần sau <strong>+320k</strong>.</li>
          <li>Trả lại NPP cùng đợt CK Tết (còn 6 ngày).</li>
        </ul>
        <button type="button" class="bubble-buy-cta" data-cta="markdown-skux">Áp giảm 15% lên POS →</button>
      `,
      onShow: () => {
        highlightInvRow('skuX');
        logEvent('ai', `User hỏi: SKU X tồn 38 ngày — làm gì? · AI đề xuất giảm 15%`);
      }
    },
    nhap30: {
      userText: 'Tuần này có nên nhập 30tr không?',
      thinking: 1000,
      html: `
        <p>Được. Cô có 2 lựa chọn:</p>
        <ul class="bubble-ul">
          <li><strong>Hạn mức nhập hàng MCH 30tr · 21 ngày · 1,2%/kỳ</strong> · auto-trừ 8% mỗi đơn POS. Invite-only, không động vào tiền mặt quầy.</li>
          <li>Hoãn <strong>2,2 triệu ₫</strong> công nợ chưa gấp (đá viên, anh Tâm).</li>
        </ul>
        <p>Danh mục đề xuất:</p>
        <div class="bubble-buy">
          <div class="buy-row"><span class="prod-chip prod-omachi">Om</span><span>Omachi (sắp hết)</span><strong>12tr ₫</strong></div>
          <div class="buy-row"><span class="prod-chip prod-chinsu">Cs</span><span>Chinsu cá cơm</span><strong>8tr ₫</strong></div>
          <div class="buy-row"><span class="prod-chip prod-wakeup">W</span><span>Wake-Up 247</span><strong>5tr ₫</strong></div>
          <div class="buy-row"><span class="prod-chip prod-vinacafe">Vc</span><span>Vinacafé 3in1</span><strong>5tr ₫</strong></div>
          <div class="buy-row buy-row-x"><span class="prod-chip prod-x">X</span><span>SKU X (chậm)</span><strong>0 ₫ · tránh</strong></div>
        </div>
        <button type="button" class="bubble-buy-cta" data-cta="po-create">Mở bảng PO chi tiết →</button>
      `,
      onShow: () => {
        logEvent('ai', `User hỏi: tuần này nhập 30tr? · AI đề xuất 4 SKU + 2 phương án vốn`);
      }
    },
    anomaly: {
      userText: 'Có gì bất thường ca này?',
      thinking: 800,
      html: `
        <p>Có 1 bất thường:</p>
        <p><strong>Ca Lan 17–18h thứ Sáu</strong> doanh thu 0,65tr — thấp hơn pattern 90 ngày 550k (avg 1,2tr). Số hóa đơn 12 vs trung bình 18.</p>
        <p>3 khả năng: khách thưa thật, hóa đơn chưa phát hành, hoặc tiền mặt chưa khai. Đề xuất đóng quỹ ca và kiểm tra log POS.</p>
        <button type="button" class="bubble-buy-cta" data-cta="cash-close">Đóng quỹ ca Lan →</button>
      `,
      onShow: () => {
        highlightStaff('lan');
        logEvent('ai', `User hỏi: bất thường ca này? · AI flag Lan 17-18h · −550k vs pattern`);
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
    const time = now();
    if (cta === 'markdown-skux'){
      btn.disabled = true;
      btn.textContent = '✓ Đã áp giảm 15% lên POS';
      const invLi = $(`#ckInvList li[data-sku="skuX"]`);
      if (invLi){
        flashEl(invLi);
        const name = invLi.querySelector('.inv-name');
        if (name) name.innerHTML = 'SKU X · <strong style="color:#C73E3A">−15% AI</strong>';
      }
      flashPanel('pos');
      logEvent('ai',  `Áp giảm 15% lên SKU X tại POS · 25.000 → <strong>21.250 ₫</strong>`, time);
    }
    if (cta === 'po-create'){
      btn.disabled = true;
      btn.textContent = '✓ Mở bảng PO';
      openModal('modalRestock');
    }
    if (cta === 'reminder-anh'){
      btn.disabled = true;
      btn.textContent = '✓ Đã gửi nhắc Chú An';
      sendDebtReminder('anh');
    }
    if (cta === 'cash-close'){
      btn.disabled = true;
      btn.textContent = '✓ Đang mở...';
      openModal('modalCash');
    }
    if (cta === 'open-loyalty'){
      btn.disabled = true;
      btn.textContent = '✓ Đang mở...';
      openModal('modalLoyalty');
    }
  }

  /* ---------- AI FREE INPUT ---------- */
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
      appendAiBubble(`<p>Câu này demo chưa wire sẵn. Bấm thử 4 gợi ý phía trên — mỗi câu kéo data từ POS, ví, hoặc lịch sử NPP MCH.</p>`);
    }, 700);
  });

  /* ---------- SỔ NỢ INTERACTIONS ---------- */
  $('#ckDebtCard')?.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-cust]');
    if (li) {
      openDebtDetail(li.dataset.cust);
      e.stopPropagation();
    } else {
      // open first unpaid customer
      const next = Object.keys(state.debt.customers).find(k => !state.debt.customers[k].sent);
      if (next) openDebtDetail(next);
    }
  });

  let currentDebt = 'anh';
  function openDebtDetail(key){
    const c = state.debt.customers[key];
    if (!c) return;
    currentDebt = key;
    const avEl = $('#dbAvatar');
    const nmEl = $('#dbName');
    const phEl = $('#dbPhone');
    const amEl = $('#dbAmt');
    if (avEl){
      avEl.textContent = c.name.split(' ').pop().slice(0,2);
      avEl.className = 'dt-avatar dt-avatar-big';
      if (key === 'huong') avEl.classList.add('dt-avatar-2');
      else if (key === 'tai') avEl.classList.add('dt-avatar-3');
      else if (key === 'lan') avEl.classList.add('dt-avatar-4');
    }
    if (nmEl) nmEl.textContent = c.name;
    if (phEl) phEl.textContent = `${c.phone} · khách hạng Bạc · mua 3-4 lần/tuần`;
    if (amEl) amEl.textContent = `${fmtVnd(c.amt)} ₫`;

    const btn = $('#dbSendQr');
    if (btn){
      if (c.sent){
        btn.disabled = true;
        btn.textContent = '✓ Đã gửi nhắc';
      } else {
        btn.disabled = false;
        btn.textContent = 'Gửi nhắc VietQR qua SMS';
      }
    }
    openModal('modalDebt');
  }

  function sendDebtReminder(key){
    const c = state.debt.customers[key];
    if (!c || c.sent) return;
    c.sent = true;
    const time = now();
    flashPanel('biz');
    logEvent('biz', `Gửi VietQR nhắc nợ · <strong>${c.name}</strong> · ${fmtVnd(c.amt)} ₫ · SMS định danh thương hiệu`, time);
    logEvent('vietqr', `Sinh QR thanh toán · 1-click · link rút gọn winx.bz/r${Math.floor(Math.random()*9999)}`, time);
    renderDebt();
  }

  $('#dbSendQr')?.addEventListener('click', () => {
    sendDebtReminder(currentDebt);
    const btn = $('#dbSendQr');
    if (btn){
      btn.disabled = true;
      btn.textContent = '✓ Đã gửi nhắc';
    }
  });

  /* ---------- INV CARD ---------- */
  $('#ckInvCard')?.addEventListener('click', () => openModal('modalRestock'));

  $('#rsPo')?.addEventListener('click', () => {
    const btn = $('#rsPo');
    if (btn){
      btn.disabled = true;
      btn.textContent = '✓ Đã gửi PO · 20.400.000 ₫';
    }
    const time = now();
    flashPanel('biz');
    logEvent('biz', `Tạo PO nhập hàng · <strong>20.400.000 ₫</strong> · 4 SKU · gửi NPP MCH HCM-07`, time);
    logEvent('ai',  `Đề xuất qty từ vòng quay 90 ngày · ưu tiên Omachi 30 thùng (sắp hết)`, time);
  });

  /* ---------- TODAY TILES ---------- */
  $$('.bt-tile').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'qr-detail') openModal('modalVa');
      else if (action === 'cash-close') openModal('modalCash');
      else if (action === 'payables') openModal('modalPayables');
      else if (action === 'cashflow') openModal('modalCashflow');
    });
  });

  /* ---------- QUICK ACTIONS ---------- */
  $$('.biz-qa').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'staff') openModal('modalStaff');
      else if (action === 'einvoice') openModal('modalEinv');
      else if (action === 'weekly') openModal('modalWeekly');
      else if (action === 'payroll') openModal('modalPayroll');
      else if (action === 'tax') openModal('modalTax');
      else if (action === 'trancc'){
        const ap = $('#bizApproval');
        if (ap){
          ap.scrollIntoView({ behavior: 'smooth', block: 'center' });
          flashEl(ap);
        }
      }
    });
  });

  /* ---------- HEADER + AI CARD HANDLERS ---------- */
  $('#ckBrand')?.addEventListener('click', () => openModal('modalOnboarding'));
  $('#ckShop')?.addEventListener('click', () => openModal('modalShop'));
  $('#ckOnboarding')?.addEventListener('click', () => openModal('modalOnboarding'));
  $('#bizVaView')?.addEventListener('click', () => openModal('modalVa'));
  $('#posEinvView')?.addEventListener('click', () => openModal('modalEinv'));
  $('#ckStaffCard')?.addEventListener('click', () => openModal('modalStaffMatrix'));
  $('#aiCardAnomaly')?.addEventListener('click', () => {
    highlightStaff('lan');
    openModal('modalCash');
  });
  $('#aiCardBrief')?.addEventListener('click', () => openModal('modalWeekly'));
  $('#aiCardCredit')?.addEventListener('click', () => openModal('modalLoan'));
  $('#posLoyaltyBanner')?.addEventListener('click', () => openModal('modalLoyalty'));
  $('#ckLoyaltyCard')?.addEventListener('click', () => openModal('modalLoyalty'));

  /* ---------- COMPLIANCE TOGGLES (NĐ 70 + NQ 198) ---------- */
  function renderComplianceWarning(){
    const w = $('#pcWarning');
    if (!w) return;
    const msgs = [];
    if (!state.compliance.einv){
      msgs.push('<strong>HĐĐT-MTT đang tắt</strong> · NĐ 70/2025/NĐ-CP bắt buộc HKD bán lẻ doanh thu ≥ 1 tỷ/năm phải phát hành hoá đơn điện tử khởi tạo từ máy tính tiền. Tắt chỉ để demo — thực tế bạn phải tự gửi GDT.');
    }
    if (!state.compliance.tax){
      msgs.push('<strong>Tự kê khai thuế đang tắt</strong> · NQ 198/2025/QH15 bỏ thuế khoán từ 1/1/2026. HKD phải kê khai theo doanh thu thực tế qua eTax Mobile.');
    }
    if (msgs.length){
      w.hidden = false;
      w.innerHTML = '⚠ ' + msgs.join('<br>⚠ ');
    } else {
      w.hidden = true;
      w.innerHTML = '';
    }
  }

  function toggleCompliance(feature){
    state.compliance[feature] = !state.compliance[feature];
    const btnId = feature === 'einv' ? 'pcToggleEinv' : 'pcToggleTax';
    const btn = document.getElementById(btnId);
    if (btn){
      btn.classList.toggle('is-on', state.compliance[feature]);
      btn.setAttribute('aria-pressed', state.compliance[feature] ? 'true' : 'false');
      const status = btn.querySelector('.pc-status');
      if (status) status.textContent = state.compliance[feature] ? 'BẬT · auto' : 'TẮT · thủ công';
    }
    renderComplianceWarning();
    flashPanel(feature === 'einv' ? 'pos' : 'biz');
    const time = now();
    if (feature === 'einv'){
      logEvent('compl', state.compliance.einv
        ? `BẬT HĐĐT-MTT · NĐ 70/2025 · auto phát hành về GDT mỗi giao dịch`
        : `TẮT HĐĐT-MTT · chỉ để demo · thực tế HKD ≥ 1 tỷ/năm bắt buộc theo NĐ 70/2025`, time);
    } else {
      logEvent('compl', state.compliance.tax
        ? `BẬT tự kê khai thuế · NQ 198/2025/QH15 · VAT 1% + TNCN 0,5% từ HĐĐT-MTT`
        : `TẮT tự kê khai · chỉ để demo · từ 1/1/2026 HKD bắt buộc kê khai theo doanh thu thực tế`, time);
    }
  }

  $('#pcToggleEinv')?.addEventListener('click', () => toggleCompliance('einv'));
  $('#pcToggleTax')?.addEventListener('click', () => toggleCompliance('tax'));
  $('#pcOpenTax')?.addEventListener('click', () => openModal('modalTax'));

  /* ---------- LOYALTY MODAL ACTIONS ---------- */
  $('#lcCrossSell')?.addEventListener('click', () => {
    if (state.loyalty.crossSellSent) return;
    state.loyalty.crossSellSent = true;
    const time = now();
    flashPanel('biz');
    logEvent('ai', `Gửi combo MEATDeli cho Chú An qua VietQR · cross-sell từ pattern Chin-Su × Nam Ngư`, time);
    logEvent('biz', `MEATDeli x Chin-Su combo · voucher −15k · gửi SMS định danh thương hiệu`, time);
    const btn = $('#lcCrossSell');
    if (btn){
      btn.disabled = true;
      btn.textContent = '✓ Đã gửi combo MEATDeli cho Chú An';
    }
  });

  $$('.lc-posm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.posm;
      if (!key || state.loyalty.posmOrdered[key]) return;
      state.loyalty.posmOrdered[key] = true;
      const labels = {
        'standee-nn':  'Standee Nam Ngư x10',
        'sticker-cs':  'Bộ sticker giá Chin-Su Tết',
        'banner-om':   'Banner Omachi Thần Tốc',
      };
      const time = now();
      flashPanel('biz');
      logEvent('biz', `Đặt POSM brand-funded · <strong>${labels[key]}</strong> · Masan tài trợ 100% · giao trong 1-2 ngày`, time);
      btn.disabled = true;
      btn.textContent = '✓ Đã đặt';
    });
  });

  /* ---------- MODAL ACTIONS ---------- */
  $('#cashConfirm')?.addEventListener('click', () => {
    const time = now();
    flashPanel('biz');
    logEvent('compl', `Đóng quỹ ca Lan 17–18h · ghi chênh −550.000 ₫ · audit log mở`, time);
    logEvent('ai',    `Cập nhật mô hình rủi ro nhân viên · điểm tin cậy Lan 92 → 86`, time);
    const m = $('#modalCash');
    if (m) closeModal(m);
  });

  $('#payrollGo')?.addEventListener('click', () => {
    const time = now();
    flashPanel('biz');
    logEvent('biz', `Trả lương tuần · <strong>7.120.000 ₫</strong> · 3 nhân viên · chuyển khoản TCB`, time);
    logEvent('compl', `Tự sinh phiếu lương · lưu 5 năm theo Bộ luật Lao động`, time);
    const m = $('#modalPayroll');
    if (m) closeModal(m);
  });

  $('#taxFile')?.addEventListener('click', () => {
    const time = now();
    flashPanel('biz');
    logEvent('einv', `Nộp VAT tuần · <strong>2.368.000 ₫</strong> · 312 HĐĐT đã đối soát · gửi Tổng cục Thuế`, time);
    logEvent('compl', `GDT phản hồi · đã tiếp nhận · mã tra cứu HSO-2026-W19-872`, time);
    const m = $('#modalTax');
    if (m) closeModal(m);
  });

  $('#loanDraw')?.addEventListener('click', () => {
    if (state.loan.drawn) return;
    state.loan.drawn = true;
    // Hạn mức nhập hàng — không vào ví, đi thẳng PO MCH
    state.runwayDays = +(state.runwayDays + 4.6).toFixed(1);
    renderBusiness();

    const time = now();
    flashPanel('biz');
    logEvent('bank', `TCB phê duyệt hạn mức nhập hàng MCH <strong>20.400.000 ₫</strong> · 21 ngày · 1,2%/kỳ · auto-trừ 8%/POS · WinX origination`, time);
    logEvent('biz',  `PO MCH HCM-07 thanh toán bằng hạn mức · tiền mặt quầy giữ nguyên · runway: ${fmtNgay(state.runwayDays)} ngày`, time);
    logEvent('ai',   `Auto-trừ 8% mỗi đơn POS · cơ chế Mintifi (Ấn Độ) · không cần tiền mặt trả NPP`, time);

    const btn = $('#loanDraw');
    if (btn){
      btn.disabled = true;
      btn.textContent = '✓ Đã dùng hạn mức cho PO MCH 20,4tr';
    }
  });

  /* ---------- MODAL OPEN / CLOSE ---------- */
  function openModal(id){
    const m = document.getElementById(id);
    if (!m) return;
    m.hidden = false;
    document.body.style.overflow = 'hidden';
    if (id === 'modalEinv'){
      const num = $('#einvNumber');
      const date = $('#einvDate');
      const cqt = $('#einvCqt');
      if (num)  num.textContent  = `WX-${String(state.invoiceSeq).padStart(5,'0')}`;
      if (date) date.textContent = `${new Date().toLocaleDateString('vi-VN')} · ${now()}`;
      if (cqt)  cqt.textContent  = `00C73E3A-2026-WX${String(state.invoiceSeq).slice(-3)}`;
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
  $$('[data-open]').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.dataset.open;
      // close any open modal first
      $$('.ck-modal').forEach(m => { if (!m.hidden) closeModal(m); });
      openModal(target);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape'){
      $$('.ck-modal').forEach(m => { if (!m.hidden) closeModal(m); });
    }
  });

  /* ---------- STAFF FORM ---------- */
  const staffForm = $('#staffForm');
  staffForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name  = $('#sfName')?.value || 'thành viên mới';
    const phone = $('#sfPhone')?.value || '';
    const role  = (document.querySelector('input[name="sfRole"]:checked')?.value) || 'cashier';
    const roleVi = { cashier: 'Thu ngân', sales: 'Bán hàng', accountant: 'Kế toán' }[role] || 'Nhân viên';
    const time = now();

    flashPanel('biz');
    logEvent('biz',   `Mời thành viên <strong>${name}</strong> (${phone}) · vai trò ${roleVi}`, time);
    logEvent('compl', `Cập nhật ma trận phân quyền · audit log bật · NĐ 13/2023 PDPA`, time);
    const m = $('#modalStaff');
    if (m) closeModal(m);
  });

  /* ---------- TICKER EXPAND ---------- */
  $('#ckTickerExpand')?.addEventListener('click', () => openModal('modalLog'));

  /* ---------- TOUR DISMISS ---------- */
  $('#ckTourClose')?.addEventListener('click', () => {
    $('#ckTour')?.classList.add('is-hidden');
  });

  /* ---------- RESET ---------- */
  $('#ckReset')?.addEventListener('click', () => {
    state = clone(initial);
    state.posBusy = false;

    renderAll();
    renderInventory();
    seedLog();

    // chat reset
    $$('.bubble-user, .bubble-ai:not(:first-child), .bubble.is-typing').forEach(b => b.remove());
    $$('.suggest-pill').forEach(p => p.disabled = false);

    // approval reset
    $('#bzaSuccess')?.classList.remove('is-on');
    $('#bizApproval')?.classList.remove('is-done');

    // POS reset
    $('#posQrCard')?.classList.remove('is-on');
    $('#posQrDone')?.classList.remove('is-on');
    const pe = $('#posQrEmpty');
    if (pe) pe.style.display = '';
    const btn = $('#posCollect');
    if (btn){
      btn.disabled = false;
      btn.innerHTML = `Thu QR · <span id="posCollectAmt">${fmtVnd(state.cart.total)}</span> ₫`;
    }
    const ghiBtn = $('#posGhiNo');
    if (ghiBtn){
      ghiBtn.disabled = false;
      ghiBtn.textContent = `Ghi sổ Chú An · ${fmtVnd(state.cart.total)} ₫`;
    }
    // tour bar visible again on reset
    $('#ckTour')?.classList.remove('is-hidden');
    // staff role radio reset
    const r1 = document.querySelector('input[name="sfRole"][value="cashier"]');
    if (r1) r1.checked = true;

    // inv name reset
    const invX = $(`#ckInvList li[data-sku="skuX"] .inv-name`);
    if (invX) invX.textContent = 'SKU X · 38 ngày';

    // loan reset
    const loanBtn = $('#loanDraw');
    if (loanBtn){
      loanBtn.disabled = false;
      loanBtn.textContent = 'Rút 80 triệu ₫ ngay';
    }
    const rsBtn = $('#rsPo');
    if (rsBtn){
      rsBtn.disabled = false;
      rsBtn.textContent = 'Tạo PO & gửi NPP MCH HCM-07';
    }
    // compliance toggles reset to ON (default & legally mandatory)
    ['Einv','Tax'].forEach(f => {
      const b = $('#pcToggle' + f);
      if (b){
        b.classList.add('is-on');
        b.setAttribute('aria-pressed', 'true');
        const s = b.querySelector('.pc-status');
        if (s) s.textContent = 'BẬT · auto';
      }
    });
    renderComplianceWarning();

    // loyalty reset
    const csBtn = $('#lcCrossSell');
    if (csBtn){
      csBtn.disabled = false;
      csBtn.textContent = 'Gửi gợi ý combo MEATDeli cho Chú An →';
    }
    $$('.lc-posm-btn').forEach(b => {
      b.disabled = false;
      b.textContent = 'Đặt';
    });
  });

  /* ---------- INIT ---------- */
  renderAll();
  renderInventory();
  seedLog();
})();
