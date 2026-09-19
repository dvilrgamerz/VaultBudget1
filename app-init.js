function exportFile(type) {
  const d = derive(); let name = "vaultbudget-export.txt", text = "", mime = "text/plain";
  if (type === "csv") { name = "vaultbudget-transactions.csv"; mime = "text/csv"; text = ["date,type,category,note,amount", ...sortedTransactions().map((x) => [x.dateTime,x.type,x.category,x.note,x.amount].map(csv).join(","))].join("\n"); }
  else if (type === "json") { name = `vaultbudget-backup-${new Date().toISOString().slice(0,10)}.json`; mime = "application/json"; text = JSON.stringify({ app:"VaultBudget", schemaVersion:2, exportedAt:new Date().toISOString(), state }, null, 2); }
  else { name = `vaultbudget-report-${new Date().toISOString().slice(0,7)}.txt`; text = `VaultBudget Report\nGenerated: ${new Date().toLocaleString()}\n\nBalance: ${money(d.balance, true)}\nThis month income: ${money(d.monthIncome, true)}\nThis month spent: ${money(d.monthSpent, true)}\nMonthly net: ${money(d.monthNet, true)}\nGoals saved: ${money(d.goalSaved, true)}\nRecurring monthly estimate: ${money(d.recurringMonthly, true)}\nTransactions: ${state.transactions.length}\nGoals: ${state.goals.length}\n`; }
  const url = URL.createObjectURL(new Blob([text], { type:mime })); const link = document.createElement("a"); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 500);
}
async function importBackup(event) {
  const file = event.target.files?.[0]; if (!file) return;
  try { const parsed = JSON.parse(await file.text()); const candidate = parsed?.state || parsed; if (!candidate?.transactions || !candidate?.goals) throw new Error("This does not look like a VaultBudget backup."); if (!confirm("Replace your current local data with this backup?")) return; state = normalizeState(candidate); saveState(); alert("Backup imported successfully."); render(); }
  catch (error) { alert(error.message || "Could not import this backup."); }
  finally { event.target.value = ""; }
}
function csv(value) { return `"${String(value ?? "").replaceAll('"','""')}"`; }
function eh(value) { return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function ea(value) { return eh(value); }

render();
restoreSession();
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
