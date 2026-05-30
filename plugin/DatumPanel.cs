using System;
using System.Collections.Generic;
using System.Linq;
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

        private readonly DropDown _project;
        private readonly CheckBoxList _specs;
        private readonly Button _upload;
        private readonly DropDown _mode;
        private readonly Button _run;
        private readonly Label _summary;
        private readonly GridView _findings;
        private readonly TextArea _trace;

        private List<ProjectInfo> _projects = new();
        private List<DocumentInfo> _documents = new();

        public DatumPanel()
        {
            _project = new DropDown();
            _project.SelectedIndexChanged += async (_, _) => await LoadDocumentsAsync();

            _specs = new CheckBoxList { Orientation = Orientation.Vertical };

            _upload = new Button { Text = "Upload Spec..." };
            _upload.Click += async (_, _) => await UploadSpecAsync();

            _mode = new DropDown();
            foreach (var m in Modes) _mode.Items.Add(m);
            _mode.SelectedIndex = 0;

            _run = new Button { Text = "Run Check" };
            _run.Click += async (_, _) => await RunCheckAsync();

            _summary = new Label { Text = "Loading projects..." };
            _findings = BuildGrid();
            _trace = new TextArea { ReadOnly = true, Wrap = true };

            Content = new TableLayout
            {
                Padding = 8,
                Spacing = new Size(4, 8),
                Rows =
                {
                    new TableRow(new Label { Text = "Project" }, _project),
                    new TableRow(new Label { Text = "Specs" }, _specs),
                    new TableRow(_upload),
                    new TableRow(new Label { Text = "Mode" }, _mode),
                    new TableRow(_run),
                    new TableRow(_summary),
                    new TableRow(_findings) { ScaleHeight = true },
                    new TableRow(new Expander { Header = "Agent trace", Expanded = false, Content = _trace }),
                }
            };

            _ = LoadProjectsAsync();
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

        private async Task LoadProjectsAsync()
        {
            try
            {
                _projects = await ServerClient.GetProjectsAsync();
                _project.Items.Clear();
                foreach (var p in _projects) _project.Items.Add(p.Name);

                if (_projects.Count > 0)
                {
                    _project.SelectedIndex = 0;
                    await LoadDocumentsAsync();
                }
                else
                {
                    _summary.Text = "No projects yet. Upload a spec to start.";
                }
            }
            catch (Exception ex)
            {
                _summary.Text = $"Failed to load projects: {ex.Message}";
            }
        }

        private async Task LoadDocumentsAsync()
        {
            var idx = _project.SelectedIndex;
            if (idx < 0 || idx >= _projects.Count) return;

            try
            {
                _documents = await ServerClient.GetDocumentsAsync(_projects[idx].Id);
                _specs.Items.Clear();
                foreach (var d in _documents) _specs.Items.Add(d.Name);
                _summary.Text = _documents.Count == 0
                    ? "No specs in this project. Upload one to start."
                    : $"{_documents.Count} spec(s) available.";
            }
            catch (Exception ex)
            {
                _summary.Text = $"Failed to load documents: {ex.Message}";
            }
        }

        private async Task UploadSpecAsync()
        {
            var idx = _project.SelectedIndex;
            if (idx < 0 || idx >= _projects.Count)
            {
                _summary.Text = "Select a project before uploading.";
                return;
            }

            var dialog = new OpenFileDialog { MultiSelect = false };
            dialog.Filters.Add(new FileFilter("PDF", ".pdf"));
            if (dialog.ShowDialog(this) != DialogResult.Ok || string.IsNullOrEmpty(dialog.FileName)) return;

            var projectId = _projects[idx].Id;
            _summary.Text = $"Uploading {System.IO.Path.GetFileName(dialog.FileName)}...";
            _upload.Enabled = false;
            try
            {
                var result = await ServerClient.UploadSpecAsync(projectId, dialog.FileName);
                _summary.Text = $"Uploaded {result.Name}: {result.RequirementCount} requirement(s).";
                await LoadDocumentsAsync();
                // Pre-check the just-uploaded document.
                for (var i = 0; i < _documents.Count; i++)
                {
                    if (_documents[i].Id == result.DocumentId)
                    {
                        _specs.SelectedValues = new[] { _specs.Items[i] };
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                _summary.Text = $"Upload failed: {ex.Message}";
            }
            finally
            {
                _upload.Enabled = true;
            }
        }

        private async Task RunCheckAsync()
        {
            var doc = RhinoDoc.ActiveDoc;
            if (doc == null || doc.Objects.Count == 0)
            {
                _summary.Text = "No active model with objects to check.";
                return;
            }

            var projectIdx = _project.SelectedIndex;
            string? projectId = projectIdx >= 0 && projectIdx < _projects.Count
                ? _projects[projectIdx].Id
                : null;

            var checkedDocs = new List<string>();
            for (var i = 0; i < _specs.Items.Count && i < _documents.Count; i++)
            {
                if (_specs.SelectedValues.Contains(_specs.Items[i])) checkedDocs.Add(_documents[i].Id);
            }

            _summary.Text = "Checking...";
            _run.Enabled = false;
            try
            {
                var snapshot = SnapshotBuilder.BuildSnapshot(doc);
                var mode = Modes[_mode.SelectedIndex < 0 ? 0 : _mode.SelectedIndex];
                var result = await ServerClient.CheckAsync(snapshot, mode, projectId, checkedDocs);

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
