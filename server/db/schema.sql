CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS chunks (
  id          TEXT PRIMARY KEY,
  source_file TEXT NOT NULL,
  page        INTEGER NOT NULL,
  clause      TEXT,
  text        TEXT NOT NULL,
  embedding   vector(768) NOT NULL
);

CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TABLE IF NOT EXISTS requirements (
  id           TEXT PRIMARY KEY,
  category     TEXT NOT NULL,
  subject      TEXT NOT NULL,
  parameter    TEXT NOT NULL,
  operator     TEXT NOT NULL,
  value_low    DOUBLE PRECISION NOT NULL,
  value_high   DOUBLE PRECISION,
  unit         TEXT NOT NULL,
  clause       TEXT NOT NULL,
  source_page  INTEGER NOT NULL,
  source_text  TEXT NOT NULL,
  chunk_id     TEXT REFERENCES chunks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_file TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_project_id_idx ON documents(project_id);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path TEXT;

INSERT INTO projects (id, name) VALUES ('default', 'Default Project')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO documents (id, project_id, source_file)
  VALUES ('default', 'default', 'unknown')
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE chunks
  ADD COLUMN IF NOT EXISTS document_id TEXT REFERENCES documents(id) ON DELETE CASCADE;
UPDATE chunks SET document_id = 'default' WHERE document_id IS NULL;
ALTER TABLE chunks ALTER COLUMN document_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id);

ALTER TABLE requirements
  ADD COLUMN IF NOT EXISTS document_id TEXT REFERENCES documents(id) ON DELETE CASCADE;
UPDATE requirements SET document_id = 'default' WHERE document_id IS NULL;
ALTER TABLE requirements ALTER COLUMN document_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS requirements_document_id_idx ON requirements(document_id);
