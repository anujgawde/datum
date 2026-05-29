# Datum

An agentic CAD compliance tool that reads structural specification documents, inspects a Rhino 3D model, and verifies the model against the spec, producing a discrepancy report where every finding traces back to a document clause and a model element.

## Architecture

```
┌─────────────┐       HTTP/JSON       ┌──────────────────────────────────┐
│ Rhino Plugin │◄────────────────────►│         Primary Server           │
│   (C#/.NET)  │                      │                                  │
│              │  model snapshot ──►   │  ┌─────────┐  ┌──────────────┐  │
│              │  ◄── report+trace    │  │   RAG   │  │    Agent     │  │
└─────────────┘                      │  │ Pipeline │  │ Orchestrator │  │
                                      │  └────┬────┘  └──────┬───────┘  │
                                      │       │              │          │
                                      │  ┌────▼──────────────▼───────┐  │
                                      │  │       Tool Layer          │  │
                                      │  └──────────────────────────┘  │
                                      │                                  │
                                      │  ┌────────────┐  ┌──────────┐  │
                                      │  │ LLM Abstraction │ PostgreSQL │  │
                                      │  └────────────┘  └──────────┘  │
                                      └──────────────────────────────────┘
```

## Plugin Commands

- `DatumListObjects` - prints all scene objects to the Rhino command line
- `DatumSnapshot` - exports the model to a `.datum.json` file next to the .3dm file

The snapshot includes each object's type, name, layer, bounding box, and dimensions. See [docs/snapshot-schema.json](docs/snapshot-schema.json) for the JSON format.

## Extracting Requirements from a Spec

The server reads a structural specification PDF and extracts machine-checkable
requirement objects (subject, parameter, operator, value, unit), each traced back to its
source clause and page. Requirements and document chunks are stored in PostgreSQL.

### Prerequisites

- [Ollama](https://ollama.com) running locally, with two models pulled:
  ```bash
  ollama pull llama3.1
  ollama pull nomic-embed-text
  ```
- PostgreSQL with the `pgvector` extension. A local instance via Docker:
  ```bash
  docker run -d --name datum-pg -p 5432:5432 \
    -e POSTGRES_PASSWORD=datum pgvector/pgvector:pg16
  ```

Copy `.env.example` to `.env` and adjust the connection string and model names if needed.

### Usage

```bash
cd server
npm install
npm run migrate                       # create tables and the vector index
npm run extract path/to/spec.pdf      # extract requirements from a spec
```

The command prints each extracted requirement with its clause and page reference, and
stores the results in the database.

## Checking a Model

Given a model snapshot (from the `DatumSnapshot` plugin command) and the extracted
requirements, the checker produces a compliance report. Each finding is marked pass, fail,
or unmatched, and traces back to both the spec clause and the model element it concerns.

```bash
cd server
npm run check path/to/model.datum.json
```

By default the checker reads requirements from the database. To run against a requirements
file instead (no database needed), pass `--requirements`:

```bash
npm run check -- path/to/model.datum.json --requirements path/to/requirements.json
```

The report is printed as a summary and written to `<model>.report.json` next to the
snapshot.

## Project Structure

```
plugin/       C# RhinoCommon plugin (Rhino 8, .NET 8)
server/       TypeScript primary server
  rag/        Requirement-extraction pipeline
  agent/      Agent orchestration service
  tools/      Deterministic tool layer
  llm/        LLM provider abstraction
  db/         PostgreSQL schema and client
  check/      Deterministic compliance checker
docs/         Architecture notes and diagrams
```

## Building the Plugin

Requires .NET 8 SDK.

```bash
cd plugin
dotnet restore
dotnet build
```

The output DLL can be loaded into Rhino 8 via `PlugInManager` or by dragging it into the Rhino window.
