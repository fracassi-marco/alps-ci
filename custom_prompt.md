# New features 
Generate clear and concise prompt and add it to prompt_plan.md for the new requirements:
1. When there are 0 executions, the health value must be replaced with the inactive label. 
2. Under the build name, org/repository_name must be clickable and link to the repository URL on GitHub.
3. Add other statistics (UI harmonies): 
   * number of commits in the last 7 days
   * number of contributors in the last 7 days
   * last commit of the repository: message, date, contributor and hash
   * total number of commits
   * total number of contributors

# New feature: multi tenant
I'd like to transform Alps-CI into a multi-tenant product, where each tenant has its own dashboard.
A user from a company can then invite other colleagues to register to see the same dashboard.
Registration must be possible both with email/password and via Google Auth.
Use better-auth for authentication.
What cost-effective solution do you recommend for saving data?
Can you divide these new requirements into small, releasable tasks and write the related prompts in the promt_plan?

# Grid and list view
I want the builds to be visible both in grids (as is currently the case) and in lists.
There must be a view selection, and I want the setting to be saved in the user's browser so that it will be displayed the same way next time.
Update the specifications and generate prompts

# Saved PATs
I want admins and owners to have a section where they can save and edit PATs.
Each PAT will have an identifying name and can only be used within the organization to which it belongs.
It will be saved in an encrypted database for security reasons.
When creating or editing a build, it should be possible to use a PAT already saved for that organization or create a new one.
Update the specifications and generate prompts

# Saved PATs 2
Be more concise and break down features into smaller, releasable chunks.
For example:
* Add a screen for saving the PAT, accessible from the organization page
* Allow saving a new PAT linked to the organization
* Allow selecting an existing PAT in the Build creation screen
* ...
  Update the specifications and generate prompts
