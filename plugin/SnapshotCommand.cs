using System;
using System.IO;
using System.Text.Json;
using Rhino;
using Rhino.Commands;
using Rhino.DocObjects;
using Datum.Models;

namespace Datum
{
    public class SnapshotCommand : Command
    {
        public override string EnglishName => "DatumSnapshot";

        protected override Result RunCommand(RhinoDoc doc, RunMode mode)
        {
            if (doc.Objects.Count == 0)
            {
                RhinoApp.WriteLine("Datum: No objects found. Snapshot not created.");
                return Result.Nothing;
            }

            var snapshot = new ModelSnapshot
            {
                ExportedAt = DateTime.UtcNow.ToString("o"),
                SourceFile = Path.GetFileName(doc.Path ?? "untitled.3dm"),
                Units = doc.ModelUnitSystem.ToString()
            };

            foreach (RhinoObject obj in doc.Objects)
            {
                var bbox = obj.Geometry.GetBoundingBox(true);

                snapshot.Objects.Add(new SnapshotObject
                {
                    Id = obj.Id.ToString(),
                    Type = obj.ObjectType.ToString(),
                    Name = string.IsNullOrEmpty(obj.Name) ? "" : obj.Name,
                    Layer = doc.Layers[obj.Attributes.LayerIndex].Name,
                    BoundingBox = new BoundingBoxData
                    {
                        Min = new Vector3Data { X = bbox.Min.X, Y = bbox.Min.Y, Z = bbox.Min.Z },
                        Max = new Vector3Data { X = bbox.Max.X, Y = bbox.Max.Y, Z = bbox.Max.Z }
                    },
                    Dimensions = new DimensionsData
                    {
                        Width = Math.Abs(bbox.Max.X - bbox.Min.X),
                        Height = Math.Abs(bbox.Max.Z - bbox.Min.Z),
                        Depth = Math.Abs(bbox.Max.Y - bbox.Min.Y)
                    }
                });
            }

            var options = new JsonSerializerOptions { WriteIndented = true };
            string json = JsonSerializer.Serialize(snapshot, options);

            string outputPath = GetOutputPath(doc);
            File.WriteAllText(outputPath, json);

            RhinoApp.WriteLine($"Datum: Snapshot saved to {outputPath}");
            RhinoApp.WriteLine($"Datum: {snapshot.Objects.Count} object(s) exported.");
            return Result.Success;
        }

        private static string GetOutputPath(RhinoDoc doc)
        {
            if (!string.IsNullOrEmpty(doc.Path))
            {
                string dir = Path.GetDirectoryName(doc.Path)!;
                string name = Path.GetFileNameWithoutExtension(doc.Path);
                return Path.Combine(dir, $"{name}.datum.json");
            }

            string desktop = System.Environment.GetFolderPath(System.Environment.SpecialFolder.Desktop);
            return Path.Combine(desktop, "untitled.datum.json");
        }
    }
}
