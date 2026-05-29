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
