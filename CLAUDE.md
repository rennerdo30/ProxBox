# ProxBox Development Notes

## Project Overview

ProxBox is a web application for managing discardable virtual machines on Proxmox VE. The application consists of:

- FastAPI backend with PostgreSQL database
- React frontend with TypeScript
- Docker and Docker Compose for deployment

## Backend Commands

### Start Development Environment

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Run Database Migrations

```bash
docker-compose exec backend alembic upgrade head
```

### Create New Migration

```bash
docker-compose exec backend alembic revision --autogenerate -m "description"
```

### Backend Tests

```bash
docker-compose exec backend pytest
```

## Frontend Commands

### Build Frontend

```bash
docker-compose exec frontend npm run build
```

### Lint Frontend

```bash
docker-compose exec frontend npm run lint
```

## Development Workflow

1. Start the dev environment: `docker-compose -f docker-compose.dev.yml up -d`
2. Make changes to code
3. Run migrations if needed: `docker-compose exec backend alembic upgrade head`
4. Test changes in development environment
5. Build for production: `docker-compose -f docker-compose.yml up -d --build`

## Project Structure

### Backend

- `app/main.py`: Entry point
- `app/api/`: API endpoints
- `app/models/`: Database models
- `app/schemas/`: Pydantic schemas
- `app/services/`: Business logic
- `app/core/`: Core settings and configs
- `app/db/`: Database connection

### Frontend

- `src/main.tsx`: Entry point
- `src/components/`: Reusable UI components
- `src/contexts/`: React contexts
- `src/hooks/`: Custom React hooks
- `src/pages/`: Application pages
- `src/services/`: API services