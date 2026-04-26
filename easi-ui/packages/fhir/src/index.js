export function createFhirViewerModel({ resource = null } = {}) {
    return {
        type: "fhir-viewer",
        resource
    };
}
