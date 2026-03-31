#!/usr/bin/env python3
import argparse
import json
import os
import time


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', required=True)
    parser.add_argument('--iterations', type=int, default=10)
    parser.add_argument('--warmup', type=int, default=2)
    return parser.parse_args()


def read_tags(dataset):
    def value(tag):
        item = dataset.get(tag)
        return None if item is None else item.value

    def normalize(v):
        if isinstance(v, bytes):
            try:
                return v.decode('utf-8', errors='ignore')
            except Exception:
                return str(v)
        return v

    return {
        'studyInstanceUid': normalize(value(0x0020000D)),
        'seriesInstanceUid': normalize(value(0x0020000E)),
        'sopInstanceUid': normalize(value(0x00080018)),
        'modality': normalize(value(0x00080060)),
        'numberOfFrames': normalize(value(0x00280008)),
        'rows': normalize(value(0x00280010)),
        'columns': normalize(value(0x00280011)),
        'attributeCount': len(dataset)
    }


def run_once(dcmread, file_path):
    started = time.perf_counter_ns()
    dataset = dcmread(file_path, force=True, stop_before_pixels=False)
    elapsed_ms = (time.perf_counter_ns() - started) / 1_000_000.0
    return elapsed_ms, read_tags(dataset)


def main():
    args = parse_args()
    file_path = os.path.abspath(args.file)

    if not os.path.exists(file_path):
        raise RuntimeError(f'Input file was not found: {file_path}')

    try:
        import pydicom
        from pydicom import dcmread
    except Exception as error:
        raise RuntimeError('pydicom is not installed for this runner.') from error

    warmup_samples = []
    measured_samples = []
    last_tags = None

    for _ in range(max(0, args.warmup)):
        elapsed_ms, tags = run_once(dcmread, file_path)
        warmup_samples.append(elapsed_ms)
        last_tags = tags

    for _ in range(max(1, args.iterations)):
        elapsed_ms, tags = run_once(dcmread, file_path)
        measured_samples.append(elapsed_ms)
        last_tags = tags

    payload = {
        'toolkit': 'pydicom',
        'operation': 'dicom-parse-and-core-tag-extract',
        'file': file_path,
        'fileSizeBytes': os.path.getsize(file_path),
        'warmupIterations': max(0, args.warmup),
        'iterations': max(1, args.iterations),
        'warmupSamplesMs': warmup_samples,
        'samplesMs': measured_samples,
        'extracted': last_tags,
        'pydicomVersion': getattr(pydicom, '__version__', None)
    }

    print(json.dumps(payload), end='')


if __name__ == '__main__':
    main()
