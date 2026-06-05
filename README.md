# VaultBudget Flat Upload

This folder is the 8-file, no-folder GitHub upload version of VaultBudget.

Upload these files only:

1. `index.html`
2. `styles.css`
3. `app.js`
4. `supabase-config.js`
5. `supabase-vaultbudget.sql`
6. `privacy.html`
7. `terms.html`
8. `README.md`

Do not upload `.env.local`, `node_modules`, `dist`, `publish`, or zip files.

## Supabase

The app works locally in browser storage without Supabase.

For account backup, edit `supabase-config.js` and add only the public Supabase project URL and public anon/publishable key:

```js
window.VAULTBUDGET_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLIC_ANON_KEY",
};
```

Never put a Supabase service-role key, database password, owner password, or private token in this file.

If the tables are not already created, run `supabase-vaultbudget.sql` once in the Supabase SQL Editor.

## Backup Flow

VaultBudget is local-first:

1. Local browser save works without login.
2. Sign up or login.
3. Confirm email if Supabase requires it.
4. Press **Backup now** in Settings.

No automatic Supabase writes run in the background.

## GitHub Pages

After uploading the 8 files:

1. Open repo **Settings**.
2. Open **Pages**.
3. Source: deploy from branch.
4. Branch: `main`.
5. Folder: `/root`.
6. Save.
