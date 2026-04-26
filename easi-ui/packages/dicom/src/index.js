export function createDicomTagViewerModel({ tags = [] } = {}) {
    return {
        type: "dicom-tag-viewer",
        tags
    };
}
