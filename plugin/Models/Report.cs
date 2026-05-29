using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Datum.Models
{
    public class CheckResponse
    {
        [JsonPropertyName("report")] public Report Report { get; set; } = new();
        [JsonPropertyName("trace")] public List<TraceEntry>? Trace { get; set; }
    }

    public class Report
    {
        [JsonPropertyName("snapshotFile")] public string SnapshotFile { get; set; } = "";
        [JsonPropertyName("generatedAt")] public string GeneratedAt { get; set; } = "";
        [JsonPropertyName("objectCount")] public int ObjectCount { get; set; }
        [JsonPropertyName("requirementCount")] public int RequirementCount { get; set; }
        [JsonPropertyName("summary")] public ReportSummary Summary { get; set; } = new();
        [JsonPropertyName("findings")] public List<Finding> Findings { get; set; } = new();
    }

    public class ReportSummary
    {
        [JsonPropertyName("pass")] public int Pass { get; set; }
        [JsonPropertyName("fail")] public int Fail { get; set; }
        [JsonPropertyName("unmatched")] public int Unmatched { get; set; }
    }

    public class Finding
    {
        [JsonPropertyName("requirementId")] public string RequirementId { get; set; } = "";
        [JsonPropertyName("clause")] public string Clause { get; set; } = "";
        [JsonPropertyName("sourceText")] public string SourceText { get; set; } = "";
        [JsonPropertyName("subject")] public string Subject { get; set; } = "";
        [JsonPropertyName("parameter")] public string Parameter { get; set; } = "";
        [JsonPropertyName("operator")] public string Operator { get; set; } = "";
        [JsonPropertyName("expected")] public JsonElement Expected { get; set; }
        [JsonPropertyName("unit")] public string Unit { get; set; } = "";
        [JsonPropertyName("objectId")] public string? ObjectId { get; set; }
        [JsonPropertyName("objectName")] public string? ObjectName { get; set; }
        [JsonPropertyName("measured")] public double? Measured { get; set; }
        [JsonPropertyName("modelUnit")] public string ModelUnit { get; set; } = "";
        [JsonPropertyName("status")] public string Status { get; set; } = "";
        [JsonPropertyName("detail")] public string Detail { get; set; } = "";
    }

    public class TraceEntry
    {
        [JsonPropertyName("requirementId")] public string RequirementId { get; set; } = "";
        [JsonPropertyName("clause")] public string Clause { get; set; } = "";
        [JsonPropertyName("subject")] public string Subject { get; set; } = "";
        [JsonPropertyName("steps")] public List<TraceStep> Steps { get; set; } = new();
        [JsonPropertyName("finding")] public Finding Finding { get; set; } = new();
    }

    public class TraceStep
    {
        [JsonPropertyName("type")] public string Type { get; set; } = "";
        [JsonPropertyName("tool")] public string? Tool { get; set; }
        [JsonPropertyName("reasoning")] public string? Reasoning { get; set; }
        [JsonPropertyName("detail")] public string? Detail { get; set; }
        [JsonPropertyName("observation")] public JsonElement Observation { get; set; }
    }
}
