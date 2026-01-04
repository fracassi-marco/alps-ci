# Alps-CI Project Checklist

## 1. Foundation & Project Setup
- [ ] Initialize Bun + Next.js (App Router) project with TypeScript and TailwindCSS
- [ ] Set up Clean Architecture folder structure under /src (domain, use-cases, infrastructure)
- [ ] Add .gitignore
- [ ] Ensure project builds and runs locally
- [ ] Add Dockerfile using best practices for Bun + Next.js
- [ ] Expose default port in Dockerfile
- [ ] Ensure app runs in a container
- [ ] Add GitHub Actions workflow for build and test

## 2. Domain Layer
- [ ] Define TypeScript types/interfaces for Build, Selector, BuildStats in /src/domain
- [ ] Implement validation logic for cache expiration and selector types
- [ ] Write unit tests for domain models and validation logic (cover edge cases)

## 3. Infrastructure Layer
- [ ] Implement FileSystemRepository in /src/infrastructure for reading/writing Build objects to data/config.json
- [ ] Add logic for timestamped backups before writes
- [ ] Write unit tests for FileSystemRepository, including backup logic and error handling

## 4. Use-Cases Layer
- [ ] Implement use cases in /src/use-cases for:
  - [ ] Listing Builds
  - [ ] Adding a Build (with validation)
  - [ ] Editing a Build
  - [ ] Deleting a Build (with backup)
  - [ ] Restoring from backup (manual, not exposed in UI)
- [ ] Write unit tests for all Build management use cases (cover edge cases and errors)

## 5. GitHub Integration
- [ ] Implement GitHub GraphQL client in /src/infrastructure (authenticate with PAT, fetch workflow runs, tags, metadata)
- [ ] Handle errors for invalid tokens
- [ ] Implement caching layer respecting each Build's cache expiration threshold
- [ ] Ensure cache is invalidated and refreshed as specified
- [ ] Write unit tests for GitHub client and caching logic (token errors, cache expiry)

## 6. UI: Onboarding & Build Management
- [ ] Implement welcome screen with onboarding instructions and "Add Build" button (shown when no Builds exist)
- [ ] Implement form for adding/editing Builds (all fields, validation, multiple Selectors)
- [ ] Display list of Build cards
- [ ] Implement deletion with confirmation and config.json backup
- [ ] Remove Build card from UI after deletion

## 7. UI: Build Card & Statistics
- [ ] Design full-screen Build card with:
  - [ ] Number of workflow executions in last 7 days
  - [ ] Number of successful workflow executions in last 7 days
  - [ ] Number of failed workflow executions in last 7 days
  - [ ] Colored health badge (standard thresholds)
  - [ ] Last tag (most recent, all tags)
  - [ ] Bar chart (last 7 days, successes only)
  - [ ] Links to last 3 workflow runs (open in new tab)
  - [ ] Additional metadata (e.g., workflow run durations)
  - [ ] Error display if PAT is invalid, with CTA to update
  - [ ] Option to delete Build (confirmation, backup)
  - [ ] Manual refresh button for statistics

## 8. Integration & Wiring
- [ ] Connect UI to use-cases and infrastructure layers
- [ ] Ensure all actions (add, edit, delete, refresh) update UI and config.json as expected
- [ ] Write end-to-end tests for main user flows:
  - [ ] Onboarding
  - [ ] Adding/Editing/Deleting Builds
  - [ ] Error handling
  - [ ] Statistics refresh

## 9. Finalization
- [ ] Polish UI with TailwindCSS
- [ ] Add README documentation
- [ ] Ensure all code follows best practices
- [ ] Commit using gitmoji and keep messages under 128 chars

## Review & Iteration
- [ ] Review each step for completeness and correctness
- [ ] Ensure no orphaned code; all modules integrated
- [ ] Prioritize early and frequent testing
- [ ] Iterate as needed for improvements

