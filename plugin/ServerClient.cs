using System;
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
    }

    public static class ServerClient
    {
        private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromMinutes(5) };

        public static string BaseUrl =>
            Environment.GetEnvironmentVariable("DATUM_SERVER_URL") ?? "http://localhost:3000";

        public static async Task<CheckResponse> CheckAsync(ModelSnapshot snapshot, string mode)
        {
            var request = new CheckRequest { Snapshot = snapshot, Mode = mode };
            var response = await Http.PostAsJsonAsync($"{BaseUrl}/check", request);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<CheckResponse>();
            return result ?? throw new InvalidOperationException("Server returned an empty response.");
        }
    }
}
