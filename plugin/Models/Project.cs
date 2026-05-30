using System.Text.Json.Serialization;

namespace Datum.Models
{
    public class ProjectInfo
    {
        [JsonPropertyName("id")] public string Id { get; set; } = "";
        [JsonPropertyName("name")] public string Name { get; set; } = "";
        [JsonPropertyName("createdAt")] public string CreatedAt { get; set; } = "";

        public override string ToString() => Name;
    }

    public class DocumentInfo
    {
        [JsonPropertyName("id")] public string Id { get; set; } = "";
        [JsonPropertyName("name")] public string Name { get; set; } = "";
        [JsonPropertyName("sourceFile")] public string SourceFile { get; set; } = "";
        [JsonPropertyName("uploadedAt")] public string UploadedAt { get; set; } = "";

        public override string ToString() => Name;
    }

    public class SpecUploadResponse
    {
        [JsonPropertyName("projectId")] public string ProjectId { get; set; } = "";
        [JsonPropertyName("documentId")] public string DocumentId { get; set; } = "";
        [JsonPropertyName("name")] public string Name { get; set; } = "";
        [JsonPropertyName("requirementCount")] public int RequirementCount { get; set; }
    }
}
