# Contributing to Smart POS System

Thank you for your interest in contributing to the Smart POS & Inventory Management System! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Reporting Issues](#reporting-issues)

## 🤝 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the project's coding standards
- Communicate clearly and professionally

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **npm** or **yarn** package manager
- **Git** for version control
- **MongoDB** (for backend development)
- **Android Studio** / **Xcode** (for mobile development)

### Initial Setup

1. **Fork the repository** and clone your fork:
   ```bash
   git clone https://github.com/your-username/POS.git
   cd POS
   ```

2. **Install dependencies** for each platform:
   ```bash
   # Backend
   cd backend
   npm install
   
   # Web
   cd ../web
   npm install
   
   # Mobile
   cd ../mobile
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env` in each directory (if available)
   - Configure database connections, API keys, etc.

4. **Start development servers**:
   ```bash
   # Backend (from backend/)
   npm run dev
   
   # Web (from web/)
   npm run dev
   
   # Mobile (from mobile/)
   npm start
   ```

## 🔄 Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - New features
- `bugfix/bug-name` - Bug fixes
- `hotfix/issue-name` - Critical production fixes

### Creating a Branch

```bash
# Create and switch to a new feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b bugfix/your-bug-name
```

### Making Changes

1. **Choose the right directory**:
   - Backend changes → `backend/src/`
   - Web changes → `web/src/`
   - Mobile changes → `mobile/src/`

2. **Follow the module structure**:
   - Each module should have: `model`, `controller`, `service`, `routes`, `validators`
   - Keep components reusable and well-documented

3. **Write clear, self-documenting code**:
   - Use meaningful variable and function names
   - Add comments for complex logic
   - Follow existing code patterns

## 📝 Coding Standards

### Backend (Node.js/Express)

- Use **ES6+** syntax
- Follow **async/await** pattern (avoid callbacks)
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes and models
- Keep functions small and focused (single responsibility)
- Use **JSDoc** comments for functions

```javascript
/**
 * Creates a new product in the system
 * @param {Object} productData - Product information
 * @returns {Promise<Object>} Created product
 */
async function createProduct(productData) {
  // Implementation
}
```

### Web (Vue.js)

- Use **TypeScript** where applicable
- Follow **Vue 3 Composition API** patterns
- Use **kebab-case** for component files
- Use **PascalCase** for component names in templates
- Keep components small and focused
- Use **scoped styles** or CSS modules

### Mobile (React Native)

- Use **TypeScript**
- Follow **React Native** best practices
- Use **camelCase** for variables and functions
- Use **PascalCase** for components
- Keep screens and components modular
- Use **React Hooks** for state management

### General Guidelines

- **Indentation**: Use 2 spaces (no tabs)
- **Line length**: Maximum 100 characters
- **Quotes**: Use single quotes for JavaScript, double quotes for JSX/TSX
- **Semicolons**: Always use semicolons
- **Trailing commas**: Use in arrays and objects

## 📤 Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(backend): add product inventory tracking

- Implement stock level monitoring
- Add low stock alerts
- Update inventory model

Closes #123
```

```
fix(web): resolve POS calculation error

Fixed issue where discounts were not applied correctly
to the final total in the cashier interface.

Fixes #456
```

## 🔀 Pull Request Process

1. **Update your branch**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout your-branch
   git rebase develop
   ```

2. **Ensure your code works**:
   - Run tests: `npm test`
   - Check linting: `npm run lint`
   - Test manually in development environment

3. **Create a Pull Request**:
   - Use a clear, descriptive title
   - Reference related issues: `Closes #123`
   - Provide a detailed description of changes
   - Include screenshots for UI changes
   - List any breaking changes

4. **PR Checklist**:
   - [ ] Code follows project style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated (if needed)
   - [ ] No new warnings generated
   - [ ] Tests added/updated (if applicable)
   - [ ] All tests pass

5. **Respond to feedback**:
   - Address review comments promptly
   - Make requested changes
   - Keep discussions constructive

## 🏗️ Project Structure

### Backend Modules

Each module in `backend/src/modules/` should follow this structure:

```
module-name/
├── module.model.js       # Database schema
├── module.controller.js  # Request handlers
├── module.service.js     # Business logic
├── module.routes.js      # API routes
├── module.validators.js  # Input validation
├── module.helpers.js     # Utility functions
└── index.js              # Module exports
```

### Web Pages

Organize pages by user role in `web/src/pages/`:

```
pages/
├── cashier/     # Cashier POS interface
├── manager/     # Manager dashboard
├── owner/       # Owner pages
├── admin/       # Admin pages
└── storekeeper/ # Store keeper pages
```

### Mobile Screens

Organize screens in `mobile/src/screens/`:

```
screens/
├── auth/        # Authentication screens
├── pos/         # POS interface
├── dashboard/   # Dashboard screens
└── settings/    # Settings screens
```

## 🧪 Testing

### Backend Testing

```bash
cd backend
npm test
```

- Write unit tests for services
- Write integration tests for API endpoints
- Aim for >80% code coverage

### Web Testing

```bash
cd web
npm test
```

- Write component tests
- Write integration tests for user flows
- Test responsive design

### Mobile Testing

```bash
cd mobile
npm test
```

- Write unit tests for utilities
- Write component tests
- Test on both iOS and Android

## 🐛 Reporting Issues

### Before Reporting

1. Check existing issues to avoid duplicates
2. Verify the issue exists in the latest version
3. Gather relevant information

### Issue Template

```markdown
**Description**
Clear description of the issue

**Steps to Reproduce**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., Windows 10]
- Node version: [e.g., 20.x]
- Browser: [e.g., Chrome 120] (for web)
- Device: [e.g., Android 13] (for mobile)

**Screenshots**
If applicable, add screenshots

**Additional Context**
Any other relevant information
```

## 📚 Additional Resources

- [Project README](../README.md)
- [API Documentation](./API.md) (if available)
- [Architecture Documentation](./architecture.md) (if available)

## ❓ Questions?

If you have questions about contributing:

1. Check existing documentation
2. Search closed issues/PRs
3. Open a discussion or issue
4. Contact maintainers

---

Thank you for contributing to Smart POS System! 🎉