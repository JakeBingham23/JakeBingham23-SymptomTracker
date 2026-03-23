// ═════════════════════════════════════════════════════════════════
// BUDGET MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── Budget system ──────────────────────────────────────────────────────────
const BUDGET_KEY  = 'tracker-budget';
const SPEND_KEY   = 'tracker-spend';

const CATEGORY_ICONS = {
  food:'🍔', transport:'🚗', health:'💊', household:'🏠',
  personal:'🧴', entertainment:'🎮', impulse:'⚡', subscription:'📱', other:'📦'
};

function getBudgetConfig() {
  try { return JSON.parse(localStorage.getItem(BUDGET_KEY) || '{"monthly":0}'); }
  catch(e) { return { monthly: 0 }; }
}

function getSpends() {
  try { return JSON.parse(localStorage.getItem(SPEND_KEY) || '[]'); }
  catch(e) { return []; }
}

function saveSpends(spends) {
  localStorage.setItem(SPEND_KEY, JSON.stringify(spends));
}

function saveMonthlyBudget() {
  const val = parseFloat(document.getElementById('monthlyBudgetSettings')?.value || document.getElementById('monthlyBudget')?.value || '0');
  const c = getBudgetConfig();
  c.monthly = val;
  localStorage.setItem(BUDGET_KEY, JSON.stringify(c));
  renderBudgetTab();
  announce('Monthly budget set to $' + val.toFixed(2));
  showToast('budget saved ✓');
}

function filterSpendByBucket(bucket) {
  const sel = document.getElementById('bucketFilter');
  if (sel) sel.value = bucket;
  renderBudgetTab();
}

function renderBudgetTab() {
  renderBucketCards();
  renderDopamineList();
  renderDailyCard();

  const budgetCfg = getBudgetConfig();
  const spends    = getSpends();
  const now       = new Date();
  const monthKey  = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  const daysInMonth   = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate() + 1;
  const budget        = budgetCfg.monthly || 0;

  // Get active bucket filter
  const filterEl = document.getElementById('bucketFilter');
  const activeFilter = filterEl?.value || '';

  // Month spends (all buckets for totals)
  const monthSpends = spends.filter(s => s.date.startsWith(monthKey));
  const monthTotal  = monthSpends.reduce((s,e) => s + e.amount, 0);
  const avgDaily    = now.getDate() > 0 ? monthTotal / now.getDate() : 0;
  const remaining   = budget > 0 ? budget - monthTotal : null;
  const dailyLeft   = remaining !== null && daysRemaining > 0 ? remaining / daysRemaining : null;

  // Show/hide dashboard
  const prompt    = document.getElementById('budgetSetupPrompt');
  const dashboard = document.getElementById('budgetStatsDashboard');
  const hasSetup  = budget > 0 || monthSpends.length > 0;
  if (prompt)    prompt.style.display    = hasSetup ? 'none' : 'block';
  if (dashboard) dashboard.style.display = hasSetup ? 'block' : 'none';
  if (!hasSetup) return;

  // Stat cards
  const fmt = n => '$' + Math.abs(n).toFixed(2);
  const el  = id => document.getElementById(id);

  if (el('budgetSpent'))    el('budgetSpent').textContent    = fmt(monthTotal);
  if (el('budgetRemaining')) {
    el('budgetRemaining').textContent = remaining !== null ? fmt(remaining) : '—';
    el('budgetRemaining').style.color = remaining !== null && remaining < 0 ? 'var(--danger)' : 'var(--accent)';
  }
  if (el('budgetAvgDaily'))  el('budgetAvgDaily').textContent  = avgDaily > 0 ? fmt(avgDaily) : '$0';
  if (el('budgetDailyLeft')) {
    el('budgetDailyLeft').textContent = dailyLeft !== null ? fmt(dailyLeft) : '—';
    el('budgetDailyLeft').style.color = dailyLeft !== null && dailyLeft < avgDaily ? 'var(--danger)' : 'var(--success)';
  }

  // Progress bar
  const pct     = budget > 0 ? Math.min(100, (monthTotal / budget) * 100) : 0;
  const barFill = el('budgetBarFill');
  const barLabel = el('budgetBarLabel');
  const barTotal = el('budgetBarTotal');
  if (barFill) {
    barFill.style.width = pct + '%';
    barFill.style.background = pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--success)';
    barFill.setAttribute('aria-valuenow', Math.round(pct));
  }
  if (barLabel) barLabel.textContent = pct.toFixed(1) + '% used';
  if (barTotal) barTotal.textContent = budget > 0 ? fmt(monthTotal) + ' of $' + budget.toFixed(0) : '';

  // Category breakdown
  renderCategoryBreakdown(monthSpends);

  // Today's spends (filtered by bucket if active)
  const todayEl    = el('todaySpendList');
  const todaySpends = spends.filter(s =>
    s.date === TODAY && (!activeFilter || s.bucket === activeFilter));
  if (todayEl) {
    if (todaySpends.length === 0) {
      todayEl.innerHTML = `<p style="font-family:var(--font-mono);font-size:var(--text-base);color:var(--text3);margin-bottom:var(--sp-3)">nothing logged today${activeFilter ? ' in this bucket' : ''}</p>`;
    } else {
      todayEl.innerHTML = todaySpends.map(s => spendCard(s)).join('');
    }
  }

  // Monthly log (filtered)
  const monthEl = el('monthSpendList');
  const filtered = monthSpends.filter(s => !activeFilter || s.bucket === activeFilter);
  if (monthEl) {
    if (filtered.length === 0) {
      monthEl.innerHTML = `<p style="font-family:var(--font-mono);font-size:var(--text-base);color:var(--text3)">no spending logged this month${activeFilter ? ' in this bucket' : ''}</p>`;
    } else {
      // Group by date
      const byDate = {};
      filtered.forEach(s => { (byDate[s.date] = byDate[s.date]||[]).push(s); });
      monthEl.innerHTML = Object.entries(byDate)
        .sort((a,b) => b[0].localeCompare(a[0]))
        .map(([date, items]) => {
          const dayTotal = items.reduce((t,s)=>t+s.amount,0);
          return `<div style="margin-bottom:var(--sp-4)">
            <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text3);margin-bottom:var(--sp-2);padding-bottom:4px;border-bottom:0.5px solid var(--border)">
              <span>${date}</span><span>$${dayTotal.toFixed(2)}</span>
            </div>
            ${items.map(s => spendCard(s)).join('')}
          </div>`;
        }).join('');
    }
  }
}

function spendCard(s) {
  const bucket = BUCKET_DEFS[s.bucket] || { icon:'📦', label: s.bucket || 'other' };
  const flagged = s.flagged ? '<span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--warning);margin-left:4px">⚑ big purchase</span>' : '';
  return `<div class="history-entry" style="display:flex;align-items:center;gap:var(--sp-3);margin-bottom:var(--sp-2)"
               role="listitem" aria-label="${escHtml(s.note||s.category)}, $${s.amount.toFixed(2)}, ${bucket.label}">
    <span style="font-size:1.1rem;flex-shrink:0" aria-hidden="true">${CATEGORY_ICONS[s.category]||'📦'}</span>
    <div style="flex:1;min-width:0">
      <div style="font-family:var(--font-mono);font-size:var(--text-base);color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${escHtml(s.note||s.category)}${flagged}
      </div>
      <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text3)">${bucket.icon} ${bucket.label}</div>
    </div>
    <span style="font-family:var(--font-mono);font-size:var(--text-md);color:var(--accent);flex-shrink:0">$${s.amount.toFixed(2)}</span>
    <button class="del-btn" onclick="deleteSpend('${s.id}')" aria-label="Delete expense">×</button>
  </div>`;
}

function renderCategoryBreakdown(monthSpends) {
  const el = document.getElementById('categoryBreakdown');
  if (!el || monthSpends.length === 0) { if(el) el.innerHTML=''; return; }

  // Total by category
  const byCategory = {};
  monthSpends.forEach(s => {
    byCategory[s.category] = (byCategory[s.category]||0) + s.amount;
  });
  const total  = monthSpends.reduce((t,s)=>t+s.amount,0);
  const sorted = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);
  const maxVal = sorted[0]?.[1] || 1;

  el.innerHTML = sorted.map(([cat, amt]) => {
    const pct = Math.round((amt / maxVal) * 100);
    const ofTotal = ((amt/total)*100).toFixed(0);
    return `<div style="display:flex;align-items:center;gap:var(--sp-3);margin-bottom:var(--sp-3)"
                 role="listitem" aria-label="${cat}: $${amt.toFixed(2)}, ${ofTotal}% of total">
      <span style="font-size:1rem;flex-shrink:0" aria-hidden="true">${CATEGORY_ICONS[cat]||'📦'}</span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:var(--text-sm);margin-bottom:3px">
          <span style="color:var(--text2)">${cat}</span>
          <span style="color:var(--accent)">$${amt.toFixed(2)}</span>
        </div>
        <div style="height:4px;background:var(--bg3);border-radius:var(--radius-pill);overflow:hidden">
          <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:var(--radius-pill);opacity:0.7"></div>
        </div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text3);margin-top:2px">${ofTotal}% of total</div>
      </div>
    </div>`;
  }).join('');
}

function renderBucketCards() {
  const buckets = getBuckets();
  const spends  = getSpends();
  const now     = new Date();
  const monthKey = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');

  // Show/hide setup prompt based on any limits set
  const hasAnyLimit = Object.values(buckets).some(b => b.limit > 0);
  const promptEl = document.getElementById('budgetSetupPrompt');
  if (promptEl && (getBudgetConfig().monthly > 0 || getSpends().length > 0)) {
    promptEl.style.display = 'none';
  }

  const amtIds = { essentials:'bucketEssAmount', daily:'bucketDayAmount', shortterm:'bucketSTAmount', longterm:'bucketLTAmount' };
  const limIds = { essentials:'bucketEssLimit',  daily:'bucketDayLimit',  shortterm:'bucketSTLimit',  longterm:'bucketLTLimit'  };

  Object.entries(BUCKET_DEFS).forEach(([key, def]) => {
    const limit = buckets[key]?.limit || 0;
    const spent = spends
      .filter(s => s.date.startsWith(monthKey) && s.bucket === key)
      .reduce((t,s) => t + s.amount, 0);
    const remaining = limit > 0 ? limit - spent : null;

    const amtEl = document.getElementById(amtIds[key]);
    const limEl = document.getElementById(limIds[key]);
    if (amtEl) {
      amtEl.textContent = remaining !== null
        ? '$' + remaining.toFixed(0) + ' left'
        : '$' + spent.toFixed(0) + ' spent';
      amtEl.style.color = remaining !== null && remaining < 0 ? 'var(--danger)' : '';
    }
    if (limEl) limEl.textContent = limit > 0
      ? 'of $' + limit.toFixed(0)
      : 'tap to filter';
  });
}

function renderBucketLimitSettings() {
  const el = document.getElementById('bucketLimitSettings');
  if (!el) return;
  const buckets = getBuckets();
  const budgetCfg = getBudgetConfig();
  el.innerHTML = Object.entries(BUCKET_DEFS).map(([key, def]) => `
    <div class="settings-task-row" style="margin-bottom:6px;align-items:center">
      <span style="font-family:var(--font-mono);font-size:0.625rem;color:var(--text2);flex-shrink:0;width:90px">${def.icon} ${def.label}</span>
      <input type="number" id="bucketLimit_${key}" placeholder="monthly $" min="0" step="1"
             value="${buckets[key]?.limit || ''}"
             style="flex:1;background:var(--bg3);border:0.5px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:var(--font-mono);font-size:0.8125rem;padding:8px 10px;outline:none"
             aria-label="${def.label} monthly limit">
    </div>`).join('') + `
    <div class="settings-task-row" style="margin-bottom:6px;align-items:center;margin-top:8px">
      <span style="font-family:var(--font-mono);font-size:0.625rem;color:var(--text2);flex-shrink:0;width:90px">📅 monthly total</span>
      <input type="number" id="monthlyBudgetSettings" placeholder="total $" min="0" step="1"
             value="${budgetCfg.monthly || ''}"
             style="flex:1;background:var(--bg3);border:0.5px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:var(--font-mono);font-size:0.8125rem;padding:8px 10px;outline:none"
             aria-label="Total monthly budget">
    </div>`;

  const threshEl = document.getElementById('bigSpendThreshold');
  if (threshEl) threshEl.value = budgetCfg.bigSpendThreshold || BIG_SPEND_THRESHOLD_DEFAULT;
}

function saveBucketLimits() {
  const buckets = getBuckets();
  Object.keys(BUCKET_DEFS).forEach(key => {
    const val = parseFloat(document.getElementById('bucketLimit_' + key)?.value || '0');
    buckets[key] = { ...buckets[key], limit: val || 0 };
  });
  saveBuckets(buckets);
  // Also save monthly total if provided
  const monthly = parseFloat(document.getElementById('monthlyBudget')?.value || '0');
  if (monthly) {
    const c = getBudgetConfig();
    c.monthly = monthly;
    localStorage.setItem(BUDGET_KEY, JSON.stringify(c));
  }
  renderBucketCards();
  renderDailyCard();
  renderBudgetTab();
  showToast('budget limits saved ✓');
  announce('Spending bucket limits saved.');
}

function saveBigSpendThreshold() {
  const val = parseFloat(document.getElementById('bigSpendThreshold')?.value || '50');
  const c = getBudgetConfig();
  c.bigSpendThreshold = val;
  localStorage.setItem(BUDGET_KEY, JSON.stringify(c));
  showToast('big purchase flag set to $' + val.toFixed(0));
  announce('Big purchase flag set to $' + val.toFixed(0));
}
