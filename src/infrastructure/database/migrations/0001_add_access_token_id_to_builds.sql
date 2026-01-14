-- Migration: Add accessTokenId to builds table
-- Make personalAccessToken nullable and add accessTokenId FK

PRAGMA foreign_keys=OFF;

-- Create new table with updated schema
CREATE TABLE builds_new (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  repository TEXT NOT NULL,
  selectors TEXT NOT NULL,
  access_token_id TEXT,
  personal_access_token TEXT,
  cache_expiration_minutes INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (access_token_id) REFERENCES access_tokens(id) ON DELETE SET NULL
);

-- Copy data from old table
INSERT INTO builds_new (id, tenant_id, name, organization, repository, selectors, access_token_id, personal_access_token, cache_expiration_minutes, created_at, updated_at)
SELECT id, tenant_id, name, organization, repository, selectors, NULL, personal_access_token, cache_expiration_minutes, created_at, updated_at
FROM builds;

-- Drop old table
DROP TABLE builds;

-- Rename new table
ALTER TABLE builds_new RENAME TO builds;

-- Recreate indexes
CREATE INDEX idx_builds_tenant_id ON builds(tenant_id);
CREATE INDEX idx_builds_organization ON builds(organization);
CREATE INDEX idx_builds_repository ON builds(repository);
CREATE INDEX idx_builds_access_token_id ON builds(access_token_id);
CREATE UNIQUE INDEX idx_builds_unique ON builds(tenant_id, name);

PRAGMA foreign_keys=ON;

