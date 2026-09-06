# ProxBox - Discardable VM Management for Proxmox

ProxBox is a modern web application that provides an intuitive interface for creating and managing discardable virtual machines on Proxmox VE.

## Features

- Create temporary VMs from Proxmox templates
- Set VM expiration by timer or on shutdown
- Template management and access control
- User permissions system with admin capabilities
- Proxmox resource utilization monitoring
- Direct VNC console access
- VM sharing between users
- LDAP and GitLab OAuth authentication

## Architecture

- **Backend**: FastAPI with Pydantic models
- **Frontend**: React with TypeScript
- **Database**: PostgreSQL
- **Deployment**: Docker and Docker Compose
- **Authentication**: LDAP, GitLab OAuth, and local accounts

## Deployment

### Prerequisites

- Docker and Docker Compose
- Proxmox VE instance with API access

### Setup

1. Clone this repository
2. Create your local configuration from the template:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and replace every `CHANGE_ME_...` placeholder with a real value
4. Run `docker-compose up -d`
5. Access the application at http://localhost:8000

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
# Clone the repository
git clone https://github.com/rennerdo30/ProxBox.git
cd ProxBox

# Create your local configuration
cp .env.example .env
# ...then edit .env and fill in the CHANGE_ME_... placeholders

# Set up development environment
docker-compose -f docker-compose.dev.yml up -d
```

## License

MIT