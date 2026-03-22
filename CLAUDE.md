# SaaSFoundry

CLI tool that scaffolds production-ready SaaS projects (NestJS + React + PostgreSQL + Docker).

## Tech Stack

- **CLI**: Node.js, Commander, Inquirer, TypeScript
- **Generated Backend**: NestJS 11, Prisma 7 (driver adapters + PrismaPg), PostgreSQL 16, JWT + Passport, Zod 4
- **Generated Frontend**: React 19, React Router v7, Vite 7, TailwindCSS 4, Radix UI (unified), ShadCN UI, React Query, React Hook Form + Zod 4, i18next
- **Infra**: Docker multi-stage builds, Nginx, `saasfoundry-network`

## Project Structure

```
src/
├── commands/         # CLI commands (new.ts, update.ts)
├── prompts/          # Inquirer prompt definitions (project.prompts.ts, update.prompts.ts)
├── builders/         # Project scaffolding builders (api, web, monorepo, dev-services, db, s3)
├── installers/       # Reusable module installers (email, storage, analytics)
├── runners/          # Post-setup runners (database, s3, server, terminal)
├── types.ts          # All interfaces and path constants
├── utils.ts          # Utility functions
└── index.ts          # CLI entrypoint (Commander)
scaffolds/
├── blueprints/       # Base templates (api/, web/, db/, s3/)
└── overlays/         # Topology overrides + optional module overlays
    ├── monorepo/     # Monorepo-specific overrides (root/, api/, web/)
    ├── multirepo/    # Multirepo-specific overrides (api/, web/)
    └── modules/      # Optional feature modules (email/, storage/, analytics/)
bin/                  # CLI entrypoint (sf.js)
scripts/              # Version management (tag-manager.sh)
```

## CLI Commands

- `sf new` — Create a new SaaSFoundry project (src/commands/new.ts)
- `sf update` — Add modules to an existing project (src/commands/update.ts)

### Dev Commands

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
- Node.js >= 20.19.0 required (Prisma 7 + Vite 7)

---

## Module Architecture (CRITICAL — Read when modifying SaaSFoundry)

SaaSFoundry uses a **module system** that allows features to be added during initial project generation (`sf new`) OR later via `sf update`. Understanding this architecture is essential when adding
new modules or modifying existing ones.

### How Modules Work

Each module follows the same pattern:

1. **Blueprint code** contains TODO markers (commented-out code) in `scaffolds/blueprints/`
2. **Overlay files** provide the module's source code in `scaffolds/overlays/modules/`
3. **Installers** (`src/installers/`) contain the logic to activate a module (copy overlays, uncomment markers, update env vars)
4. **Builders** (`src/builders/`) call installers during `sf new`
5. **Update command** (`src/commands/update.ts`) calls the same installers during `sf update`

### TODO Marker Pattern

Blueprint files use TODO markers to hold module-specific code in a disabled state:

```typescript
// In blueprint source files:
// TODO mailer-service-active: import { EmailService } from './email.service'
// TODO storage-service-active: import { StorageModule } from '@modules/storage/storage.module'
// TODO monitoring-active: import { initAnalytics } from '@/lib/analytics/analytics'
```

When a module is installed, the installer removes the `// TODO <marker>: ` prefix, activating the code:

```typescript
// After installation:
import { EmailService } from './email.service'
```

**Marker naming convention**: `// TODO <module-name>-active: `

### Current Modules

| Module               | Installer                               | Marker                   | Overlay Path                  | Affects   |
| -------------------- | --------------------------------------- | ------------------------ | ----------------------------- | --------- |
| **MailerSend Email** | `src/installers/email.installer.ts`     | `mailer-service-active`  | `overlays/modules/email/`     | API only  |
| **S3 Storage**       | `src/installers/storage.installer.ts`   | `storage-service-active` | `overlays/modules/storage/`   | API + Web |
| **Umami Analytics**  | `src/installers/analytics.installer.ts` | `monitoring-active`      | `overlays/modules/analytics/` | Web only  |

### Module Installer Responsibilities

Each installer in `src/installers/` is **fully self-contained** and handles:

1. **Copy overlay files** — Copy module source code from `scaffolds/overlays/modules/` to the target app
2. **Uncomment TODO markers** — Remove `// TODO <marker>: ` prefixes in blueprint files
3. **Update imports/providers** — Register the module in NestJS modules, update imports
4. **Add dependencies** — Modify `package.json` to add required npm packages
5. **Update .env files** — Uncomment and set environment variables in `.env` and `.env.test`
6. **Update CI/CD** — Modify GitHub Actions deployment files if needed

### Manifest (.saasfoundry.json)

Generated projects carry a `.saasfoundry.json` manifest at the project root:

```json
{
  "version": "1.0.0-beta",
  "generatedAt": "2026-03-22T...",
  "structure": "monorepo",
  "projectName": "my-project",
  "modules": {
    "emailService": "none",
    "s3Setup": "manual",
    "dbSetup": "docker",
    "includeAnalytics": false
  }
}
```

- **version**: SaaSFoundry CLI version used to generate the project
- **structure**: `monorepo` or `multirepo`
- **modules**: Records which modules are installed and their configuration
- **No secrets are stored** — only module choices (none/mailersend, manual/docker/credentials, true/false)

The manifest is:

- Created during `sf new` (in `src/commands/new.ts`)
- Read and updated during `sf update` (in `src/commands/update.ts`)
- Defined by `SaaSFoundryManifest` interface in `src/types.ts`

### Files Affected by Each Module

#### Email Module (MailerSend)

| File (in API app)                                             | Change                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------ |
| `src/modules/email/services/mailersend.service.ts`            | **Copied** from overlay                                |
| `src/modules/auth/services/auth.service.ts`                   | TODO markers uncommented                               |
| `src/modules/invitation/services/invitation.service.ts`       | TODO markers uncommented                               |
| `src/configs/env/services/env.service.ts`                     | TODO markers uncommented                               |
| `src/modules/email/services/email.service.ts`                 | All comments uncommented, console.logs removed         |
| `src/modules/email/email.module.ts`                           | MailerSendService import + provider added              |
| `src/modules/email/tests/unit/email.service.disabled-spec.ts` | Renamed to `.spec.ts`                                  |
| `.env`                                                        | `MAILERSEND_*` vars uncommented + set                  |
| `.env.test`                                                   | `MAILERSEND_*` vars uncommented + set with test values |
| `.github/workflows/deployment.yml`                            | `MAILERSEND_*` env vars added                          |

#### Storage Module (S3)

| File (in API app)                                                  | Change                                         |
| ------------------------------------------------------------------ | ---------------------------------------------- |
| `src/modules/storage/`                                             | **Copied** from overlay (entire directory)     |
| `src/configs/env/services/env.service.ts`                          | TODO markers uncommented                       |
| `src/app.module.ts`                                                | TODO markers uncommented                       |
| `src/modules/organizations/organizations.module.ts`                | TODO markers uncommented                       |
| `src/modules/organizations/controllers/organization.controller.ts` | TODO markers uncommented                       |
| `src/modules/organizations/services/organization.service.ts`       | TODO markers uncommented                       |
| `package.json`                                                     | `@aws-sdk/client-s3` + `@types/multer` added   |
| `.env`                                                             | `S3_*` vars uncommented + set                  |
| `.env.test`                                                        | `S3_*` vars uncommented + set with test values |

| File (in Web app) | Change                                 |
| ----------------- | -------------------------------------- |
| `.env`            | `VITE_STORAGE_ENABLED` set to `"true"` |

#### Analytics Module (Umami)

| File (in Web app)    | Change                                                         |
| -------------------- | -------------------------------------------------------------- |
| `src/lib/analytics/` | **Copied** from overlay                                        |
| `src/main.tsx`       | TODO markers uncommented (import + initAnalytics call)         |
| `.env`               | `VITE_ANALYTICS_URL` + `VITE_ANALYTICS_WEBSITE_ID` uncommented |

### Adding a New Module — Checklist

When adding a new optional module to SaaSFoundry, follow these steps:

1. **Create overlay files** in `scaffolds/overlays/modules/<module-name>/`

   - These are the module's source files that get copied to the target app

2. **Add TODO markers** in blueprint files (`scaffolds/blueprints/api/` or `web/`)

   - Use pattern: `// TODO <module-name>-active: <code>`
   - Add markers for imports, function calls, module registrations

3. **Add env vars** (commented out) in blueprint `.env` and `.env.test` files

   - Pattern: `# VAR_NAME="default_value"`

4. **Create installer** in `src/installers/<module-name>.installer.ts`

   - Export a single `install<ModuleName>Module(params)` function
   - Handle: copy overlays, uncomment markers, update env files, add dependencies
   - Must be fully self-contained (callable from both `sf new` and `sf update`)

5. **Update types** in `src/types.ts`

   - Add module option to `Answers` interface
   - Add module option to relevant `Create*Params` interface
   - Add module field to `SaaSFoundryManifest.modules`

6. **Update prompts** in `src/prompts/project.prompts.ts`

   - Add prompt for the new module during `sf new`

7. **Call installer from builder** in `src/builders/api.builder.ts` or `web.builder.ts`

   - Conditionally call the installer based on user's choice

8. **Update `sf new` command** in `src/commands/new.ts`

   - Pass the new option to the builder
   - Include in manifest generation

9. **Update `sf update` support**

   - Add module detection in `src/prompts/update.prompts.ts` → `getAvailableModules()`
   - Add credential prompt function if the module needs configuration
   - Add installation block in `src/commands/update.ts`

10. **Update this CLAUDE.md**
    - Add module to "Current Modules" table
    - Add "Files Affected" section for the new module
