function setTab(tab) {
  activeTab = validTab(tab) || "home";
  const url = new URL(location.href); activeTab === "home" ? url.searchParams.delete("tab") : url.searchParams.set("tab", activeTab); history.replaceState(null, "", url); render();
}
function render() {
  saveState();
  const root = document.getElementById("app");
  root.innerHTML = `<div class="stage"><div class="app"><main class="screen" id="screen">${page()}</main><nav class="tabs" aria-label="VaultBudget navigation">${TABS.map(([idv, label, icon]) => `<button class="tab ${activeTab === idv ? "active" : ""}" data-tab="${idv}" aria-label="${label}"><span>${icon}</span><small>${label}</small></button>`).join("")}</nav>${modal ? modalMarkup() : ""}</div></div>`;
  bind();
}
function topbar(title, eyebrow = "VaultBudget") {
  return `<div class="topbar"><div class="brand"><div class="mark" aria-hidden="true">VB</div><div><p class="eyebrow">${eh(eyebrow)}</p><h1>${eh(title)}</h1></div></div><span class="pill ${auth.session ? "ready" : "pending"}">${auth.session ? "Cloud ready" : "Local-first"}</span></div>`;
}
function page() { return ({ home, transactions, goals, reports, profile, settings }[activeTab] || home)(); }

function home() {
  const d = derive(); const limit = Math.max(1, number(state.settings.dailyLimit, 1)); const rawPct = Math.round((d.todaySpent / limit) * 100); const width = clamp(rawPct, 0, 100);
  const availableToday = Math.max(0, limit - d.todaySpent);
  return `<div class="stack page-enter">${topbar("Dashboard", "Your money at a glance")}
    <section class="card hero-card"><div class="hero-top"><div><p class="muted small">Available balance</p><div class="balance">${money(d.balance)}</div></div><button class="icon-button" data-toggle-balance="1" aria-label="Toggle balance visibility">${state.settings.hideBalance ? "🙈" : "👁️"}</button></div>
      <div class="metric-grid"><div class="metric"><span>This month in</span><strong class="positive">${money(d.monthIncome)}</strong></div><div class="metric"><span>This month out</span><strong class="negative">${money(d.monthSpent)}</strong></div><div class="metric"><span>Safe today</span><strong>${money(availableToday)}</strong></div></div>
      <div class="limit-head"><span>Daily spend ${money(d.todaySpent)}</span><span>${rawPct}% of ${money(limit)}</span></div><div class="progress"><div class="bar ${rawPct > 100 ? "red" : ""}" style="width:${width}%"></div></div>
    </section>
    <div class="quick-actions"><button class="primary" data-open="income">＋ Add income</button><button class="secondary" data-open="expense">－ Add expense</button></div>
    <div class="insight-grid"><article class="card mini-card"><span class="small muted">Monthly net</span><strong class="${d.monthNet >= 0 ? "positive" : "negative"}">${money(d.monthNet)}</strong><small>${d.monthNet >= 0 ? "Income is ahead of spending" : "Spending is ahead of income"}</small></article><article class="card mini-card"><span class="small muted">Recurring / mo.</span><strong>${money(d.recurringMonthly)}</strong><small>${state.recurring.length} tracked recurring items</small></article></div>
    ${d.balance < number(state.settings.lowBalanceThreshold) ? `<div class="notice danger-notice"><strong>Low balance</strong><span>Below your ${money(state.settings.lowBalanceThreshold)} threshold.</span></div>` : ""}
    ${rawPct > 100 ? `<div class="notice danger-notice"><strong>Daily limit exceeded</strong><span>You are ${money(d.todaySpent - limit)} over today.</span></div>` : ""}
    <section class="card"><div class="section-head"><div><p class="eyebrow">Latest activity</p><h2>Recent transactions</h2></div><button class="text-button" data-tab="transactions">View all</button></div><div class="stack compact">${state.transactions.length ? sortedTransactions().slice(0, 5).map(transactionRow).join("") : emptyState("No transactions yet", "Add income or spending to start your ledger.")}</div></section>
  </div>`;
}

function filteredTransactions() {
  const q = txQuery.trim().toLowerCase();
  return sortedTransactions().filter((item) => (txType === "all" || item.type === txType) && (txCategory === "all" || item.category === txCategory) && (!q || `${item.note} ${item.category} ${item.amount}`.toLowerCase().includes(q)));
}
function sortedTransactions() { return [...state.transactions].sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)); }
function transactions() {
  const rows = filteredTransactions();
  return `<div class="stack page-enter">${topbar("Transactions", "Searchable ledger")}
    <section class="card toolbar"><label class="search-wrap"><span>⌕</span><input class="input" id="txSearch" value="${ea(txQuery)}" placeholder="Search note, category, amount"></label><div class="filter-row"><select class="select" id="txType"><option value="all">All types</option><option value="expense" ${txType === "expense" ? "selected" : ""}>Expenses</option><option value="income" ${txType === "income" ? "selected" : ""}>Income</option><option value="goal" ${txType === "goal" ? "selected" : ""}>Goal transfers</option></select><select class="select" id="txCategory"><option value="all">All categories</option>${CATEGORIES.map(([name, emoji]) => `<option value="${name}" ${txCategory === name ? "selected" : ""}>${emoji} ${name}</option>`).join("")}</select></div></section>
    <div class="quick-actions"><button class="primary" data-open="expense">Log expense</button><button class="secondary" data-open="income">Add income</button></div>
    <section class="card"><div class="section-head"><div><p class="eyebrow">${rows.length} shown</p><h2>History</h2></div><button class="text-button" data-clear-filters="1">Clear</button></div><div class="stack compact">${rows.length ? rows.map((item) => transactionRow(item, true)).join("") : emptyState("No matching transactions", "Change your search or filters.")}</div></section>
    <section class="card"><div class="section-head"><div><p class="eyebrow">Subscriptions & bills</p><h2>Recurring expenses</h2></div><button class="text-button" data-open="recurring">＋ Add</button></div><div class="stack compact">${state.recurring.length ? state.recurring.map(recurringRow).join("") : emptyState("No recurring expenses", "Track rent, subscriptions, and repeating bills here.")}</div></section>
  </div>`;
}
function transactionRow(item, actions = false) {
  const sign = item.type === "income" ? 1 : -1; const label = item.type === "goal" ? "Goal transfer" : item.category;
  return `<div class="row transaction-row"><div class="emoji">${eh(item.emoji)}</div><div class="row-copy"><strong>${eh(item.note || label)}</strong><p class="small muted">${eh(label)} · ${formatDateTime(item.dateTime)}</p></div><div class="amount ${sign > 0 ? "positive" : "negative"}">${sign > 0 ? "+" : "-"}${money(item.amount)}</div>${actions ? `<div class="row-actions"><button class="tiny-button" data-edit-tx="${ea(item.id)}" aria-label="Edit transaction">✎</button><button class="tiny-button danger-text" data-delete-tx="${ea(item.id)}" aria-label="Delete transaction">×</button></div>` : ""}</div>`;
}
function recurringRow(item) {
  return `<div class="row recurring-row"><div class="emoji">${eh(item.emoji)}</div><div class="row-copy"><strong>${eh(item.name)}</strong><p class="small muted">${eh(item.cadence)}</p></div><div class="amount">${money(item.amount)}</div><button class="tiny-button danger-text" data-delete-recurring="${ea(item.id)}" aria-label="Delete recurring expense">×</button></div>`;
}

