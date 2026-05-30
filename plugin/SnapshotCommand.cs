using System.IO;
using System.Text.Json;
using Rhino;
using Rhino.Commands;

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

            var snapshot = SnapshotBuilder.BuildSnapshot(doc);

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
