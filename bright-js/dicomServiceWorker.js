// Call clients.claim so that we intercept requests even on initial page load.
self.addEventListener('activate', () => self.clients.claim());

// Listen for "fetch" events, which get emitted any time the browser is requesting something.
self.addEventListener('fetch', (event) => {

  // We only do something with the event if it's a request for an encrypted PNG file.
  // Not doing anything with the event means the browser behaves as normal.
  if (isDICOMRequest(event.request)) {

    // We'll take the encrypted image request and turn it into a PNG response and tell
    // the browser to render that instead, since the browser knows how to render PNG images.
    event.respondWith(pngFromDICOMRequest(event.request));

  }

});

// Determine if a specified URL is a DICOM instance
const isDICOMRequest = request => new URL(request.url).pathname.endsWith('.dcm');

// Fullfills a request for an encrypted image with a normal PNG response.
// Does so with a TransformStream which processes the image data as it arrives
// instead of waiting for the entire file to download and doing it in a single
// batch.
const pngFromDICOMRequest = async (request) => {

    // Request original data
    const response = await fetch(request);

    // Decode to PNG
    return await fetch('/bright-js/img/pug.png');

};