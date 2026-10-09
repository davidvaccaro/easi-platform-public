import DimseAssociationWriter from '../../src/writers/DimseAssociationWriter.js';

test('C-STORE batch preserves an earlier warning even when the last store succeeds', async () => {
    const transport = { write: jest.fn().mockResolvedValueOnce({ ok: true, status: 'Warning', dimseStatus: 0xB000, bytesWritten: 2 }).
        mockResolvedValueOnce({ ok: true, status: 'Success', dimseStatus: 0, bytesWritten: 3 }) };
    const result = await new DimseAssociationWriter(transport).write({}, [new Uint8Array([1]), new Uint8Array([2])]);
    expect(result).toMatchObject({ ok: true, status: 'Warning', dimseStatus: 0xB000, bytesWritten: 5,
        metadata: { count: 2, attempted: 2, completed: 1, failed: 0, warning: 1 } });
});

test.each([0xA700, 0xB000])('C-STORE batch counts only attempted suboperations after a failure (%i)', async (dimseStatus) => {
    const transport = { write: jest.fn().mockResolvedValueOnce({ ok: true, status: 'Success', dimseStatus: 0, bytesWritten: 2 }).
        mockResolvedValueOnce({ ok: false, status: 'Failure', dimseStatus, bytesWritten: 3 }) };
    const result = await new DimseAssociationWriter(transport).write({}, [
        new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])
    ]);
    expect(transport.write).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: false, status: 'Failure', dimseStatus,
        metadata: { count: 3, attempted: 2, completed: 1, failed: 1, warning: 0 } });
});
