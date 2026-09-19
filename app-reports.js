function goals() {
  const totalTarget = state.goals.reduce((s, x) => s + number(x.targetAmount), 0); const totalSaved = state.goals.reduce((s, x) => s + number(x.savedAmount), 0); const overall = totalTarget ? Math.round(totalSaved / totalTarget * 100) : 0;
  return `<div class="stack page-enter">${topbar("Savings goals", "Build toward what matters")}
    <section class="card"><div class="section-head"><div><p class="eyebrow">Overall progress</p><h2>${money(totalSaved)} saved</h2></div><span class="pill ready">${overall}%</span></div><div class="progress"><div class="bar" style="width:${clamp(overall,0,100)}%"></div></div><p class="small muted" style="margin-top:10px">Across ${state.goals.length} goal${state.goals.length === 1 ? "" : "s"}</p></section>
    <button class="primary" data-open="goal">＋ Create goal</button>
    ${state.goals.length ? state.goals.map(goalCard).join("") : emptyState("No savings goals", "Create a goal and allocate money toward it.")}
  </div>`;
}
function goalCard(item) {
  const pct = item.targetAmount > 0 ? clamp(Math.round(number(item.savedAmount) / number(item.targetAmount) * 100), 0, 100) : 0;
  const remaining = Math.max(0, number(item.targetAmount) - number(item.savedAmount));
  return `<section class="card ${item.paused ? "dimmed" : ""}"><div class="section-head"><div><p class="eyebrow">${item.completed ? "Completed" : item.paused ? "Paused" : "In progress"}</p><h2>${eh(item.emoji)} ${eh(item.name)}</h2></div><span class="pill ${item.completed ? "ready" : "pending"}">${pct}%</span></div><p class="small muted">${money(item.savedAmount)} of ${money(item.targetAmount)} · ${money(remaining)} left${item.targetDate ? ` · target ${eh(item.targetDate)}` : ""}</p><div class="progress"><div class="bar" style="width:${pct}%"></div></div><div class="goal-actions"><input class="input allocation-input" id="alloc-${ea(item.id)}" type="number" min="1" step="1" placeholder="25"><button class="secondary" data-allocate="${ea(item.id)}">Allocate</button><button class="secondary" data-toggle-goal="${ea(item.id)}">${item.paused ? "Resume" : "Pause"}</button><button class="danger ghost" data-delete-goal="${ea(item.id)}">Delete</button></div></section>`;
}

function reports() {
  const d = derive(); const month = new Date();
  const categories = CATEGORIES.map(([name, emoji]) => ({ name, emoji, amount: state.transactions.filter((x) => x.type === "expense" && x.category === name && sameMonth(x.dateTime, month)).reduce((s, x) => s + number(x.amount), 0) })).filter((x) => x.amount > 0).sort((a,b) => b.amount-a.amount);
  const max = Math.max(1, ...categories.map((x) => x.amount)); const trend = lastMonths(6); const trendMax = Math.max(1, ...trend.map((x) => x.spent));
  return `<div class="stack page-enter">${topbar("Reports", "Monthly analytics")}
    <div class="metric-grid report-metrics"><div class="metric"><span>Income</span><strong class="positive">${money(d.monthIncome)}</strong></div><div class="metric"><span>Spent</span><strong class="negative">${money(d.monthSpent)}</strong></div><div class="metric"><span>Savings rate</span><strong>${d.monthIncome ? `${Math.round(d.savingsRate)}%` : "—"}</strong></div></div>
    <section class="card"><div class="section-head"><div><p class="eyebrow">Last 6 months</p><h2>Spending trend</h2></div></div><div class="trend-chart">${trend.map((x) => `<div class="trend-col"><span class="trend-value">${shortMoney(x.spent)}</span><div class="trend-track"><div class="trend-bar" style="height:${Math.max(6, x.spent / trendMax * 100)}%"></div></div><small>${x.label}</small></div>`).join("")}</div></section>
    <section class="card"><div class="section-head"><div><p class="eyebrow">This month</p><h2>Category breakdown</h2></div>${d.topCategory ? `<span class="pill">Top: ${eh(d.topCategory.name)}</span>` : ""}</div><div class="category-list">${categories.length ? categories.map((x) => `<div class="category-item"><div><strong>${x.emoji} ${eh(x.name)}</strong><span>${money(x.amount)}</span></div><div class="progress"><div class="bar" style="width:${x.amount / max * 100}%"></div></div></div>`).join("") : emptyState("No spending this month", "Your category report will appear after you log expenses.")}</div></section>
    <section class="card"><h2>Export your data</h2><p class="small muted">Keep a portable copy you control.</p><div class="button-row"><button class="secondary" data-export="csv">CSV ledger</button><button class="secondary" data-export="json">JSON backup</button><button class="secondary" data-export="txt">Text report</button></div></section>
  </div>`;
}

