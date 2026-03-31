package bench;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.dcm4che3.data.Attributes;
import org.dcm4che3.data.Tag;
import org.dcm4che3.io.DicomInputStream;

import java.io.File;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Dcm4cheBench {

    private record Arguments(String file, int iterations, int warmup) {
    }

    private static Arguments parseArguments(String[] args) {

        String file = null;
        int iterations = 10;
        int warmup = 2;

        for (int i = 0; i < args.length; i++) {
            String token = args[i];
            if ("--file".equals(token) && ((i + 1) < args.length)) {
                file = args[++i];
                continue;
            }
            if ("--iterations".equals(token) && ((i + 1) < args.length)) {
                iterations = Math.max(1, Integer.parseInt(args[++i]));
                continue;
            }
            if ("--warmup".equals(token) && ((i + 1) < args.length)) {
                warmup = Math.max(0, Integer.parseInt(args[++i]));
            }
        }

        if ((file == null) || file.isBlank()) {
            throw new IllegalArgumentException("Missing required --file argument.");
        }

        File resolvedFile = (new File(file)).getAbsoluteFile();
        if (resolvedFile.exists() != true) {
            throw new IllegalArgumentException("Input file was not found: " + resolvedFile);
        }

        return new Arguments(resolvedFile.getAbsolutePath(), iterations, warmup);

    }

    private static Map<String, Object> readTags(Attributes attributes) {

        Map<String, Object> tags = new LinkedHashMap<>();
        tags.put("studyInstanceUid", attributes.getString(Tag.StudyInstanceUID, null));
        tags.put("seriesInstanceUid", attributes.getString(Tag.SeriesInstanceUID, null));
        tags.put("sopInstanceUid", attributes.getString(Tag.SOPInstanceUID, null));
        tags.put("modality", attributes.getString(Tag.Modality, null));
        tags.put("numberOfFrames", attributes.getString(Tag.NumberOfFrames, null));
        tags.put("rows", attributes.contains(Tag.Rows) ? attributes.getInt(Tag.Rows, -1) : null);
        tags.put("columns", attributes.contains(Tag.Columns) ? attributes.getInt(Tag.Columns, -1) : null);
        tags.put("attributeCount", attributes.size());

        return tags;

    }

    private static class RunOutcome {

        private final double elapsedMs;
        private final Map<String, Object> extracted;

        private RunOutcome(double elapsedMs, Map<String, Object> extracted) {
            this.elapsedMs = elapsedMs;
            this.extracted = extracted;
        }

    }

    private static RunOutcome runOne(String filePath) throws Exception {

        long startedAt = System.nanoTime();
        Attributes attributes;

        try (DicomInputStream input = new DicomInputStream(new File(filePath))) {
            attributes = input.readDataset(-1, -1);
        }

        double elapsedMs = (System.nanoTime() - startedAt) / 1_000_000.0;
        return new RunOutcome(elapsedMs, readTags(attributes));

    }

    public static void main(String[] args) throws Exception {

        Arguments parsed = parseArguments(args);

        List<Double> warmupSamples = new ArrayList<>();
        List<Double> samples = new ArrayList<>();
        Map<String, Object> extracted = null;

        for (int i = 0; i < parsed.warmup; i++) {
            RunOutcome run = runOne(parsed.file);
            warmupSamples.add(run.elapsedMs);
            extracted = run.extracted;
        }

        for (int i = 0; i < parsed.iterations; i++) {
            RunOutcome run = runOne(parsed.file);
            samples.add(run.elapsedMs);
            extracted = run.extracted;
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("toolkit", "dcm4che");
        payload.put("operation", "dicom-parse-and-core-tag-extract");
        payload.put("file", parsed.file);
        payload.put("fileSizeBytes", (new File(parsed.file)).length());
        payload.put("warmupIterations", parsed.warmup);
        payload.put("iterations", parsed.iterations);
        payload.put("warmupSamplesMs", warmupSamples);
        payload.put("samplesMs", samples);
        payload.put("extracted", extracted);

        ObjectMapper mapper = new ObjectMapper();
        System.out.print(mapper.writeValueAsString(payload));

    }

}
