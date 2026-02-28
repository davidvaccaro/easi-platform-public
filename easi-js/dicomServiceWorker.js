import EASI from './src/EASI.js';
import Tag from '/easi-js/src/dicom/Tag.js';
import Modality from '/easi-js/src/dicom/Modality.js';
import DicomDataParser from '/easi-js/src/parsers/DicomDataParser.js';
import DicomInstanceHandler from "/easi-js/src/handlers/terminals/DicomInstanceHandler.js";
import Image from '/easi-js/src/dicom/entities/Image.js';
import CT from '/easi-js/src/dicom/entities/CT.js';
import XA from '/easi-js/src/dicom/entities/XA.js';

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
    //return await fetch('/easi-js/img/pug.png');

    // Return the promise
    return new Promise(function(resolve, reject) {

      // Build the DICOM streaming reader
      const reader = EASI.pipelineBuilder()
        .withParser(new DicomDataParser())
        .withHandler(new DicomInstanceHandler())
        .build();

      // Read and parse the DICOM file
      reader
        .read(request.url)
        .then(result => {

          // Establish the parsed instance
          var instance = (typeof result === 'array') ? result[0] : result;

          // Create a new image object from the instance
          var imageEntity = null;
          
          // Get the modality
          var modality = instance.dataSet.find(Tag.Modality).value;

          if (modality == Modality.CT.ID) {
            imageEntity = new CT(instance.dataSet);
          }
          else if (modality == Modality.XA.ID) {
            imageEntity = new XA(instance.dataSet);
          }
          else {
            imageEntity = new Image(instance.dataSet);
          }
                              
          // Create the destination for the decode (4 BYTES PER PIXEL)
          var destination = new Uint8Array(imageEntity.imagePixelModule.columns * imageEntity.imagePixelModule.rows * 4);

          // Decoce into the destination
          imageEntity.decodeFrame(destination);

          // Create the image data from the decoded data
          var data = new ImageData(
              new Uint8ClampedArray(destination), 
              imageEntity.imagePixelModule.columns, 
              imageEntity.imagePixelModule.rows);

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
