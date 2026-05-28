using Rhino;
using Rhino.Commands;
using Rhino.DocObjects;

namespace Datum
{
    public class ListObjectsCommand : Command
    {
        public override string EnglishName => "DatumListObjects";

        protected override Result RunCommand(RhinoDoc doc, RunMode mode)
        {
            var objects = doc.Objects;

            if (objects.Count == 0)
            {
                RhinoApp.WriteLine("Datum: No objects found in the document.");
                return Result.Nothing;
            }

            RhinoApp.WriteLine($"Datum: Found {objects.Count} object(s):");
            RhinoApp.WriteLine("---");

            foreach (RhinoObject obj in objects)
            {
                string name = string.IsNullOrEmpty(obj.Name) ? "(unnamed)" : obj.Name;
                string layerName = doc.Layers[obj.Attributes.LayerIndex].Name;
                var bbox = obj.Geometry.GetBoundingBox(true);

                RhinoApp.WriteLine(
                    $"  Type: {obj.ObjectType}  |  Name: {name}  |  Layer: {layerName}  |  " +
                    $"BBox Min: ({bbox.Min.X:F2}, {bbox.Min.Y:F2}, {bbox.Min.Z:F2})  " +
                    $"Max: ({bbox.Max.X:F2}, {bbox.Max.Y:F2}, {bbox.Max.Z:F2})"
                );
            }

            RhinoApp.WriteLine("---");
            return Result.Success;
        }
    }
}
