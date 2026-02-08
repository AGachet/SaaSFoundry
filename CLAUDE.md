# SaaSFoundry

CLI tool that scaffolds production-ready SaaS projects (NestJS + React + PostgreSQL + Docker).

## Tech Stack

- **CLI**: Node.js, Commander, Inquirer, TypeScript
- **Generated Backend**: NestJS 11, Prisma 6, PostgreSQL 16, JWT + Passport
- **Generated Frontend**: React 19, React Router v7, Vite, TailwindCSS, ShadCN UI, React Query, React Hook Form + Zod, i18next
- **Infra**: Docker multi-stage builds, Nginx, `saasfoundry-network`

## Project Structure

```
src/              # CLI source code (Commander-based)
scaffolds/
├── blueprints/   # Base templates (api/, web/, db/)
└── overlays/     # Optional modules & multi-repo configs
bin/              # CLI entrypoint (sf.js)
scripts/          # Version management (tag-manager.sh)
```

## Commands

- `npm run build` - Compile CLI
- `npm run dev` - Watch mode for CLI development
- `npm run format` - Prettier
- `npm run lint` - ESLint
- `npm run test:full` - Format + Lint + Type-check + Tests

### Generated API Commands

- `npm run dev` - NestJS watch mode
- `npm run test:unit` / `npm run test:e2e` - Tests
- `npm run test:full` - Format + Lint + Type-check + Tests
- `npm run db:update:dev` - Update dev database schema

### Generated Frontend Commands

- `npm run dev` - Vite dev server (port 5173)
- `npm run test:e2e` - Playwright tests
- `npm run test:full` - Format + Lint + Type-check + E2E

## Git Workflow

- Main branch: `master`
- **ALWAYS** use conventional commits: `<type>(#<ticket>): <description>`
- Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
- Scope (ticket number) is required by commitlint
- Max header length: 100 characters
- Husky enforces commit format and pre-push checks
- RC branches (`rc-*`) trigger automated version management

## Code Conventions

### Backend (scaffolds/blueprints/api/)

- Module pattern: `module.ts`, `controller.ts`, `service.ts`, `dto/*.dto.ts`, `tests/unit/*.spec.ts`, `tests/e2e/*.spec.ts`
- Path aliases: `@modules/*`, `@common/*`, `@configs/*`, `@/*`
- Prisma multi-file schemas in `prisma/schema/`
- Validation with class-validator + class-transformer
- Logging with Winston (daily rotation)

### Frontend (scaffolds/blueprints/web/)

- Pages in `src/pages/private/` and `src/pages/public/`
- Lazy-loaded routes with code splitting
- API hooks in `src/hooks/api/`
- UI components in `src/components/ui/` (ShadCN)
- Translations in `src/locales/` (YAML format)
- Path alias: `@/*` → `./src/*`

## Docker

- Dev database: `docker-compose.db.yml` (port 5435, in-memory tmpfs)
- External network: `docker network create saasfoundry-network`
- API health check: `GET /api/health`

## Important Context

- This is a **scaffold/generator** CLI — the code in `scaffolds/` is template code, not application code
- **NEVER** modify scaffold templates without considering the impact on generated projects
- Current version: 1.0.0-beta (npm package `saasfoundry`)
- Node.js >= 20.0.0 required
