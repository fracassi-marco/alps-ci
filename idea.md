Ask me one question at a time so we can develop a thorough, step-by-step spec for this idea. Each question should build on my previous answers, and our end goal is to have a detailed specification I can hand off to a developer. Let’s do this iteratively and dig into every relevant detail. Remember, only one question at a time.

Here’s the idea:
I want to create a CI dashboard (named Alps-CI) that displays workflows from GitHub Actions.

Some definitions:
* Build: set of workflows executed in a specific repository in the GitHub actions identified by some Selectors
* Selector: a selector can be a Git Tag pattern (e.g. vX.Y.Z), a Git branch (e.g. main), or a GitHub Action workflow name (e.g. CI-Workflow), it's used to filter the workflows executed in that repository.

A user can define one or more Builds. The UI will then have a button to add a Build.
When adding a Build, they will need to specify some parameters:
* name
* organization
* repository name
* one or more Selectors
* Personal Access Token (PAT) 
* Cache expiration threshold
This configuration will be saved in a JSON file system.

Once a Build is created, a full-screen card with some statistics related to that Build should appear on the dashboard:
* number of workflow executions in the last 7 days
* number of successful workflow executions in the last 7 days
* number of failed workflow executions in the last 7 days
* a colored badge with the Build's health expressed as successful runs / total runs
* last tag of the repository if it has at least one
* a bar chart of the last 7 days, with bar representing a day and the height representing the number of successful executions for that day.

Some more technical specifications:
* Use Bun
* Use Next.js latest version with App Router
* Use TypeScript
* Use TailwindCSS for styling
* The project must follow a Clean Architecture with a structure under /src made with:
  * domain: Pure domain logic (no framework dependencies)
  * use-cases: Application use cases (orchestration layer)
  * infrastructure: Framework and external dependencies (e.g., FileSystemRepository, which saves and reads the JSON)
* To retrieve data from GitHub, you must use the GraphQL API
* To commit all changes, use https://gitmoji.dev/ to identify an emoji 
* The commit message must be max 128 chars
* Deploy the project in a Docker container
* Use Build defined cache expiration threshold to cache the GitHub data in the backend
