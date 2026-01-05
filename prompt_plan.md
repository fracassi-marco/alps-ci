# Blueprint and Prompt Plan for Alps-CI

## 1. Foundation & Project Setup

### 1.1. Initialize Project
```
Prompt: Initialize a new Bun + Next.js (App Router) project with TypeScript and TailwindCSS. Set up the recommended folder structure for Clean Architecture under /src: domain, use-cases, infrastructure. Add a .gitignore and ensure the project builds and runs locally.
```

### 1.2. Docker & Basic CI
```
Prompt: Add a Dockerfile using best practices for Bun + Next.js. Expose the default port and ensure the app runs in a container. Add a simple GitHub Actions workflow to build and test the app in CI.
```

---

## 2. Domain Layer

### 2.1. Define Core Domain Models
```
Prompt: In /src/domain, define TypeScript types/interfaces for Build, Selector, and BuildStats. Include validation logic for cache expiration and selector types.
```

### 2.2. Unit Tests for Domain Models
```
Prompt: Write unit tests for the domain models and validation logic using your preferred test runner. Ensure all edge cases are covered.
```

---

## 3. Infrastructure Layer

### 3.1. File System Repository
```
Prompt: In /src/infrastructure, implement a FileSystemRepository for reading/writing the array of Build objects to data/config.json. Add logic for timestamped backups before writes.
```

### 3.2. Unit Tests for File System Repository
```
Prompt: Write unit tests for the FileSystemRepository, including backup logic and error handling.
```

---

## 4. Use-Cases Layer

### 4.1. Build Management Use Cases
```
Prompt: In /src/use-cases, implement use cases for: listing Builds, adding a Build (with validation), editing a Build, deleting a Build (with backup), and restoring from backup (manual, not exposed in UI).
```

### 4.2. Unit Tests for Use Cases
```
Prompt: Write unit tests for all Build management use cases, including edge cases and error scenarios.
```

---

## 5. GitHub Integration

### 5.1. GitHub GraphQL Client
```
Prompt: In /src/infrastructure, implement a GitHub GraphQL client that authenticates with a PAT and fetches workflow runs, tags, and workflow metadata. Handle errors for invalid tokens.
```

### 5.2. Caching Layer
```
Prompt: Implement a caching layer that respects each Build's cache expiration threshold. Ensure cache is invalidated and refreshed as specified.
```

### 5.3. Unit Tests for GitHub Client & Caching
```
Prompt: Write unit tests for the GitHub client and caching logic, including token errors and cache expiry.
```

---

## 6. UI: Onboarding & Build Management

### 6.1. Welcome & Onboarding
```
Prompt: Implement a welcome screen with onboarding instructions and an "Add Build" button, shown when no Builds exist.
```

### 6.2. Add/Edit Build Form
```
Prompt: Implement a form for adding and editing Builds, supporting all required fields and validation. Allow multiple Selectors (custom/free text, mixed types).
```

### 6.3. Build List & Deletion
```
Prompt: Display a list of Build cards. Implement deletion with confirmation and trigger config.json backup. Remove the card from the UI after deletion.
```

---

## 7. UI: Build Card & Statistics

### 7.1. Build Card Layout
```
Prompt: Design a full-screen Build card showing all required statistics, health badge, last tag, bar chart (successes only), and links to last 3 runs (open in new tab). Add a manual refresh button.
```

### 7.2. Error Handling in UI
```
Prompt: Display errors on the Build card if the PAT is invalid, with a CTA to update the PAT.
```

### 7.3. Additional Metadata
```
Prompt: Add workflow run durations and any other useful metadata to the Build card.
```

---

## 8. Integration & Wiring

### 8.1. Wire Use Cases to UI
```
Prompt: Connect the UI to the use-cases and infrastructure layers. Ensure all actions (add, edit, delete, refresh) update the UI and config.json as expected.
```

### 8.2. End-to-End Testing
```
Prompt: Write end-to-end tests for the main user flows: onboarding, adding/editing/deleting Builds, error handling, and statistics refresh.

Note: E2E tests are for local development only and are NOT run in CI/CD pipelines.
```

---

## 9. Finalization

### 9.1. Polish & Documentation
```
Prompt: Polish the UI with TailwindCSS, add README documentation, and ensure all code follows best practices. Commit using gitmoji and keep messages under 128 chars.
```

---

# Review & Iteration

- Each step is small, testable, and builds on the previous.
- No orphaned code: every module is integrated before moving on.
- Early and frequent testing is prioritized.
- Prompts are ready for a code-generation LLM to implement in a test-driven, incremental manner.

