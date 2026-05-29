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
- `DatumCheck` - opens the Datum panel, which checks the open model against the spec and shows the results in Rhino

The snapshot includes each object's type, name, layer, bounding box, and dimensions. See [docs/snapshot-schema.json](docs/snapshot-schema.json) for the JSON format.

The Datum panel sends the model to the server, runs a compliance check (deterministic or
agentic), and lists each finding with its clause, status, and the element it concerns. It
requires the server running (see below); set `DATUM_SERVER_URL` if the server is not at
`http://localhost:3000`.

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

### Agentic checking

The same check can run agentically: instead of fixed rules, an LLM reasons through each
requirement, deciding which objects and measurements apply and calling the same underlying
tools. It emits a step-by-step trace of its decisions alongside the report.

```bash
npm run agent path/to/model.datum.json
```

This prints a per-requirement trace and writes `<model>.report.json` and
`<model>.trace.json`. It requires Ollama running (see prerequisites above); the
`--requirements` override works here too.

## Running the Server

The `DatumCheck` panel talks to the server over HTTP. Start it with:

```bash
cd server
npm run serve
```

It listens on `http://localhost:3000` (override with the `PORT` environment variable) and
exposes `POST /check`, which accepts a model snapshot and returns a compliance report (and,
in agentic mode, the agent trace). See [docs/report-schema.json](docs/report-schema.json)
for the contract.

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
  agent/      Agentic compliance checker
  http/       HTTP server (plugin round-trip)
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
