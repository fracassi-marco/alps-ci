# Alps-CI Specification

## Overview
Alps-CI is a CI dashboard that displays workflows from GitHub Actions for multiple repositories, organized as "Builds". Users can define Builds, each with custom Selectors, and view statistics and metadata for each Build. The project uses Bun, Next.js (App Router), TypeScript, TailwindCSS, and follows Clean Architecture. Data is retrieved from GitHub via the GraphQL API and cached per Build. Configuration is stored in a single JSON file.

---

## Key Concepts
- **Build**: A set of workflows executed in a specific repository, identified by user-defined Selectors.
- **Selector**: A filter for workflows, which can be a Git tag pattern (e.g., `vX.Y.Z`), a Git branch (e.g., `main`), or a GitHub Action workflow name (e.g., `CI-Workflow`). Selectors are entered as custom patterns or free text and can be mixed within a Build.

---

## User Experience
- The dashboard is open to anyone who can access the deployed instance (no authentication).
- On first load (no Builds defined), display a welcome message and onboarding instructions, plus an "Add Build" button.
- Users can add, edit, and delete Builds.
- When adding a Build, the user specifies:
  - Name
  - Organization
  - Repository name
  - One or more Selectors (custom pattern/free text, mixed types allowed)
  - Personal Access Token (PAT, stored in plain text)
  - Cache expiration threshold (in minutes, min 1, max 1440)
- All Builds are stored in a single JSON file at `data/config.json` as an array of Build objects (no global settings).
- When deleting a Build, prompt for confirmation, then back up `config.json` (unlimited backups with timestamps) before writing the new file. Backups are managed manually.
- Editing a Build (e.g., updating PAT or Selectors) immediately re-fetches and updates statistics and cache.

---

## Build Card UI
Each Build appears as a full-screen card with:
- Number of workflow executions in the last 7 days
- Number of successful workflow executions in the last 7 days
- Number of failed workflow executions in the last 7 days
- Colored health badge (successful runs / total runs, standard color thresholds)
- Last tag of the repository (most recent, considers all tags)
- Bar chart: last 7 days, height = number of successful executions per day (only successes shown)
- Links to the last 3 workflow runs (open in new tab)
- Additional metadata as appropriate (e.g., workflow run durations)
- Error display if PAT is invalid, with CTA to update PAT
- Option to delete the Build (with confirmation and backup)
- Manual refresh button for statistics

---

## Technical Specifications
- **Stack**: Bun, Next.js (latest, App Router), TypeScript, TailwindCSS
- **Architecture**: Clean Architecture under `/src`:
  - `domain`: Pure domain logic (no framework dependencies)
  - `use-cases`: Application orchestration layer
  - `infrastructure`: Framework/external dependencies (e.g., FileSystemRepository for JSON)
- **GitHub API**: Use GraphQL API for all data retrieval
- **Caching**: Use Build-defined cache expiration threshold (in minutes, 1–1440) for backend GitHub data caching
- **Commits**: Use https://gitmoji.dev/ for commit emojis, max 128 chars per message
- **Docker**: Deploy in a Docker container using standard best practices for Next.js/Bun (minimal secure base image, proper env vars, expose default port)

---

## Configuration File
- Path: `data/config.json`
- Format: Array of Build objects
- No global settings
- Unlimited backups with timestamps (e.g., `config.json.20260104T120000.bak`)
- Restoring from backup is manual (outside UI)

---

## Error Handling
- If a Build’s PAT is invalid, display an error on the Build card with a CTA to update the PAT.

---

## UI/UX Details
- Welcome/onboarding instructions if no Builds exist
- All statistics are refreshed only on manual trigger (except after editing a Build, which triggers immediate refresh)
- No user authentication or access control

---

## Extensibility
- The system is designed to allow for future enhancements, such as additional metadata, export options, or UI improvements.

