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

import DicomConstants from './dicomConstants.js';
import DicomException from './dicomException.js';

import { DicomStatus } from './dicomStatus.js';

import DicomData from './dicomData.js';
import { DicomErrorCodes } from './dicomException.js'

export default class DicomReader {

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
    async processSinglePart(controller, reader, contentType, contentLength, resolve, reject) {

        var status = DicomStatus.CONTINUE;

        try {

            var contentRead = 0;

            // Reset the parser
            this.parser.reset();

            // Keep reading till "done"
            while (status == DicomStatus.CONTINUE) {

                // Read a chunk of data
                const { done, value } = await reader.read();

                // Increment the total content read
                contentRead += ((value != null) ? value.length : 0);

                // Break if there is no more data
                if (done) {

                    // Finalize the current parse
                    status = await this.parser.parse(value, done, contentRead, contentLength);

                    // Break the stream looop
                    break;

                }

                // Parse the DICOM
                status = await this.parser.parse(value, false, contentRead, contentLength);

            }

            // Close the stream
            controller.close();
            reader.releaseLock();

            // Resolve with a singe parser result
            if (status == DicomStatus.SUCCESS)
                resolve(this.parser.result);
            else if ((status == DicomStatus.SKIP) || (status == DicomStatus.STOP)) {
                resolve(null);
            }
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
    async processMultiPart(controller, reader, contentType, contentLength, resolve, reject) {

        var doneReading = false;
        var status = DicomStatus.CONTINUE;

        var start = new Date().getTime();

        try {

            var contentRead = 0;

            // The temporary buffer
            var temp = new DicomData();

            // Initialize the first part
            var partHeader = { isComplete: false };

            // Reset the parser
            this.parser.reset();

            // Keep reading till "done"
            while ((status == DicomStatus.CONTINUE) || (status == DicomStatus.SKIP)) {

                // Read a chunk of data
                const { done, value } = await reader.read();

                // Increment the total content read
                contentRead += ((value != null) ? value.length : 0);

                // Append the bytes
                if (value != null) {
                    temp.append(value);
                }

                // Set the DONE flag
                if ((doneReading == false) && ((done == true) || (value == null))) {
                    doneReading = true;
                }

                // While there is MORE data to process
                do {

                    // Get the current length
                    var currentLength = temp.length();

                    // If still processing the part header,
                    if (partHeader.isComplete == false) {
                        
                        // Loop over the bytes
                        for (var i = 0; ((i < temp.length()) && ((i + 1) < temp.length())); i++) {

                            // Access the raw data
                            var data = temp.access();

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

                    // If the header is complete, 
                    if (partHeader.isComplete == true) {

                        // Only process when the buffer has MORE data that the minimal ending boundary
                        if (temp.length() >= (2 + contentType.boundary.length)) {

                            var endIndex = temp.length();
                            var boundaryMatched = false;

                            // Determine if this current buffer contains the end of the part
                            for (var i = 0; i < temp.length(); i++) {

                                // Access the raw data
                                var data = temp.access();

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

                                            // Break the searching
                                            if (boundaryMatched == true) {
                                                break;
                                            }
                
                                        }

                                    }

                                }

                            }

                            // Ensure that IF the boundary was NOT matched, the data needs to be processed
                            if (boundaryMatched == false) {
                                endIndex = temp.length();
                            }

                            if (status == DicomStatus.CONTINUE) {

                                // Continue parsing and consume either the whole buffer or the remaining bytes of the part
                                status = await this.parser.parse(temp.consume(endIndex), boundaryMatched, contentRead, contentLength);

                            }
                            else {

                                // Simply consume the remaining bytes to the next part
                                temp.consume(endIndex);

                            }

                            // Consume any final \r\n
                            if ((temp.access().length >= 2) && (temp.access()[0] == 13) && (temp.access()[1] == 10)) {
                                temp.consume(2);
                            }

                            // If the DICOM was NOT fully parsed, throw error
                            if (status == DicomStatus.FAIL) {
                                throw new DicomException("Failed parsing multiple DICOM data-sets.", DicomErrorCodes.GeneralError)
                            }

                            // If the parsing has STOPPED
                            if (status == DicomStatus.STOP) {
                                break;
                            }

                            // If the DICOM was fully parsed
                            if (status == DicomStatus.SUCCESS) {

                                // Re-Initialize the first part
                                partHeader = { isComplete: false };

                                // Reset the parser
                                this.parser.reset();

                                // Set the status to CONTINUE
                                status = DicomStatus.CONTINUE;

                            }

                            // If we are skipping this part, keep going
                            if (status == DicomStatus.SKIP) {

                                // If currently reached the next boundary
                                if (boundaryMatched == true) {

                                    // Re-Initialize the first part
                                    partHeader = { isComplete: false };

                                    // Reset the parser
                                    this.parser.reset();

                                    // Set the status to CONTINUE
                                    status = DicomStatus.CONTINUE;

                                }
                                
                            }

                        }

                    }

                } while ((temp.length() > 0) && (currentLength > temp.length()));

                // If the parsing has STOPPED
                if (status == DicomStatus.STOP) {
                    break;
                }

                // Break if there is no more data
                if ((doneReading == true) && (temp.length() < (2 + contentType.boundary.length + 2 + DicomConstants.PreambleLength))) {

                    // Break the stream loop
                    break;

                }

            }

            // Close the stream
            controller.close();
            reader.releaseLock();

            // Resolve with a singe parser result
            resolve(this.parser.result);

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
    readUrl(url) {

        // Establish that
        var that = this;

        // Return the promise
        return new Promise(function(resolve, reject) {

            var contentType = {};
            var contentLength = null;

            // Fetch the DICOM file
            fetch(url, {
                method: 'GET'
            })
            .then(response => { 

                // Parse the Content-Type header
                contentType = that.parseContentType(response);

                // Establish the Content-Length
                contentLength = response.headers.get("content-length");

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
                                that.processSinglePart(controller, reader, contentType, contentLength, resolve, reject);
                            }
                            else {
                                that.processMultiPart(controller, reader, contentType, contentLength, resolve, reject);
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

    };

    /**
     * Read a DICOM instance from the specified data.
     * @param {*} data The specified data.
     * @returns A Promise that resolves to the result from the DICOM parse operation.
     */
    readData(data) {

        // Establish that
        var that = this;

        // Return the promise
        return new Promise(async function(resolve, reject) {
            
            try {

                // Reset the parser
                that.parser.reset();

                // Finalize the current parse
                var status = await that.parser.parse(data, true);

                // Resolve with a singe parser result
                if (status == DicomStatus.SUCCESS)
                    resolve(that.parser.result);
                else if ((status == DicomStatus.SKIP) || (status == DicomStatus.STOP)) {
                    resolve(null);
                }        
                else
                    reject(new DicomException("Failed parsing single DICOM data-set.", DicomErrorCodes.GeneralError));
                
            }
            catch (err) {
                reject(err);
            }
    
        });

    };

    /**
     * Read a DICOM instance from the specified source of data.
     * @param {*} source The specified source of data.
     * @returns A Promise that resolves to the result from the DICOM parse operation.
     */
    read(source) {
        if (typeof source === 'string')
            return this.readUrl(source);
        return this.readData(source);
    };

    // The constructor
    constructor(parser) {
        this.parser = parser;
    }

};