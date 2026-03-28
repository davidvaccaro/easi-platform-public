export const SHOULD_RUN_DIMSE_SOCKET_TESTS = (
    (process.env.RUN_DIMSE_SOCKET_TESTS === "true")
    || (process.env.RUN_ORTHANC_DIMSE === "true")
    || (process.env.RUN_ORTHANC_DIMSE_MOVE === "true")
);

export const dimseSocketTest = SHOULD_RUN_DIMSE_SOCKET_TESTS ? test : test.skip;

