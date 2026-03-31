using System.Diagnostics;
using System.Text.Json;
using FellowOakDicom;

static class Program
{
    private sealed record Arguments(string File, int Iterations, int Warmup);

    private sealed class ExtractedTags
    {
        public string? StudyInstanceUid { get; init; }
        public string? SeriesInstanceUid { get; init; }
        public string? SopInstanceUid { get; init; }
        public string? Modality { get; init; }
        public string? NumberOfFrames { get; init; }
        public int? Rows { get; init; }
        public int? Columns { get; init; }
        public int AttributeCount { get; init; }
    }

    private sealed class BenchmarkResult
    {
        public string Toolkit { get; init; } = "fo-dicom";
        public string Operation { get; init; } = "dicom-parse-and-core-tag-extract";
        public string File { get; init; } = string.Empty;
        public long FileSizeBytes { get; init; }
        public int WarmupIterations { get; init; }
        public int Iterations { get; init; }
        public List<double> WarmupSamplesMs { get; init; } = new();
        public List<double> SamplesMs { get; init; } = new();
        public ExtractedTags? Extracted { get; init; }
    }

    private static Arguments ParseArguments(string[] args)
    {
        string? file = null;
        int iterations = 10;
        int warmup = 2;

        for (int i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--file":
                    file = (i + 1 < args.Length) ? args[++i] : null;
                    break;
                case "--iterations":
                    if ((i + 1 < args.Length) && int.TryParse(args[++i], out var parsedIterations))
                    {
                        iterations = Math.Max(1, parsedIterations);
                    }
                    break;
                case "--warmup":
                    if ((i + 1 < args.Length) && int.TryParse(args[++i], out var parsedWarmup))
                    {
                        warmup = Math.Max(0, parsedWarmup);
                    }
                    break;
            }
        }

        if (string.IsNullOrWhiteSpace(file))
        {
            throw new InvalidOperationException("Missing required --file argument.");
        }

        var resolvedPath = Path.GetFullPath(file);
        if (!System.IO.File.Exists(resolvedPath))
        {
            throw new FileNotFoundException($"Input file was not found: {resolvedPath}");
        }

        return new Arguments(resolvedPath, iterations, warmup);
    }

    private static ExtractedTags ReadTags(DicomDataset dataset)
    {
        return new ExtractedTags
        {
            StudyInstanceUid = dataset.GetSingleValueOrDefault(DicomTag.StudyInstanceUID, string.Empty),
            SeriesInstanceUid = dataset.GetSingleValueOrDefault(DicomTag.SeriesInstanceUID, string.Empty),
            SopInstanceUid = dataset.GetSingleValueOrDefault(DicomTag.SOPInstanceUID, string.Empty),
            Modality = dataset.GetSingleValueOrDefault(DicomTag.Modality, string.Empty),
            NumberOfFrames = dataset.GetSingleValueOrDefault(DicomTag.NumberOfFrames, string.Empty),
            Rows = dataset.TryGetSingleValue(DicomTag.Rows, out ushort rows) ? rows : null,
            Columns = dataset.TryGetSingleValue(DicomTag.Columns, out ushort columns) ? columns : null,
            AttributeCount = dataset.Count()
        };
    }

    private static (double elapsedMs, ExtractedTags extracted) RunOnce(string filePath)
    {
        var watch = Stopwatch.StartNew();
        var dicomFile = DicomFile.Open(filePath, FileReadOption.ReadAll);
        watch.Stop();

        return (watch.Elapsed.TotalMilliseconds, ReadTags(dicomFile.Dataset));
    }

    private static int Main(string[] args)
    {
        try
        {
            var parsed = ParseArguments(args);
            var warmupSamples = new List<double>();
            var measuredSamples = new List<double>();
            ExtractedTags? extracted = null;

            for (int i = 0; i < parsed.Warmup; i++)
            {
                var run = RunOnce(parsed.File);
                warmupSamples.Add(run.elapsedMs);
                extracted = run.extracted;
            }

            for (int i = 0; i < parsed.Iterations; i++)
            {
                var run = RunOnce(parsed.File);
                measuredSamples.Add(run.elapsedMs);
                extracted = run.extracted;
            }

            var payload = new BenchmarkResult
            {
                File = parsed.File,
                FileSizeBytes = new FileInfo(parsed.File).Length,
                WarmupIterations = parsed.Warmup,
                Iterations = parsed.Iterations,
                WarmupSamplesMs = warmupSamples,
                SamplesMs = measuredSamples,
                Extracted = extracted
            };

            Console.Write(JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.Write(error.ToString());
            return 1;
        }
    }
}
