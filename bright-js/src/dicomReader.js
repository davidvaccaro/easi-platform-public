//
// DicomReader.js - 1.0.0
//
// DICOM Reader Class 
//
// Proprietary Notices:
// The Products, Documentation and Materials are proprietary to Xinonix Interactive Development Inc. and its licensors 
// and protected by applicable U.S. and international patent, copyright, trademark and trade secret laws. Xinonix 
// Interactive Development Inc and its licensors shall retain ownership in the Products, Documentation and Materials; 
// all derivatives thereof (in whole or part); and any intellectual property or other rights embodied therein. 
// 
// All proprietary notices incorporated in or affixed to any Products, Documentation or Materials shall be duplicated 
// by you on all copies of the Products, Documentation, or Material, as applicable, and shall not be altered, removed 
// or obliterated. Lease Equipment is, and shall at all times be and remain Our sole and exclusive property; you have 
// no right, title or interest therein or thereto except as expressly set forth in this Agreement. You shall keep the 
// Lease Equipment free and clear of all levies, liens and encumbrances and shall immediately notify us in writing of 
// any circumstances with respect to the location of the Equipment which will adversely affect it or our security 
// interests therein. You shall not install, attach, mount or otherwise house the Lease Equipment in a manner that 
// would render it a fixture under applicable law within the jurisdiction in which the Lease Equipment is located.
//

class DicomReader {

    /**
     * Parse the content-type from the response.
     * @param {*} response The response.
     * @returns The contentType header parsed as an object.
     */
    parseContentType(response) {

        var contentType = {};

        // EXAMPLE: of multipart/related conent-type:
        // content-type -> multipart/related;start="<4f97f3be-debc-4444-8c3e-27a3bd85b940@resteasy-multipart>";transfer-syntax=1.2.840.10008.1.2.1;type="application/dicom"; boundary=de7100eb-8405-4a5e-a25c-83be3ef0514b
        var header = response.headers.get("content-type");

        // If there is a content-type
        if (header != null) {

            // Split the header parts
            var parts = header.split(";");

            // Set the actual content-type value
            contentType["content-type"] = parts[0]
                .replaceAll("\"", "")
                .toLowerCase()
                .trim();

            // Loop over the parts
            for (var i = 0; i < parts.length; i++) {

                // Get the part
                var part = parts[i];
                
                // If the part is name=value
                if (part.indexOf("=") > -1) {

                    // Split the name=value
                    var namevalue = part
                        .replaceAll("\"", "")
                        .toLowerCase()
                        .trim()
                        .split("=");

                    // Populate the contentType
                    contentType[namevalue[0]] = namevalue[1];

                }                        

            }

        }

        // Process the content-type
        contentType.isMultiPart = ((contentType['content-type'] != null) && (contentType['content-type'].indexOf('multipart/') > -1));

        // Return the parsed content-type header
        return contentType;

    }

    /**
     * Process the data reader as a single-part DICOM data-set response.
     * @param {*} reader The reader providing a single DICOM byte part.
     */
    async processSinglePart(controller, reader, contentType, resolve, reject) {

        var result = false;

        try {

            // Reset the parser
            this.parser.reset();

            // Keep reading till "done"
            while (true) {

                // Read a chunk of data
                const { done, value } = await reader.read();

                // Break if there is no more data
                if (done) {

                    // Finalize the current parse
                    result = this.parser.parse(value, done);

                    // Break the stream looop
                    break;

                }

                // Parse the DICOM
                this.parser.parse(value);

            }

            // Close the stream
            controller.close();
            reader.releaseLock();

            // Resolve with a singe parser result
            if (result == true)
                resolve(this.parser.result);
            else
                reject(new DicomException("Failed parsing single DICOM data-set.", DicomErrorCodes.GeneralError));

        }
        catch (err) {
            reject(err);
        }

    }

    /**
     * Process the data reader as a multi-part DICOM data-set response.
     * @param {*} reader The reader providing multiple DICOM byte parts.
     */
    async processMultiPart(controller, reader, contentType, resolve, reject) {

        var doneReading = false;
        var result = false;
        var results = [];

        var start = new Date().getTime();

        try {

            // The temporary buffer
            var temp = new DicomData();

            // Initialize the first part
            var partHeader = { isComplete: false };

            // Reset the parser
            this.parser.reset();

            // Keep reading till "done"
            while (true) {

                // Read a chunk of data
                const { done, value } = await reader.read();

                // Append the bytes
                if (value != null) {
                    temp.append(value);
                }

                // Set the DONE flag
                if ((doneReading == false) && ((done == true) || (value == null))) {
                    doneReading = true;
                }

                // Access the raw data
                var data = temp.access();

                // If still processing the part header,
                if (partHeader.isComplete == false) {

                    // Loop over the bytes
                    for (var i = 0; ((i < data.length) && ((i + 1) < data.length)); i++) {

                        // Look for the boundary start "--"
                        if (data[i] === 45 && data[i + 1] === 45) {

                            var boundaryMatched = false;

                            // Match the initial boundary
                            for (var j = 0; ((j < contentType.boundary.length) && ((i + 2 + j) < data.length)); j++) {

                                boundaryMatched = true

                                // Compare the boundary bytes
                                if (data[i + 2 + j] !== contentType.boundary.charCodeAt(j)) {

                                    // NOT matched
                                    boundaryMatched = false

                                  break;

                                }

                            }
                              
                            // If the full boundar matched, 
                            if (boundaryMatched == true) {

                                // Read till the next header break
                                for (var x = (i + contentType.boundary.length); x < data.length; x++) {

                                    // Find the next "\r\n\r\n"
                                    if (data[x] === 13 && data[x + 1] === 10 && data[x + 2] === 13 && data[x + 3] === 10) {

                                        // Consume the whole multipart header and decode to text and split into lines
                                        var decodedHeader = (new TextDecoder()).decode(temp.consume((x - i))).split(/\r?\n|\r|\n/g);

                                        // If the header is valid
                                        if ((decodedHeader != null) && (decodedHeader.length > 0)) {

                                            // Set the boundary
                                            partHeader.boundary = decodedHeader[0];

                                            // Loop over the headers
                                            for (var y = 1; y < decodedHeader.length; y++) {

                                                // Split on ":"
                                                var headerParts = decodedHeader[y].split(":");

                                                // Set the header
                                                partHeader[
                                                    headerParts[0]
                                                    .replaceAll("\"", "")
                                                    .toLowerCase()
                                                    .trim()
                                                ] = headerParts[1].replaceAll("\"", "").toLowerCase().trim();
                                                
                                            }

                                            // Set the header is completed
                                            partHeader.isComplete = true;

                                        }

                                        // Consume the header break (4-bytes)
                                        temp.consume(4);

                                        // Break
                                        break;

                                    }

                                }                                

                                // Break
                                break;

                            }

                        }
                        else {

                            // Consume 1-byte
                            temp.consume(1);

                        }

                    }

                }
                else {

                    // Only process when the buffer has MORE data that the minimal ending boundary
                    if (temp.length() >= (2 + contentType.boundary.length)) {

                        var endIndex = temp.length();
                        var boundaryMatched = false;

                        // Determine if this current buffer contains the end of the part
                        for (var i = 0; i < data.length; i++) {

                            // If we found a prospect boundary ending
                            if (data[i] === 45) {

                                // Mark the processing end
                                endIndex = i;

                                // Determine if there is the end boundary
                                if ((i + 2 + contentType.boundary.length) < data.length) {

                                    // Look for the boundary start "--"
                                    if (data[i] === 45 && data[i + 1] === 45) {

                                        // Match the initial boundary
                                        for (var j = 0; ((j < contentType.boundary.length) && ((i + 2 + j) < data.length)); j++) {
            
                                            boundaryMatched = true
            
                                            // Compare the boundary bytes
                                            if (data[i + 2 + j] !== contentType.boundary.charCodeAt(j)) {
            
                                                // NOT matched
                                                boundaryMatched = false
            
                                              break;
            
                                            }
            
                                        }

                                        // Trim any prior \r\n
                                        if ((boundaryMatched == true) && (endIndex >= 2) && (data[endIndex - 2] = 13) && (data[endIndex - 1] = 10)) {
                                            endIndex -= 2;
                                        }
            
                                    }

                                }

                                // Break for parsing
                                break

                            }

                        }

                        // Continue parsing and consume either the whole buffer or the remaining bytes of the part
                        var result = this.parser.parse(temp.consume(endIndex + (((boundaryMatched == false) && (temp.length() >= (endIndex + 1))) ? 1 : 0)), boundaryMatched);

                        // If currently reached the next boundary
                        if (boundaryMatched == true) {

                            // If the DICOM was NOT fully parsed, throw error
                            if (result == false) {
                                throw new DicomException("Failed parsing multiple DICOM data-sets.", DicomErrorCodes.GeneralError)
                            }

                            // Push the result                            
                            results.push(this.parser.result);

                            // Re-Initialize the first part
                            partHeader = { isComplete: false };

                            // Reset the parser
                            this.parser.reset();

                        }

                    }

                }

                // Break if there is no more data
                if ((doneReading == true) && (temp.length() < (2 + contentType.boundary.length + 2 + DicomConstants.PreambleLength))) {

                    // Break the stream looop
                    break;

                }

            }

            // Close the stream
            controller.close();
            reader.releaseLock();

            // Resolve with a singe parser result
            resolve(results);

        }
        catch (err) {
            reject(err);
        }

        console.log('Execution time: ' + (new Date().getTime() - start) + ' ms');        

    }

    /**
     * Read a DICOM instance from the response content of specified URL.
     * @param {*} url The specified URL to a DICOM instance.
     * @returns A Promise that resolves to the result from the DICOM parse operation.
     */
    read(url) {

        // Establish that
        var that = this;

        // Return the promise
        return new Promise(function(resolve, reject) {

            var contentType = {};

            // Fetch the DICOM file
            fetch(url, {
                method: 'GET'
            })
            .then(response => { 

                // Parse the Content-Type header
                contentType = that.parseContentType(response);

                // Return the whole body
                return response.body; 

            })
            .then(rs => {

                // Get the reader
                const reader = rs.getReader();

                // Create the readable stream
                return new ReadableStream({
                    async start(controller) {

                        try {

                            // Process based on the content-type (single versus multi-part)
                            if (contentType.isMultiPart == false) {
                                that.processSinglePart(controller, reader, contentType, resolve, reject);
                            }
                            else {
                                that.processMultiPart(controller, reader, contentType, resolve, reject);
                            }
                            
                        }
                        catch (err) {
                            reject(err);
                        }

                    }
                });

            })
            .catch(err => { reject(err); });

        });

    }

    // The constructor
    constructor(parser) {
        this.parser = parser;
    }

};

// Node Module Exports
if (typeof module === 'object' && module.exports) {
    module.exports = { DicomReader };
}