using Rhino;
using Rhino.PlugIns;
using Rhino.UI;

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
            Panels.RegisterPanel(this, typeof(DatumPanel), "Datum", null);
            RhinoApp.WriteLine("Datum plugin loaded successfully.");
            return LoadReturnCode.Success;
        }
    }
}
