using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Eto.Drawing;
using Eto.Forms;
using Rhino;
using Datum.Models;

namespace Datum
{
    [Guid("d2c1f3a4-5b6c-4d7e-8f90-123456789abc")]
    public class DatumPanel : Panel
    {
        public static Guid PanelId => typeof(DatumPanel).GUID;

        private static readonly string[] Modes = { "deterministic", "agentic" };

        private readonly DropDown _mode;
        private readonly Button _run;
        private readonly Label _summary;
        private readonly GridView _findings;
        private readonly TextArea _trace;

        public DatumPanel()
        {
            _mode = new DropDown();
            foreach (var m in Modes) _mode.Items.Add(m);
            _mode.SelectedIndex = 0;

            _run = new Button { Text = "Run Check" };
            _run.Click += async (_, _) => await RunCheckAsync();

            _summary = new Label { Text = "No check run yet." };
            _findings = BuildGrid();
            _trace = new TextArea { ReadOnly = true, Wrap = true };

            Content = new TableLayout
            {
                Padding = 8,
                Spacing = new Size(4, 8),
                Rows =
                {
                    new TableRow(new Label { Text = "Mode" }, _mode),
                    new TableRow(_run),
                    new TableRow(_summary),
                    new TableRow(_findings) { ScaleHeight = true },
                    new TableRow(new Expander { Header = "Agent trace", Expanded = false, Content = _trace }),
                }
            };
        }

        private static GridView BuildGrid()
        {
            var grid = new GridView { ShowHeader = true };
            grid.Columns.Add(Column("Clause", f => f.Clause));
            grid.Columns.Add(Column("Status", f => f.Status));
            grid.Columns.Add(Column("Element", f => f.ObjectName ?? ""));
            grid.Columns.Add(Column("Detail", f => f.Detail));
            return grid;
        }

        private static GridColumn Column(string header, Func<Finding, string> selector)
        {
            return new GridColumn
            {
                HeaderText = header,
                DataCell = new TextBoxCell { Binding = Binding.Delegate(selector) }
            };
        }

        private async Task RunCheckAsync()
        {
            var doc = RhinoDoc.ActiveDoc;
            if (doc == null || doc.Objects.Count == 0)
            {
                _summary.Text = "No active model with objects to check.";
                return;
            }

            _summary.Text = "Checking...";
            _run.Enabled = false;
            try
            {
                var snapshot = SnapshotBuilder.BuildSnapshot(doc);
                var mode = Modes[_mode.SelectedIndex < 0 ? 0 : _mode.SelectedIndex];
                var result = await ServerClient.CheckAsync(snapshot, mode);

                var s = result.Report.Summary;
                _summary.Text = $"{s.Pass} pass, {s.Fail} fail, {s.Unmatched} unmatched";
                _findings.DataStore = result.Report.Findings;
                _trace.Text = FormatTrace(result.Trace);
            }
            catch (Exception ex)
            {
                _summary.Text = $"Check failed: {ex.Message}";
            }
            finally
            {
                _run.Enabled = true;
            }
        }

        private static string FormatTrace(List<TraceEntry>? trace)
        {
            if (trace == null || trace.Count == 0) return "No trace (deterministic mode).";

            var sb = new StringBuilder();
            foreach (var entry in trace)
            {
                sb.AppendLine($"Requirement {entry.Clause} ({entry.Subject})");
                foreach (var step in entry.Steps)
                {
                    if (step.Type == "action") sb.AppendLine($"  > {step.Tool} {step.Reasoning}");
                    else if (step.Type == "observation") sb.AppendLine($"    {step.Observation}");
                    else if (step.Type == "finish") sb.AppendLine($"  = {step.Detail}: {step.Reasoning}");
                }
                sb.AppendLine();
            }
            return sb.ToString();
        }
    }
}
