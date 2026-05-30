using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Datum.Models;

namespace Datum
{
    public class CheckRequest
    {
        [JsonPropertyName("snapshot")] public ModelSnapshot Snapshot { get; set; } = new();
        [JsonPropertyName("mode")] public string Mode { get; set; } = "deterministic";

        [JsonPropertyName("projectId")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ProjectId { get; set; }

        [JsonPropertyName("documentIds")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<string>? DocumentIds { get; set; }
    }

    public static class ServerClient
    {
        private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromMinutes(5) };

        public static string BaseUrl =>
            Environment.GetEnvironmentVariable("DATUM_SERVER_URL") ?? "http://localhost:3000";

        public static async Task<CheckResponse> CheckAsync(
            ModelSnapshot snapshot,
            string mode,
            string? projectId = null,
            IReadOnlyList<string>? documentIds = null)
        {
            var request = new CheckRequest
            {
                Snapshot = snapshot,
                Mode = mode,
                ProjectId = projectId,
                DocumentIds = documentIds != null && documentIds.Count > 0
                    ? new List<string>(documentIds)
                    : null,
            };
            var response = await Http.PostAsJsonAsync($"{BaseUrl}/check", request);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<CheckResponse>();
            return result ?? throw new InvalidOperationException("Server returned an empty response.");
        }

        public static async Task<List<ProjectInfo>> GetProjectsAsync()
        {
            var result = await Http.GetFromJsonAsync<List<ProjectInfo>>($"{BaseUrl}/projects");
            return result ?? new List<ProjectInfo>();
        }

        public static async Task<List<DocumentInfo>> GetDocumentsAsync(string projectId)
        {
            var result = await Http.GetFromJsonAsync<List<DocumentInfo>>(
                $"{BaseUrl}/projects/{Uri.EscapeDataString(projectId)}/documents");
            return result ?? new List<DocumentInfo>();
        }

        public static async Task<SpecUploadResponse> UploadSpecAsync(
            string projectId,
            string filePath,
            string? documentId = null,
            string? name = null)
        {
            using var form = new MultipartFormDataContent();
            var fileStream = File.OpenRead(filePath);
            var fileContent = new StreamContent(fileStream);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
            form.Add(fileContent, "file", Path.GetFileName(filePath));
            form.Add(new StringContent(projectId), "projectId");
            if (documentId != null) form.Add(new StringContent(documentId), "documentId");
            if (name != null) form.Add(new StringContent(name), "name");

            var response = await Http.PostAsync($"{BaseUrl}/spec", form);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<SpecUploadResponse>();
            return result ?? throw new InvalidOperationException("Server returned an empty response.");
        }
    }
}
