async function getSupabase() {
  const config = window.VAULTBUDGET_CONFIG || {}; if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) throw new Error("Online backup is not configured. Add the public Supabase URL and anon key in supabase-config.js.");
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.107.0"); return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
}
async function cloudAction(action) {
  try {
    const email = document.getElementById("email")?.value?.trim(); const password = document.getElementById("password")?.value;
    cloudStatus = "Working…"; const supabase = await getSupabase();
    if (action === "signup" || action === "login") {
      if (!email || !password) throw new Error("Enter email and password.");
      const result = action === "signup" ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password }); if (result.error) throw result.error; auth.session = result.data.session; cloudStatus = auth.session ? "Logged in. You can back up now." : "Confirmation email sent. Confirm it, then log in."; saveAuth(); render(); return;
    }
    if (action === "logout") { await supabase.auth.signOut({ scope: "local" }); auth = { session: null, lastBackupAt: null }; cloudStatus = "Logged out. Local save active."; saveAuth(); render(); return; }
    const { data: userData, error: userError } = await supabase.auth.getUser(); if (userError || !userData.user?.id) throw new Error("Log in before using account backup."); auth.session = { user: userData.user }; const userId = userData.user.id;
    if (action === "load") { await loadCloudState(supabase, userId); cloudStatus = "Account copy loaded."; render(); return; }
    await saveCloudState(supabase, userId); auth.lastBackupAt = new Date().toISOString(); cloudStatus = `Backup saved ${new Date(auth.lastBackupAt).toLocaleString()}.`; saveAuth(); render();
  } catch (error) { cloudStatus = `${error.message || error}. Local save is still active.`; render(); }
}
async function restoreSession() {
  try { const config = window.VAULTBUDGET_CONFIG || {}; if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return; const supabase = await getSupabase(); const { data } = await supabase.auth.getSession(); auth.session = data.session; if (auth.session) { cloudStatus = auth.lastBackupAt ? `Cloud account ready · last backup ${new Date(auth.lastBackupAt).toLocaleString()}` : "Cloud account ready."; render(); } } catch {}
}

async function saveCloudState(supabase, userId) {
  const d = derive(); const savedAt = new Date().toISOString();
  const rows = { state: { user_id:userId, display_name:state.profile.displayName, balance:d.balance, member_since:state.profile.memberSince, transaction_count:state.transactions.length, goal_count:state.goals.length, recurring_expense_count:state.recurring.length, updated_at:savedAt, last_saved_at:savedAt }, profile:{ user_id:userId, display_name:state.profile.displayName, avatar:state.profile.avatar, member_since:state.profile.memberSince, spending_streak:state.profile.streak, streak_record:state.profile.streakRecord, setup_complete:true, income_amount:0, income_method:"Manual", updated_at:savedAt }, settings:{ user_id:userId, theme:"dark", currency:state.settings.currency, language:"English", low_balance_threshold:state.settings.lowBalanceThreshold, daily_limit:state.settings.dailyLimit, daily_reminders:false, weekly_summaries:false, over_budget_popup:true, pay_cycle:"monthly", auto_reset_budget:false, pin_lock:false, hide_balance:state.settings.hideBalance, auto_lock_timer:"5 min", auto_export:false, cloud_sync_mode:"manual", updated_at:savedAt } };
  for (const [table, row] of [["vault_states", rows.state],["vault_profiles", rows.profile],["vault_settings", rows.settings]]) { const { error } = await supabase.from(table).upsert(row, { onConflict:"user_id" }); if (error) throw error; }
  for (const table of ["vault_transactions","vault_goals","vault_recurring_expenses"]) { const { error } = await supabase.from(table).delete().eq("user_id", userId); if (error) throw error; }
  const groups = [
    ["vault_transactions", state.transactions.map((x) => ({ user_id:userId, id:x.id, type:x.type, amount:x.amount, category:x.category, emoji:x.emoji, note:x.note, date_time:x.dateTime }))],
    ["vault_goals", state.goals.map((x) => ({ user_id:userId, id:x.id, name:x.name, emoji:x.emoji, target_amount:x.targetAmount, saved_amount:x.savedAmount, target_date:x.targetDate || null, paused:x.paused, completed:x.completed }))],
    ["vault_recurring_expenses", state.recurring.map((x) => ({ user_id:userId, id:x.id, emoji:x.emoji, name:x.name, amount:x.amount, cadence:x.cadence }))],
  ];
  for (const [table, rowsForTable] of groups) { if (!rowsForTable.length) continue; const { error } = await supabase.from(table).upsert(rowsForTable, { onConflict:"user_id,id" }); if (error) throw error; }
}
async function loadCloudState(supabase, userId) {
  const [profileR, settingsR, transactionsR, goalsR, recurringR] = await Promise.all([
    supabase.from("vault_profiles").select("*").eq("user_id", userId).maybeSingle(), supabase.from("vault_settings").select("*").eq("user_id", userId).maybeSingle(), supabase.from("vault_transactions").select("*").eq("user_id", userId).order("date_time", { ascending:false }), supabase.from("vault_goals").select("*").eq("user_id", userId).order("target_date", { ascending:true }), supabase.from("vault_recurring_expenses").select("*").eq("user_id", userId).order("created_at", { ascending:false }),
  ]); for (const r of [profileR, settingsR, transactionsR, goalsR, recurringR]) if (r.error) throw r.error;
  state = normalizeState({ ...state, profile:{ ...state.profile, displayName:profileR.data?.display_name || state.profile.displayName, avatar:profileR.data?.avatar || state.profile.avatar, memberSince:profileR.data?.member_since || state.profile.memberSince, streak:number(profileR.data?.spending_streak, state.profile.streak), streakRecord:number(profileR.data?.streak_record, state.profile.streakRecord) }, settings:{ ...state.settings, currency:settingsR.data?.currency || state.settings.currency, dailyLimit:number(settingsR.data?.daily_limit, state.settings.dailyLimit), lowBalanceThreshold:number(settingsR.data?.low_balance_threshold, state.settings.lowBalanceThreshold), hideBalance:Boolean(settingsR.data?.hide_balance) }, transactions:(transactionsR.data || []).map((x) => ({ id:x.id, type:x.type, amount:number(x.amount), category:x.category, emoji:x.emoji, note:x.note, dateTime:x.date_time })), goals:(goalsR.data || []).map((x) => ({ id:x.id, name:x.name, emoji:x.emoji, targetAmount:number(x.target_amount), savedAmount:number(x.saved_amount), targetDate:x.target_date || "", paused:Boolean(x.paused), completed:Boolean(x.completed) })), recurring:(recurringR.data || []).map((x) => ({ id:x.id, emoji:x.emoji, name:x.name, amount:number(x.amount), cadence:x.cadence })) });
}

