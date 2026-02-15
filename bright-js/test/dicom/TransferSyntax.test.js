import TransferSyntax from '../../src/dicom/TransferSyntax.js';
import { TransferSyntaxes } from '../../src/dicom/TransferSyntax.js';

test("Test: Find All Transfer Syntaxes", () => {

    // Loop over the transfer syntaxes
    for (var id in TransferSyntaxes) {
        expect(TransferSyntax.find(id).ID).toBe(id);
    }

});