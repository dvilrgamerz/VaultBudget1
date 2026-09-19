function bind() {
  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  document.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => { editingTransactionId = null; modal = b.dataset.open; render(); }));
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
  document.querySelectorAll("[data-toggle-balance]").forEach((b) => b.addEventListener("click", () => { state.settings.hideBalance = !state.settings.hideBalance; render(); }));
  const search = document.getElementById("txSearch"); if (search) search.addEventListener("input", () => { txQuery = search.value; render(); queueMicrotask(() => { const el = document.getElementById("txSearch"); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }); });
  const typeFilter = document.getElementById("txType"); if (typeFilter) typeFilter.addEventListener("change", () => { txType = typeFilter.value; render(); });
  const catFilter = document.getElementById("txCategory"); if (catFilter) catFilter.addEventListener("change", () => { txCategory = catFilter.value; render(); });
  document.querySelectorAll("[data-clear-filters]").forEach((b) => b.addEventListener("click", () => { txQuery = ""; txType = "all"; txCategory = "all"; render(); }));
  document.querySelectorAll("[data-submit-money]").forEach((b) => b.addEventListener("click", submitMoney));
  document.querySelectorAll("[data-edit-tx]").forEach((b) => b.addEventListener("click", () => { editingTransactionId = b.dataset.editTx; modal = "edit"; render(); }));
  document.querySelectorAll("[data-delete-tx]").forEach((b) => b.addEventListener("click", () => { if (confirm("Delete this transaction?")) { state.transactions = state.transactions.filter((x) => x.id !== b.dataset.deleteTx); render(); } }));
  document.querySelectorAll("[data-submit-goal]").forEach((b) => b.addEventListener("click", submitGoal));
  document.querySelectorAll("[data-allocate]").forEach((b) => b.addEventListener("click", () => allocateGoal(b.dataset.allocate)));
  document.querySelectorAll("[data-toggle-goal]").forEach((b) => b.addEventListener("click", () => { const item = state.goals.find((x) => x.id === b.dataset.toggleGoal); if (item) { item.paused = !item.paused; render(); } }));
  document.querySelectorAll("[data-delete-goal]").forEach((b) => b.addEventListener("click", () => { if (confirm("Delete this savings goal?")) { state.goals = state.goals.filter((x) => x.id !== b.dataset.deleteGoal); render(); } }));
  document.querySelectorAll("[data-submit-recurring]").forEach((b) => b.addEventListener("click", submitRecurring));
  document.querySelectorAll("[data-delete-recurring]").forEach((b) => b.addEventListener("click", () => { state.recurring = state.recurring.filter((x) => x.id !== b.dataset.deleteRecurring); render(); }));
  document.querySelectorAll("[data-export]").forEach((b) => b.addEventListener("click", () => exportFile(b.dataset.export)));
  document.querySelectorAll("[data-import]").forEach((b) => b.addEventListener("click", () => document.getElementById("importFile")?.click()));
  const importFile = document.getElementById("importFile"); if (importFile) importFile.addEventListener("change", importBackup);
  document.querySelectorAll("[data-cloud]").forEach((b) => b.addEventListener("click", () => cloudAction(b.dataset.cloud)));
  document.querySelectorAll("[data-save-settings]").forEach((b) => b.addEventListener("click", saveSettings));
  document.querySelectorAll("[data-save-profile]").forEach((b) => b.addEventListener("click", saveProfile));
  document.querySelectorAll("[data-reset]").forEach((b) => b.addEventListener("click", resetLocal));
  document.onkeydown = modal ? escapeHandler : null;
}
function escapeHandler(event) { if (event.key === "Escape" && modal) closeModal(); }
function closeModal() { modal = null; editingTransactionId = null; render(); }
function submitMoney() {
  const amount = number(document.getElementById("modalAmount")?.value); if (amount <= 0) return alert("Enter an amount greater than 0.");
  const type = document.getElementById("modalType")?.value === "income" ? "income" : "expense"; const category = document.getElementById("modalCategory")?.value || "Other"; const note = document.getElementById("modalNote")?.value.trim() || category; const dateRaw = document.getElementById("modalDate")?.value; const dateTime = dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString();
  if (editingTransactionId) { const item = state.transactions.find((x) => x.id === editingTransactionId); if (item) Object.assign(item, { type, amount, category, emoji: emojiFor(category), note, dateTime }); }
  else state.transactions.unshift(tx(type, amount, category, note, dateTime));
  closeModal();
}
function submitGoal() {
  const name = document.getElementById("goalName")?.value.trim() || "New goal"; const target = number(document.getElementById("goalTarget")?.value); if (target <= 0) return alert("Enter a target amount greater than 0.");
  state.goals.unshift(goal(name, document.getElementById("goalEmoji")?.value.trim() || "🎯", target, 0, document.getElementById("goalDate")?.value || "")); closeModal();
}
function allocateGoal(goalId) {
  const item = state.goals.find((x) => x.id === goalId); if (!item || item.paused || item.completed) return;
  const amount = number(document.getElementById(`alloc-${CSS.escape(goalId)}`)?.value, 25); if (amount <= 0) return alert("Enter an allocation greater than 0."); const applied = Math.min(amount, Math.max(0, number(item.targetAmount) - number(item.savedAmount))); if (!applied) return;
  item.savedAmount = number(item.savedAmount) + applied; item.completed = item.savedAmount >= item.targetAmount; state.transactions.unshift(tx("goal", applied, "Other", `${item.name} allocation`)); render();
}
function submitRecurring() {
  const name = document.getElementById("recurringName")?.value.trim(); const amount = number(document.getElementById("recurringAmount")?.value); if (!name || amount <= 0) return alert("Enter a name and amount greater than 0.");
  state.recurring.unshift({ id: id(), emoji: document.getElementById("recurringEmoji")?.value.trim() || "🔁", name, amount, cadence: document.getElementById("recurringCadence")?.value || "Monthly" }); closeModal();
}
function saveSettings() {
  state.settings.currency = CURRENCIES.includes(document.getElementById("currency")?.value) ? document.getElementById("currency").value : "USD"; state.settings.dailyLimit = Math.max(0, number(document.getElementById("dailyLimit")?.value, 45)); state.settings.lowBalanceThreshold = Math.max(0, number(document.getElementById("threshold")?.value, 200)); state.settings.hideBalance = Boolean(document.getElementById("hideBalance")?.checked); render();
}
function saveProfile() { state.profile.displayName = document.getElementById("displayName")?.value.trim().slice(0, 40) || "Vault user"; state.profile.avatar = document.getElementById("avatar")?.value.trim().slice(0, 4) || "👤"; render(); }
function resetLocal() { if (confirm("Reset all local VaultBudget data? This cannot be undone unless you exported a backup.")) { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LEGACY_STORAGE_KEY); state = structuredClone(seed); txQuery = ""; txType = "all"; txCategory = "all"; render(); } }

