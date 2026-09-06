# ProxBox — discardable VM management for Proxmox VE

ProxBox is a self-hosted web app for handing out *throwaway* virtual machines on a
Proxmox VE cluster. A user picks a template, gets a VM, and the VM is meant to go away
again — after a timer or once it is shut down — instead of quietly living on the cluster
forever.

It is a FastAPI backend plus a React/TypeScript frontend, wired together with Docker
Compose and PostgreSQL.

## Project status

Early work in progress, built for a home lab. What exists today:

- **Backend:** the REST API is largely in place — auth (register / login / JWT refresh /
  `me`), VM create, list, read, update, delete, start, stop, graceful shutdown, VNC
  console ticket, VM sharing between users, template CRUD, user administration, and
  Proxmox cluster usage/node/capacity queries.
- **Frontend:** login, registration and the dashboard are implemented. The remaining
  routes referenced by the router (VM list, VM create/detail/console, and the admin
  pages) are **not written yet**, so a production `npm run build` of the frontend fails
  until they exist. `npm run lint` also still needs an ESLint config file.
- **Not implemented:** no background job discards expired VMs yet — `discard_type` and
  `discard_at` are stored and returned by the API, but nothing reaps them on a schedule.
  LDAP and GitLab OAuth exist as configuration settings only; the only working login is
  a local account.
- **Migrations:** `backend/migrations/versions/` is empty, so the first schema revision
  still has to be generated.

## Tech stack

| Layer    | Choice                                                             |
| -------- | ------------------------------------------------------------------ |
| Backend  | FastAPI, Pydantic v2, SQLAlchemy 2 (async), Alembic, proxmoxer      |
| Database | PostgreSQL 14                                                      |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query |
| Auth     | JWT access + refresh tokens (python-jose, bcrypt)                  |
| Runtime  | Docker Compose; frontend served by nginx in the production image   |

## Getting started

### Prerequisites

- Docker and Docker Compose
- A Proxmox VE instance with an API token, and at least one VM template to clone

### Run it

```bash
git clone https://github.com/rennerdo30/ProxBox.git
cd ProxBox

# .env.example is a template - copy it and fill in your own values
cp .env.example .env

# Development: hot-reloading backend + Vite dev server
docker compose -f docker-compose.dev.yml up -d

# Apply database migrations (once revisions exist)
docker compose exec backend alembic upgrade head
```

| Service            | URL                            |
| ------------------ | ------------------------------ |
| Frontend           | http://localhost:3000          |
| API                | http://localhost:8000/api      |
| Interactive API docs | http://localhost:8000/docs   |

For the production images (multi-stage frontend build behind nginx):

```bash
docker compose up -d --build
```

## Configuration

All settings come from the `.env` file that both Compose files read. Copy `.env.example` as a
starting point.

| Variable                                                        | Purpose                                              |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST`, `DB_PORT`        | PostgreSQL connection                                |
| `PROXMOX_HOST`                                                   | Proxmox API base URL, e.g. `https://pve.example:8006` |
| `PROXMOX_USER`, `PROXMOX_TOKEN_NAME`, `PROXMOX_TOKEN_VALUE`      | Proxmox API token credentials                        |
| `PROXMOX_VERIFY_SSL`                                             | Verify the Proxmox certificate (`true` in production) |
| `SECRET_KEY`                                                     | JWT signing key — generate your own                  |
| `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`       | Token lifetimes                                      |
| `LDAP_*`, `OAUTH_*`, `GITLAB_*`                                  | Reserved for the not-yet-implemented login providers |
| `VITE_API_URL`                                                   | API base URL baked into the frontend build           |

The `SECRET_KEY` and passwords in `.env.example` are throwaway development values. Replace
them before exposing ProxBox to anything but your own machine.

## Repository layout

```
backend/
  app/main.py        FastAPI entry point, CORS, /api router
  app/api/v1/        auth, users, vms, templates, proxmox endpoints
  app/models/        SQLAlchemy models (User, VM, VMTemplate)
  app/schemas/       Pydantic request/response models
  app/services/      Proxmox client and user/auth logic
  app/core/config.py settings loaded from .env
  migrations/        Alembic environment
frontend/
  src/pages/         route components
  src/components/    shared UI (layout, alerts, meters, theme toggle)
  src/contexts/      auth and theme providers
  src/lib/           UI constants and class-name helper
  src/index.css      design tokens (light + dark) and component classes
```

## Configuration

All configuration lives in a single `.env` file at the repository root, which
both `docker-compose.yml` and `docker-compose.dev.yml` load via `env_file`, and
which the backend reads through `backend/app/core/config.py`.

- `.env.example` is the tracked template. It contains only placeholders and
  documents every supported key.
- `.env` is your real configuration. It is listed in `.gitignore` and **must
  never be committed** - it contains your Proxmox API token, database password
  and JWT signing key.

Settings groups:

- Proxmox connection details (`PROXMOX_*`)
- Database credentials (`DB_*`)
- Authentication settings (`SECRET_KEY`, `ALGORITHM`, token lifetimes, `LDAP_*`,
  `OAUTH_*` / `GITLAB_*`)
- Frontend settings (`VITE_API_URL`, `NODE_ENV`)

### Generating `SECRET_KEY`

`SECRET_KEY` is the signing key for the application's JWT access and refresh
tokens. Anyone who knows it can mint valid tokens for any account, including
administrators. Generate a unique random value per deployment:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Proxmox TLS verification

`PROXMOX_VERIFY_SSL` defaults to `true`, both in `.env.example` and as the
default in the settings class. Keep it that way.

If your Proxmox host uses a self-signed certificate, the recommended fix is to
trust the issuing CA on the machines running ProxBox (for the Docker
deployment, mount your CA bundle into the backend container) rather than to
disable verification.

As a last resort you can opt out by setting:

```dotenv
PROXMOX_VERIFY_SSL=false
```

This is a real security downgrade, not just a convenience switch. With
verification off, ProxBox accepts any certificate the endpoint presents, so an
attacker able to intercept the connection can impersonate the Proxmox API,
capture the API token ID and secret that ProxBox sends with every request, and
then use that token to create, control and destroy VMs on your cluster. Only
use it on a trusted network, and never for an internet-facing Proxmox endpoint.

## Security notes

### Rotate the credentials that used to be in this repository

Earlier revisions of this repository committed a file named `dev.env` that
contained a concrete `SECRET_KEY` value and `DB_PASSWORD=devpassword`. That
file has been replaced by the placeholder-only `.env.example`, but the old
values remain readable in the git history of this public repository and in any
existing clone, fork or mirror.

Treat both as compromised and rotate them:

- **`SECRET_KEY`** - generate a new one as shown above. Rotating it invalidates
  all previously issued JWTs, so every user has to log in again. Any deployment
  that used the committed value should assume tokens signed with it could have
  been forged by anyone.
- **`DB_PASSWORD`** - change the PostgreSQL password for the `proxbox` role
  (`ALTER ROLE proxbox WITH PASSWORD '<new password>';`) and update `.env`.
  Never reuse `devpassword`.

If you also ever placed real values in a committed env file yourself - a
Proxmox API token, a GitLab OAuth client secret - revoke and reissue those too.

### Keep secrets out of git

`.gitignore` now excludes `.env` and `.env.*` (except `.env.example`), so a
routine `git add -A` no longer stages your live configuration. Before your
first commit, confirm it:

```bash
git status --short        # .env must not appear
git check-ignore -v .env  # should report the .gitignore rule
```

## Development

```bash
# Frontend
docker compose exec frontend npm run build
docker compose exec frontend npm run lint

# Backend
docker compose exec backend pytest
docker compose exec backend alembic revision --autogenerate -m "description"
```

The frontend can also be run directly with `npm install && npm run dev` inside
`frontend/`, pointed at a running backend via `VITE_API_URL`.

### Theming

Colours live as HSL custom properties in `frontend/src/index.css`; the `.dark` block
overrides the same token names. Light and dark are both supported — the app follows the
operating system preference and remembers an explicit choice made with the header
toggle. Prefer adding a token over hardcoding a colour in a component.

## License

MIT — see [LICENSE](LICENSE).
