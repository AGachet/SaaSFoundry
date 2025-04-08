# 🚀 Frontend

<div align="center">
  <img src="https://img.shields.io/badge/React-19-blue" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.0-orange" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-blue" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Playwright-1.51-green" alt="Playwright" />
</div>

## ✨ Overview

Welcome to your new SaaSFoundry frontend project! This template provides a modern, production-ready frontend setup built with the latest technologies and best practices.

## 🛠️ Tech Stack

- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite 6
- **Styling:** TailwindCSS + ShadCN Components
- **State Management:** React Query + Zustand
- **Form Handling:** React Hook Form + Zod
- **Testing:** Playwright for E2E testing
- **Code Quality:** ESLint + Prettier
- **Internationalization:** i18next
- **Routing:** React Router v7

## 🚀 Quick Start

### Prerequisites

- Node.js (version specified in `.nvmrc`)
- npm or yarn
- nvm (Node Version Manager)

### Installation ezez

1. **Install Node.js version**

   ```bash
   nvm use
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
src/
├── assets/      # Static assets
├── components/  # Reusable UI components
├── hooks/       # Custom React hooks
├── lib/         # Utility functions and configurations
├── locales/     # i18n translation files
├── pages/       # Page components
├── router/      # Routing configuration
└── utils/       # Helper functions
```

## 🧪 Testing

- **E2E Tests:** `npm run test:e2e`
- **E2E UI Mode:** `npm run test:e2e:ui`
- **Debug Tests:** `npm run test:e2e:debug`
- **Full Test Suite:** `npm run test:full`

## 🔧 Development Tools

- **Code Formatting:** `npm run format`
- **Linting:** `npm run lint`
- **Type Checking:** `npm run type-check`
- **Build:** `npm run build`
- **Preview:** `npm run preview`

## 🔐 Environment Setup

Create a `.env` file with:

```env
VITE_API_URL=your_api_url
VITE_APP_NAME=your_app_name
```

## 📚 Documentation

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TailwindCSS Documentation](https://tailwindcss.com)
- [ShadCN Documentation](https://ui.shadcn.com)
- [Playwright Documentation](https://playwright.dev)

## 🔒 Git Hooks

This project uses Husky to manage Git hooks. The hooks are configured to ensure code quality before each commit.

### Commit Message Format

All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>[#Ticket number or #no-ticket]): <description>

[optional body]

[optional footer]
```

Where:

- `type`: feat, fix, docs, style, refactor, perf, test, chore, build, ci, revert
- `scope`: optional, describes the part of the codebase affected
- `description`: brief description of the change

Examples:

```bash
# Feature commit
git commit -m "feat(#24): add OAuth2 authentication"

# Bug fix
git commit -m "fix(#16): resolve CORS issues in production"

# Documentation update
git commit -m "docs(#2): add deployment instructions"
```

### Release Management

The project uses a release candidate (RC) workflow for version management. To create a new release:

1. Create a release candidate branch:

```bash
git checkout -b rc-name
```

2. And push:

```bash
git push
```

3. When you push the branch, the tag manager will:
   - Detect the RC branch
   - Prompt you steps to update the version
   - Create a new git tag
   - Push the tag to the repository
   - On pull request merge, the GitHub deployment workflow will push the code base in the new tag

### Bypassing Hooks

In some cases, you might need to bypass Git hooks. To do this, use the `--no-verify` flag:

```bash
# Example for a commit
git commit -m "message" --no-verify

# Example for a push
git push --no-verify
```

⚠️ **Warning**: Use `--no-verify` with caution and only when absolutely necessary. The hooks are there to maintain code quality.

## 🤝 Contributing

This project is part of the SaaSFoundry ecosystem. For contributing guidelines, please refer to the main SaaSFoundry documentation.

## 📜 License

MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ by the SaaSFoundry team</sub>
</div>
