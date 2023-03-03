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

    read(url) {

        // Establish that
        var that = this;

        // Fetch the DICOM file
        fetch(url)
            .then(response => response.body)
            .then(rs => {

                // Get the reader
                const reader = rs.getReader();

                // Create the readable stream
                return new ReadableStream({
                    async start(controller) {

                        // Keep reading till "done"
                        while (true) {

                            // Read a chunk of data
                            const { done, value } = await reader.read();

                            // Break if there is no more data
                            if (done) {

                                // Finalize the current parse
                                that.parser.parse(value, done);

                                // Break the stream looop
                                break;

                            }

                            // Parse the DICOM
                            that.parser.parse(value);

                        }

                        // Close the stream
                        controller.close();
                        reader.releaseLock();

                        alert('done');
                        
                    }
                });

            })
            .catch(that.error);

    }

    // The constructor
    constructor(dicomParser, onError) {
        this.parser = dicomParser;
        this.error = onError;
    }

}
