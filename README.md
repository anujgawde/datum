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

## Current Status

**Phase 0** - Plugin skeleton. The Rhino plugin loads and exposes a `DatumListObjects` command that lists all scene objects.

## Project Structure

```
plugin/       C# RhinoCommon plugin (Rhino 8, .NET 7)
server/       TypeScript primary server
  rag/        Requirement-extraction pipeline
  agent/      Agent orchestration service
  tools/      Deterministic tool layer
  llm/        LLM provider abstraction
dashboard/    Next.js web dashboard (future)
evals/        Eval suite and ground-truth data (future)
docs/         Architecture notes and diagrams
```

## Building the Plugin

Requires .NET 7 SDK.

```bash
cd plugin
dotnet restore
dotnet build
```

The output DLL can be loaded into Rhino 8 via `PlugInManager` or by dragging it into the Rhino window.

## License

TBD
