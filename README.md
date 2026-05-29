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

## Project Structure

```
plugin/       C# RhinoCommon plugin (Rhino 8, .NET 8)
server/       TypeScript primary server
  rag/        Requirement-extraction pipeline
  agent/      Agent orchestration service
  tools/      Deterministic tool layer
  llm/        LLM provider abstraction
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
