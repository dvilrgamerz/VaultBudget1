const STORAGE_KEY = "vaultbudget-flat-state-v2";
const LEGACY_STORAGE_KEY = "vaultbudget-flat-state-v1";
const AUTH_KEY = "vaultbudget-flat-auth-v2";
const CATEGORIES = [
  ["Food", "🍔"], ["Transport", "🚗"], ["Shopping", "🛍️"], ["Health", "💊"],
  ["Entertainment", "🎮"], ["Bills", "🏠"], ["Work", "💼"], ["Travel", "✈️"],
  ["Education", "🎓"], ["Other", "📦"],
];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR"];
const TABS = [
  ["home", "Home", "🏠"], ["transactions", "Ledger", "💸"], ["goals", "Goals", "🎯"],
  ["reports", "Reports", "📊"], ["profile", "Profile", "👤"], ["settings", "Settings", "⚙️"],
];

const seed = {
  version: 2,
  profile: { displayName: "Vault user", avatar: "👤", memberSince: "2026-06-01", streak: 7, streakRecord: 14, totalSaved: 820 },
  settings: { currency: "USD", dailyLimit: 45, lowBalanceThreshold: 200, hideBalance: false },
  transactions: [
    tx("income", 2400, "Work", "Paycheck", daysAgo(12)),
    tx("expense", 86, "Bills", "Phone plan", daysAgo(8)),
    tx("expense", 19.5, "Food", "Lunch", daysAgo(2)),
    tx("expense", 42.3, "Transport", "Fuel", daysAgo(1)),
    tx("expense", 24, "Entertainment", "Movie night", new Date().toISOString()),
  ],
  goals: [
    goal("Emergency fund", "🛡️", 1500, 620, "2026-09-30"),
    goal("New laptop", "💻", 1800, 420, "2026-12-15"),
  ],
  recurring: [
    { id: id(), emoji: "🏠", name: "Rent", amount: 950, cadence: "Monthly" },
    { id: id(), emoji: "📱", name: "Phone", amount: 86, cadence: "Monthly" },
  ],
};

let state = loadState();
let activeTab = validTab(new URLSearchParams(location.search).get("tab")) || "home";
let modal = null;
let editingTransactionId = null;
let txQuery = "";
let txType = "all";
let txCategory = "all";
let auth = loadAuth();
let cloudStatus = "Local save active";

function id() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
function daysAgo(days) { const date = new Date(); date.setDate(date.getDate() - days); return date.toISOString(); }
function tx(type, amount, category, note, dateTime = new Date().toISOString()) {
  return { id: id(), type, amount: Number(amount), category, emoji: emojiFor(category), note, dateTime };
}
function goal(name, emoji, targetAmount, savedAmount, targetDate) {
  const target = Number(targetAmount || 0); const saved = Number(savedAmount || 0);
  return { id: id(), name, emoji, targetAmount: target, savedAmount: saved, targetDate, paused: false, completed: saved >= target && target > 0 };
}
function emojiFor(category) { return CATEGORIES.find(([name]) => name === category)?.[1] || "📦"; }
function validTab(value) { return TABS.some(([id]) => id === value) ? value : null; }
function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function sameMonth(a, b = new Date()) { const d = new Date(a); return d.getFullYear() === b.getFullYear() && d.getMonth() === b.getMonth(); }

function normalizeState(input) {
  const raw = input && typeof input === "object" ? input : {};
  return {
    version: 2,
    profile: { ...seed.profile, ...(raw.profile || {}) },
    settings: { ...seed.settings, ...(raw.settings || {}), dailyLimit: number(raw.settings?.dailyLimit, seed.settings.dailyLimit), lowBalanceThreshold: number(raw.settings?.lowBalanceThreshold, seed.settings.lowBalanceThreshold) },
    transactions: Array.isArray(raw.transactions) ? raw.transactions.map((item) => ({
      id: String(item.id || id()), type: ["income", "expense", "goal"].includes(item.type) ? item.type : "expense",
      amount: Math.max(0, number(item.amount)), category: String(item.category || "Other"), emoji: String(item.emoji || emojiFor(item.category)),
      note: String(item.note || item.category || "Transaction"), dateTime: isValidDate(item.dateTime) ? new Date(item.dateTime).toISOString() : new Date().toISOString(),
    })) : structuredClone(seed.transactions),
    goals: Array.isArray(raw.goals) ? raw.goals.map((item) => ({
      id: String(item.id || id()), name: String(item.name || "Goal"), emoji: String(item.emoji || "🎯"), targetAmount: Math.max(0, number(item.targetAmount)),
      savedAmount: Math.max(0, number(item.savedAmount)), targetDate: String(item.targetDate || ""), paused: Boolean(item.paused), completed: Boolean(item.completed),
    })) : structuredClone(seed.goals),
    recurring: Array.isArray(raw.recurring) ? raw.recurring.map((item) => ({ id: String(item.id || id()), emoji: String(item.emoji || "🔁"), name: String(item.name || "Recurring"), amount: Math.max(0, number(item.amount)), cadence: String(item.cadence || "Monthly") })) : structuredClone(seed.recurring),
  };
}
function isValidDate(value) { return !Number.isNaN(new Date(value).getTime()); }

function loadState() {
  for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved?.transactions && saved?.goals) return normalizeState(saved);
    } catch {}
  }
  return structuredClone(seed);
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadAuth() {
  try { return { session: null, lastBackupAt: JSON.parse(localStorage.getItem(AUTH_KEY))?.lastBackupAt || null }; }
  catch { return { session: null, lastBackupAt: null }; }
}
function saveAuth() { localStorage.setItem(AUTH_KEY, JSON.stringify({ lastBackupAt: auth.lastBackupAt || null })); }

function money(value, force = false) {
  if (state.settings.hideBalance && !force) return "••••";
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: state.settings.currency || "USD", maximumFractionDigits: 2 }).format(number(value)); }
  catch { return `$${number(value).toFixed(2)}`; }
}
function shortMoney(value) {
  if (state.settings.hideBalance) return "••••";
  const n = number(value); if (Math.abs(n) < 1000) return money(n);
  return `${n < 0 ? "-" : ""}${state.settings.currency || "USD"} ${Math.abs(n / 1000).toFixed(1)}k`;
}

function derive() {
  const now = new Date();
  const income = state.transactions.filter((x) => x.type === "income").reduce((s, x) => s + number(x.amount), 0);
  const spent = state.transactions.filter((x) => x.type === "expense").reduce((s, x) => s + number(x.amount), 0);
  const goalTransfers = state.transactions.filter((x) => x.type === "goal").reduce((s, x) => s + number(x.amount), 0);
  const goalSaved = state.goals.reduce((s, x) => s + number(x.savedAmount), 0);
  const balance = income - spent - goalSaved;
  const today = now.toDateString();
  const todaySpent = state.transactions.filter((x) => x.type === "expense" && new Date(x.dateTime).toDateString() === today).reduce((s, x) => s + number(x.amount), 0);
  const monthIncome = state.transactions.filter((x) => x.type === "income" && sameMonth(x.dateTime, now)).reduce((s, x) => s + number(x.amount), 0);
  const monthSpent = state.transactions.filter((x) => x.type === "expense" && sameMonth(x.dateTime, now)).reduce((s, x) => s + number(x.amount), 0);
  const monthNet = monthIncome - monthSpent;
  const savingsRate = monthIncome > 0 ? ((monthIncome - monthSpent) / monthIncome) * 100 : 0;
  const recurringMonthly = state.recurring.reduce((s, x) => s + monthlyEquivalent(x), 0);
  const topCategory = topSpendingCategory(now);
  return { income, spent, goalTransfers, goalSaved, balance, todaySpent, monthIncome, monthSpent, monthNet, savingsRate, recurringMonthly, topCategory };
}
function monthlyEquivalent(item) {
  const a = number(item.amount); const c = String(item.cadence).toLowerCase();
  if (c.includes("week")) return a * 52 / 12; if (c.includes("year")) return a / 12; if (c.includes("bi")) return a * 26 / 12; return a;
}
function topSpendingCategory(month = new Date()) {
  const totals = {};
  state.transactions.filter((x) => x.type === "expense" && sameMonth(x.dateTime, month)).forEach((x) => { totals[x.category] = (totals[x.category] || 0) + number(x.amount); });
  const entry = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  return entry ? { name: entry[0], amount: entry[1] } : null;
}
function lastMonths(count = 6) {
  const now = new Date(); const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1); const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const spent = state.transactions.filter((x) => x.type === "expense" && new Date(x.dateTime) >= start && new Date(x.dateTime) < end).reduce((s, x) => s + number(x.amount), 0);
    out.push({ label: start.toLocaleDateString(undefined, { month: "short" }), spent });
  }
  return out;
}

