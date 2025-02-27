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
2. Configure the environment variables in `.env`
3. Run `docker-compose up -d`
4. Access the application at http://localhost:8000

## Configuration

Edit the `.env` file to configure:

- Proxmox connection details
- Database credentials
- Authentication settings
- Default VM parameters

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/proxbox.git
cd proxbox

# Set up development environment
docker-compose -f docker-compose.dev.yml up -d
```

## License

MIT