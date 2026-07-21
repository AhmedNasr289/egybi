# Using This Vault (on any device)

This folder **is** an Obsidian vault — the knowledge base and memory for EgyBI.
It lives inside the project repo and updates whenever work is committed to `main`,
so with sync set up you always have the latest. Back to [[Home]].

## The one fact that makes this work
- **Repo:** `github.com/AhmedNasr289/egybi`
- **The vault is the `egybi/` subfolder** at the repo root (this folder) — it holds
  the `.obsidian/` config and every note. Open *this* folder as the vault, not the
  repo root.
- It's **private** (the site's `.htaccess` blocks it from egybi.com), so cloning
  needs your GitHub login — a Personal Access Token with `repo` scope
  (github.com → Settings → Developer settings → Personal access tokens).
- **Entry point is [[Home]]**; [[Changelog]] is the full dated history.

## 💻 Desktop (Mac / Windows)
1. Install Obsidian → obsidian.md
2. `git clone https://github.com/AhmedNasr289/egybi.git`
   (username + the token as the password when prompted)
3. Obsidian → **Open folder as vault** → pick the inner **`egybi/egybi`** folder.
4. Keep it current: `git pull` in that folder — or install the community plugin
   **Obsidian Git** (Settings → Community plugins) to auto-pull.

## 📱 Phone (iOS / Android)
Use the **Obsidian Git** plugin, which clones and pulls from GitHub on mobile:
1. Install the **Obsidian** app, create an empty vault.
2. Settings → **Community plugins** → enable → install **Obsidian Git**.
3. In its settings use **Clone** with `https://github.com/AhmedNasr289/egybi.git`
   and your token, then open [[Home]].
4. **Pull** anytime to fetch the latest.

*(iOS alternative: the **Working Copy** app clones the repo into Files, then
Obsidian opens the `egybi/` folder as a vault.)*

## Editing on your device
Edits you make in Obsidian are local until you **commit + push** (Obsidian Git can
do this with one command). If both you and a Claude session edit the vault,
`pull` before editing to avoid conflicts — the same rule as any shared repo.
