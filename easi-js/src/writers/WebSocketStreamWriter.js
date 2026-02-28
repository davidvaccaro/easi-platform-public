//
// WebSocketStreamWriter.js - 1.0.0
//
// WebSocketStreamWriter Class
//

import Exception from '../environment/Exception.js';
import { GeneralErrorCodes } from '../environment/Exception.js';
import PartStreamWriter from './PartStreamWriter.js';

export default class WebSocketStreamWriter {

    /**
     * Wait for a socket to become OPEN.
     * @param {object} socket The socket object.
     */
    async waitForOpen(socket) {

        // Browser and ws both use readyState OPEN=1.
        if ((socket == null) || (typeof socket.send !== 'function')) {
            throw new Exception('Invalid WebSocket target.', GeneralErrorCodes.InvalidParameter);
        }

        if ((socket.readyState == null) || (socket.readyState === 1))
            return;

        if (socket.readyState !== 0) {
            throw new Exception('WebSocket is not open.', GeneralErrorCodes.GeneralError);
        }

        await new Promise((resolve, reject) => {

            var onOpen = () => {
                cleanup();
                resolve();
            };

            var onError = (err) => {
                cleanup();
                reject(err || new Exception('WebSocket open failed.', GeneralErrorCodes.GeneralError));
            };

            var onClose = () => {
                cleanup();
                reject(new Exception('WebSocket closed before opening.', GeneralErrorCodes.GeneralError));
            };

            var cleanup = () => {
                if (typeof socket.removeEventListener === 'function') {
                    socket.removeEventListener('open', onOpen);
                    socket.removeEventListener('error', onError);
                    socket.removeEventListener('close', onClose);
                }
                else if (typeof socket.off === 'function') {
                    socket.off('open', onOpen);
                    socket.off('error', onError);
                    socket.off('close', onClose);
                }
            };

            if (typeof socket.addEventListener === 'function') {
                socket.addEventListener('open', onOpen);
                socket.addEventListener('error', onError);
                socket.addEventListener('close', onClose);
            }
            else if (typeof socket.on === 'function') {
                socket.on('open', onOpen);
                socket.on('error', onError);
                socket.on('close', onClose);
            }
            else {
                reject(new Exception('Invalid WebSocket target. Missing event API.', GeneralErrorCodes.InvalidParameter));
            }

        });

    }

    /**
     * Write one payload to a socket destination.
     * @param {object} socket The socket destination.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {{ closeOnDone?: boolean } | null} options Optional write options.
     * @returns {Promise<object>} The write result.
     */
    async write(socket, source, options = null) {

        if (options == null) {
            options = {};
        }

        await this.waitForOpen(socket);

        var existingOnChunk = options.onChunk || null;
        var writerOptions = Object.assign({}, options, {
            collectOutput: false,
            onChunk: async (chunk) => {
                socket.send(chunk);
                if (existingOnChunk != null) {
                    await existingOnChunk(chunk);
                }
            }
        });

        var result = await this._partWriter.write(source, writerOptions);

        if ((options.closeOnDone == true) && (typeof socket.close === 'function')) {
            socket.close();
        }

        return result;

    }

    /**
     * Create one websocket stream writer.
     * @param {{ onChunk?: Function, collectOutput?: boolean, chunkSize?: number } | null} options Writer options.
     */
    constructor(options = null) {
        this._partWriter = new PartStreamWriter(options);
    }

}

