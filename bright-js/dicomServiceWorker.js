import { Tag } from '/bright-js/src/dicomTag.js';
import { Modality } from '/bright-js/src/dicomModality.js';
import DicomParser from '/bright-js/src/dicomParser.js';
import DicomReader from '/bright-js/src/dicomReader.js';
import dicomInstanceStreamHandler from "/bright-js/src/handlers/dicomInstanceStreamHandler.js";
import DicomImageObject from '/bright-js/src/objects/dicomImageObject.js';
import DicomCTObject from '/bright-js/src/objects/dicomCTObject.js';
import DicomXAObject from '/bright-js/src/objects/dicomXAObject.js';

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
    //const response = await fetch(request);

    // Decode to PNG
    //return await fetch('/bright-js/img/pug.png');

    // Return the promise
    return new Promise(function(resolve, reject) {

      // Create the DICOM reader
      var reader = new DicomReader(new DicomParser(new dicomInstanceStreamHandler()));

      // Read and parse the DICOM file
      reader
        .read(request.url)
        .then(result => {

          // Establish the parsed instance
          var instance = (typeof result === 'array') ? result[0] : result;

          // Create a new image object from the instance
          var imageObject = null;
          
          // Get the modality
          var modality = instance.dataSet.find(Tag.Modality).value;

          if (modality == Modality.CT.ID) {
              imageObject = new DicomCTObject(instance.dataSet);
          }
          else if (modality == Modality.XA.ID) {
              imageObject = new DicomXAObject(instance.dataSet);
          }
          else {
              imageObject = new DicomImageObject(instance.dataSet);
          }
                              
          // Create the destination for the decode (4 BYTES PER PIXEL)
          var destination = new Uint8Array(imageObject.imagePixelModule.columns * imageObject.imagePixelModule.rows * 4);

          // Decoce into the destination
          imageObject.decodeFrame(destination);

          // Create the image data from the decoded data
          var data = new ImageData(
              new Uint8ClampedArray(destination), 
              imageObject.imagePixelModule.columns, 
              imageObject.imagePixelModule.rows);

            const canvas = new OffscreenCanvas(data.width, data.height)
            
            // Get the 2D rendering context
            const ctx = canvas.getContext('2d');
            
            // Put the ImageData onto the canvas
            ctx.putImageData(data, 0, 0);
            
            canvas.convertToBlob().then(blob => {

              // const response = new Response(blob, { type: 'image/png' });            
              resolve(new Response(blob, { headers: { 'Content-Type': 'image/png' } }));

            });

        })
        .catch(err => reject(err));

    });

};