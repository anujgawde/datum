using System;
using System.IO;
using Rhino;
using Rhino.DocObjects;
using Datum.Models;

namespace Datum
{
    public static class SnapshotBuilder
    {
        public static ModelSnapshot BuildSnapshot(RhinoDoc doc)
        {
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

            return snapshot;
        }
    }
}
