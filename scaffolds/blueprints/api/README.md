# 🚀 SaaSForge API

<div align="center">

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

## 📝 Description

SaaSForge API is a modular NestJS backend boilerplate, offering a robust and scalable architecture for modern SaaS application development. Built with best practices and cutting-edge technologies.

### 🛠️ Tech Stack

- **Framework**: NestJS - Node.js framework for server applications
- **Language**: TypeScript - Typed programming
- **ORM**: Prisma - Modern database management
- **Containerization**: Docker
- **Testing**: Jest - Unit and E2E testing

## ⚡ Fast Starting

### Prerequisites

- Node.js (version in `.nvmrc`)
- Docker and Docker Compose
- npm

### Quick Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-org/saasforge.git
cd saasforge/apps/api

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.test .env
# Edit .env with your configurations

# 4. Start the database
docker network create saasforge-network
docker-compose -f ../db/docker-compose.db-dev.yml up -d

# 5. Initialize database
npm run db:update:dev init_data_base_config -- --wf --wt --wds

# 6. Launch the application
npm run dev
```

## 🎉 Congrats & Testing Your API

Your backend is now operational! Here's how to test it:

1. 📚 Open Swagger documentation: http://localhost:3500/api/docs
2. 🔍 Explore interactive endpoints
3. 🚀 Test endpoints directly with the "Try it out" button
4. ✅ Execute real requests and observe responses

### 💡 Pro Tips

- Use Prisma CLI tools for database management
- Generate modules quickly with NestJS CLI
- Take advantage of modular architecture for rapid development

## 🛠️ More Commands

### Production

```bash
npm run build
npm run prod
```

### Testing

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# Full tests
npm run test:full
```

### Docker

```bash
# Create network (if needed)
docker network create saasforge-network

# Build image
docker build -t saasforge-api .

# Start with Docker Compose
docker-compose up --build
```

## 📁 Folder Structure

```
src/
├── common/          # Shared code and utilities
├── configs/         # Application configurations
├── modules/         # Business modules
└── main.ts          # Application entry point
```

## ✨ Features

### Modular Architecture

- Independent modules for each feature
- Clear and maintainable structure
- Separation of concerns

### Security & Performance

- Data validation with DTOs
- Centralized error handling
- Structured logging
- Automated testing

### Code Quality

- Automatic linting
- Code formatting
- Git hooks for quality
- Integrated Swagger documentation



## 🏷️ Version & Deployment Management

### Tag Manager

The project includes a powerful version and tag management system that automates the versioning process. This system is integrated with Git hooks and provides a seamless workflow for managing
releases.

#### How to Use

1. Create a release candidate branch with the `rc-` prefix:

```bash
git checkout -b rc-feature-name
```

2. When pushing changes, the tag manager will automatically:
   - Check current version in `package.json`
   - Detect if a version tag exists
   - Propose version updates if needed
   - Create and manage Git tags

#### Version Update Options

When prompted, you can choose from several version update types:

- **patch**: Bug fixes and minor changes (e.g., 1.0.0 → 1.0.1)
- **minor**: New features, backward compatible (e.g., 1.0.0 → 1.1.0)
- **major**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **custom**: Specify a custom version

#### Pre-release Options

For non-custom versions, you can select pre-release status:

- **none**: Regular release (default)
- **alpha**: Early internal testing
- **beta**: Public testing
- **rc**: Release candidate

### Deployment Workflow

The project includes a comprehensive GitHub Actions workflow for automated deployment:

#### Deployment Triggers

- Push to `master` branch
- Manual workflow dispatch with version specification
- Repository dispatch events

#### Deployment Steps

1. **Test Verification**

   - Checks if tests have passed
   - Blocks deployment if tests fail

2. **Version Tag Creation**

   - Automatically creates version tags based on `package.json`
   - Handles version bump commits
   - Manages tag updates and conflicts

3. **Docker Image Management**

   - Builds and pushes to GitHub Container Registry (GHCR)
   - Tags images with:
     - Version number
     - Latest tag
     - Git SHA

4. **NAS/VPS Deployment (to adapt depending on your setup)**
   - Deploys to NAS/VPS with proper environment setup
   - Handles container lifecycle management
   - Manages log rotation and retention
   - Performs cleanup of old images and containers

#### Environment Configuration

The deployment process automatically sets up:

- Server configuration
- Database connections
- JWT settings
- Logging configuration

### Best Practices

1. **Version Management**

   - Always use release candidate branches for version updates
   - Follow semantic versioning principles
   - Use pre-release tags for testing

2. **Deployment**

   - Ensure all tests pass before deployment
   - Monitor deployment logs for issues
   - Use the provided health checks

3. **Rollback**
   - Previous versions are preserved in Docker registry
   - Quick rollback possible using specific version tags

## 🤝 Contributing

1. Fork the project
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT
