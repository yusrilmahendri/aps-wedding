# AGENTS.md

## Cursor Cloud specific instructions

### What this is
Single Angular 13 frontend app (`woocommerce` / "Sena Digital Invitation"), a wedding-invitation SaaS. There is **no backend in this repo** — it calls an external API configured in `src/environments/`:
- dev (`environment.ts`) → `http://localhost:8000/api` (not running here)
- prod (`environment.prod.ts`) → `https://cloud-api.sena-digital.com/api`

Because the dev API host is not part of this repo, API-driven UI is empty/non-functional locally (e.g. login/register, and the "Paket Undangan" dropdown in `/buat-undangan` won't populate). All client-side routing, components, and reactive forms work fine without it.

### Node version (important gotcha)
Use **Node 20** (`.nvmrc`). The VM's default `node` on `PATH` is v22 (`/exec-daemon/node`), which takes precedence over nvm even though `nvm alias default` is 20. Always activate Node 20 explicitly before running `ng`/`npm` commands:
```
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 20
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
```

### Dependencies
Install with `npm install --legacy-peer-deps` (peer-dependency conflicts otherwise; this is what `vercel.json` / `build-vercel.sh` use). The startup update script already runs this.

### Commands (see `package.json` scripts)
- Dev server: `npm start` (= `ng serve`), serves on port 4200.
- Build: `npm run build` defaults to the **production** config. For a dev build use `ng build --configuration development`.
- Lint: `npm run lint`. NOTE: this currently exits non-zero due to ~19 pre-existing lint errors in the codebase; the linter itself works.
- Unit tests: `ng test` uses Karma + headless Chrome (`google-chrome` is installed at `/usr/local/bin/google-chrome`).
