# Alps-CI

A CI dashboard that displays workflows from GitHub Actions for multiple repositories.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Architecture**: Clean Architecture

## Project Structure

```
/src
  /domain         - Pure domain logic (no framework dependencies)
  /use-cases      - Application use cases (orchestration layer)
  /infrastructure - Framework and external dependencies
/app              - Next.js App Router pages and layouts
/data             - Configuration and cache storage
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your system

### Installation

```bash
bun install
```

### Development

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build

```bash
bun run build
```

### Production

```bash
bun start
```

## Features

- Create and manage Builds (GitHub Actions workflow monitors)
- View workflow statistics and health metrics
- Display workflow execution history with charts
- Cache GitHub API data with configurable expiration
- Clean Architecture for maintainability and testability

## License

Private project

