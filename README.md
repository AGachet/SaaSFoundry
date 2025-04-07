# 🚀 SaaSFoundry

<div align="center">

[![SaaSFoundry](https://img.shields.io/badge/SaaSFoundry-2D3748?style=for-the-badge&logo=react&logoColor=white)](https://saasfoundry.diamondforge.fr)
[![Open Source](https://img.shields.io/badge/Open%20Source-2D3748?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AGachet/saasfoundry)
[![License](https://img.shields.io/badge/License-MIT-2D3748?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](LICENSE)

</div>

<div align="center">
  <!-- Logo placeholder -->
  <img src="docs/assets/logo.png" alt="SaaSFoundry Logo" width="200"/>
</div>

## 🌟 What is SaaSFoundry?

SaaSFoundry is a comprehensive, production-ready boilerplate for building modern SaaS applications. Born from the development of [BillMate Backend](https://github.com/AGachet/billmate-backend) and
[BillMate Frontend](https://github.com/AGachet/billmate-frontend), this open-source project provides a robust foundation for startups, freelancers, and developers looking to create scalable, secure,
and maintainable SaaS solutions in a TypeScript environment.

### 🎯 Key Features

- **Full-Stack Architecture**

  - [NestJS Backend](apps/api/README.md) with modular design
  - [React Frontend](apps/web/README.md) with optimized performance
  - Docker containerization
  - Automated deployment workflows

- **Security First**

  - JWT authentication system
  - Role-based access control (RBAC)
  - Granular permissions management
  - Secure API endpoints

- **Developer Experience**

  - Pre-built React hooks for business logic
  - Adaptive preloading and cache management
  - Comprehensive Git hooks for code quality
  - Database migration scripts

- **Production Ready**
  - Version management system
  - Automated deployment pipeline
  - Health monitoring
  - Logging and error tracking

## 🚀 Quick Start

1. **Create a new project using the CLI**

```bash
# Install the CLI globally
npm install -g @saasfoundry

# Create a new project
saasfoundry new
# or
sf new
```

2. **Choose your starting point**

- [Backend](scaffolds/blueprints/api/README.md/api/README.md)
- [Frontend](scaffolds/blueprints/web/README.md)

3. **Follow the detailed documentation** Each component has its own README with specific instructions and best practices.

## 🛠️ Project Structure

```
saasfoundry/
├── apps/
│   ├── api/          # NestJS Backend
│   └── web/          # React Frontend
├── docker/           # Docker configurations
├── docs/            # Project documentation
└── scripts/         # Utility scripts
```

## 💡 Why SaaSFoundry?

### For Startups

- **Time to Market**: Start with a production-ready foundation
- **Scalability**: Built for growth from day one
- **Cost-Effective**: Open-source solution with no licensing fees

### For Freelancers

- **Professional Grade**: Enterprise-level architecture
- **Flexibility**: Adapt to any business requirement
- **Maintainability**: Well-structured, documented codebase

### For Developers

- **Best Practices**: Follow industry standards
- **Developer Experience**: Streamlined workflow
- **Community**: Open-source collaboration

## 🤝 Contributing

We welcome contributions! Whether you're fixing bugs, improving documentation, or adding new features, your help is appreciated.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Message Guidelines

We follow conventional commits for better versioning and changelog generation. While you can bypass checks with `--no-verify`, we encourage following these guidelines:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

## 📚 Documentation

Detailed documentation is available at [saasfoundry.diamondforge.fr](https://saasfoundry.diamondforge.fr) (coming soon).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [SaaSFoundry](https://saasfoundry.com)
- Built with [NestJS](https://nestjs.com) and [React](https://reactjs.org)
- Powered by the open-source community

---

<div align="center">
  Made with ❤️ by the SaaSFoundry Team
</div>
