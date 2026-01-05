# Contributing to Alps-CI 🏔️

Thank you for your interest in contributing to Alps-CI! This document provides guidelines and instructions for contributing.

---

## 🚀 Getting Started

### Prerequisites
- Bun 1.0 or later
- Node.js 18+ (for compatibility)
- Git
- A GitHub account
- Basic knowledge of TypeScript, React, and Next.js

### Setting Up Development Environment

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/alps-ci.git
   cd alps-ci
   ```

3. **Install dependencies**
   ```bash
   bun install
   ```

4. **Run the development server**
   ```bash
   bun run dev
   ```

5. **Run tests**
   ```bash
   # Unit tests
   bun test

   # E2E tests
   bun run test:e2e
   ```

---

## 📋 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help maintain a welcoming environment

---

## 🎯 How to Contribute

### Reporting Bugs

1. **Search existing issues** to avoid duplicates
2. **Create a new issue** with:
   - Clear title
   - Detailed description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if applicable)
   - Environment details (OS, Bun version, etc.)

### Suggesting Features

1. **Check existing feature requests**
2. **Create a new issue** with:
   - Clear use case
   - Detailed description
   - Potential implementation approach
   - Examples or mockups (if applicable)

### Submitting Pull Requests

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Follow the project's code style
   - Write/update tests
   - Update documentation

3. **Test your changes**
   ```bash
   bun test
   bun run test:e2e
   bun tsc --noEmit
   bun run lint
   ```

4. **Commit with gitmoji**
   ```bash
   git commit -m "✨ Add amazing feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Clear title and description
   - Link related issues
   - Include screenshots/videos if UI changes
   - Ensure all checks pass

---

## 🎨 Code Style

### TypeScript
- Use **strict mode**
- Prefer **interfaces** over types for objects
- Use **type inference** where possible
- Add **JSDoc comments** for public APIs

### React
- Use **functional components** with hooks
- Keep components **small and focused**
- Extract **reusable logic** into custom hooks
- Use **TypeScript** for props

### File Organization
```
feature/
├── Component.tsx       # Main component
├── Component.test.ts   # Tests
└── utils.ts            # Helper functions
```

### Naming Conventions
- **Components**: PascalCase (`BuildCard.tsx`)
- **Files**: camelCase or kebab-case
- **Variables**: camelCase (`buildStats`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_CACHE_MINUTES`)
- **Types/Interfaces**: PascalCase (`BuildStats`)

---

## 🧪 Testing

### Unit Tests
- Test **all business logic**
- Test **edge cases** and error scenarios
- Use **descriptive test names**
- Aim for **100% coverage** of critical paths

```typescript
test('should validate build name', () => {
  const result = validateBuildName('');
  expect(result.isValid).toBe(false);
  expect(result.error).toBe('Build name is required');
});
```

### E2E Tests
- Test **complete user flows**
- Test **happy paths** and **error scenarios**
- Use **realistic data**
- Keep tests **isolated**

```typescript
test('should add a new build', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Build' }).click();
  // ... rest of test
});
```

---

## 📝 Commit Messages

Use [gitmoji](https://gitmoji.dev/) for semantic commits:

### Format
```
<emoji> <type>: <subject>

<body (optional)>
```

### Common Emojis
- ✨ `:sparkles:` - New feature
- 🐛 `:bug:` - Bug fix
- 📝 `:memo:` - Documentation
- 🎨 `:art:` - UI/styling improvements
- ♻️ `:recycle:` - Code refactoring
- ⚡ `:zap:` - Performance improvement
- ✅ `:white_check_mark:` - Adding tests
- 🔧 `:wrench:` - Configuration changes
- 🚀 `:rocket:` - Deployment
- 🔒 `:lock:` - Security fixes

### Examples
```bash
✨ Add support for multiple selectors
🐛 Fix cache expiration bug
📝 Update README with deployment instructions
♻️ Refactor BuildCard component
✅ Add e2e tests for build deletion
```

**Keep messages under 128 characters.**

---

## 🏗️ Architecture

### Clean Architecture Layers

1. **Domain** (`src/domain/`)
   - Pure TypeScript
   - No external dependencies
   - Business logic and rules

2. **Use Cases** (`src/use-cases/`)
   - Application logic
   - Orchestrate domain and infrastructure
   - Independent of frameworks

3. **Infrastructure** (`src/infrastructure/`)
   - External dependencies
   - Database, APIs, file system
   - Implements interfaces from use cases

4. **UI** (`app/`)
   - React components
   - Next.js pages and API routes
   - Presentation layer

### Adding a New Feature

1. **Define domain models** (if needed)
2. **Implement use case** with tests
3. **Add infrastructure** (if needed)
4. **Create UI components**
5. **Wire everything together**
6. **Add e2e tests**

---

## 🔍 Code Review Process

### For Reviewers
- Review **within 48 hours**
- Be **constructive** and **specific**
- Suggest **improvements**, don't demand
- Approve when **tests pass** and **code quality** is good

### For Contributors
- **Respond to feedback** promptly
- **Ask questions** if unclear
- **Update PR** based on feedback
- Mark conversations as **resolved**

---

## 📚 Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [Playwright Docs](https://playwright.dev/)

### Learning
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [React Patterns](https://reactpatterns.com/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

---

## 🎯 Good First Issues

Look for issues labeled:
- `good first issue` - Great for newcomers
- `help wanted` - We'd love your help
- `documentation` - Improve docs
- `bug` - Fix something broken

---

## ❓ Questions?

- **GitHub Discussions** - For general questions
- **GitHub Issues** - For bugs and features
- **Pull Request Comments** - For code-specific questions

---

## 🙏 Thank You!

Every contribution helps make Alps-CI better. Whether it's:
- Fixing a typo
- Reporting a bug
- Suggesting a feature
- Submitting a PR

**We appreciate your time and effort!**

---

Happy Contributing! 🎉

