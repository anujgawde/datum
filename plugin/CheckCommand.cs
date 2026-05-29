using Rhino;
using Rhino.Commands;
using Rhino.UI;

namespace Datum
{
    public class CheckCommand : Command
    {
        public override string EnglishName => "DatumCheck";

        protected override Result RunCommand(RhinoDoc doc, RunMode mode)
        {
            Panels.OpenPanel(DatumPanel.PanelId);
            return Result.Success;
        }
    }
}
