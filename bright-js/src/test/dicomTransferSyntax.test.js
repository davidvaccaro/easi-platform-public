import DicomTransferSyntax from '../dicomTransferSyntax.js';
import TransferSyntaxes from '../dicomTransferSyntax.js';

test("Test: Find All Transfer Syntaxes", () => {

    // Loop over the transfer syntaxes
    for (id in TransferSyntaxes) {
        expect(DicomTransferSyntax.find(id).ID).toBe(id);
    }

});