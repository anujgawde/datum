using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Datum.Models
{
    public class ModelSnapshot
    {
        [JsonPropertyName("version")]
        public string Version { get; set; } = "1.0";

        [JsonPropertyName("exportedAt")]
        public string ExportedAt { get; set; } = "";

        [JsonPropertyName("sourceFile")]
        public string SourceFile { get; set; } = "";

        [JsonPropertyName("units")]
        public string Units { get; set; } = "";

        [JsonPropertyName("objects")]
        public List<SnapshotObject> Objects { get; set; } = new();
    }

    public class SnapshotObject
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [JsonPropertyName("type")]
        public string Type { get; set; } = "";

        [JsonPropertyName("name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("layer")]
        public string Layer { get; set; } = "";

        [JsonPropertyName("boundingBox")]
        public BoundingBoxData BoundingBox { get; set; } = new();

        [JsonPropertyName("dimensions")]
        public DimensionsData Dimensions { get; set; } = new();
    }

    public class BoundingBoxData
    {
        [JsonPropertyName("min")]
        public Vector3Data Min { get; set; } = new();

        [JsonPropertyName("max")]
        public Vector3Data Max { get; set; } = new();
    }

    public class Vector3Data
    {
        [JsonPropertyName("x")]
        public double X { get; set; }

        [JsonPropertyName("y")]
        public double Y { get; set; }

        [JsonPropertyName("z")]
        public double Z { get; set; }
    }

    public class DimensionsData
    {
        [JsonPropertyName("width")]
        public double Width { get; set; }

        [JsonPropertyName("height")]
        public double Height { get; set; }

        [JsonPropertyName("depth")]
        public double Depth { get; set; }
    }
}
