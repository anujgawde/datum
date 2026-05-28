using System;
using Rhino;
using Rhino.PlugIns;

namespace Datum
{
    public class DatumPlugin : PlugIn
    {
        public DatumPlugin()
        {
            Instance = this;
        }

        public static DatumPlugin? Instance { get; private set; }

        protected override LoadReturnCode OnLoad(ref string errorMessage)
        {
            RhinoApp.WriteLine("Datum plugin loaded successfully.");
            return LoadReturnCode.Success;
        }
    }
}
