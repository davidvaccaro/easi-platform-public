//
// WebSocketStreamReader.js - 1.0.0
//
// WebSocketStreamReader Class
//

import Exception from '../environment/Exception.js';
import { GeneralErrorCodes } from '../environment/Exception.js';
import PartStreamReader from './PartStreamReader.js';

export default class WebSocketStreamReader {

    /**
     * Determine if value appears to be a socket-like object.
     * @param {object} value Candidate socket.
     * @returns {boolean} TRUE if socket-like.
     */
    isSocket(value) {
        return ((value != null) && (typeof value.send === 'function'));
    }

    /**
     * Convert one websocket message payload to bytes.
     * @param {unknown} value Message payload value.
     * @returns {Uint8Array} Normalized bytes.
     */
    toBytes(value) {

        if ((value != null) && (typeof value === 'object') && (value.data != null)) {
            return this.toBytes(value.data);
        }

        if (typeof value === 'string') {
            return (new TextEncoder()).encode(value);
        }

        return this._partReader.toBytes(value);

    }

    /**
     * Create one queue-backed reader that receives websocket events.
     * @param {object} socket The socket object.
     * @param {object | null} options Reader options.
     * @returns {{ reader: object, cleanup: Function }} Reader and cleanup function.
     */
    createSocketReader(socket, options = null) {

        if (options == null) {
            options = {};
        }

        var queue = [];
        var waiters = [];
        var errored = null;
        var done = false;
        var messageCount = 0;
        var maxMessages = options.maxMessages;

        function releaseWaiters() {

            while (waiters.length > 0) {

                var waiter = waiters.shift();

                if (errored != null) {
                    waiter.reject(errored);
                    continue;
                }

                if (queue.length > 0) {
                    waiter.resolve({ done: false, value: queue.shift() });
                    continue;
                }

                if (done == true) {
                    waiter.resolve({ done: true, value: null });
                    continue;
                }

                waiters.unshift(waiter);
                break;

            }

        }

        var onMessage = (event, isBinary) => {

            if (done == true)
                return;

            queue.push(this.toBytes((event != null) ? event : isBinary));
            messageCount++;

            if ((maxMessages != null) && (messageCount >= maxMessages)) {
                done = true;
            }

            releaseWaiters();

        };

        var onError = (error) => {
            errored = error || new Exception('WebSocket read failed.', GeneralErrorCodes.GeneralError);
            releaseWaiters();
        };

        var onClose = () => {
            done = true;
            releaseWaiters();
        };

        if (typeof socket.addEventListener === 'function') {
            socket.addEventListener('message', onMessage);
            socket.addEventListener('error', onError);
            socket.addEventListener('close', onClose);
        }
        else if (typeof socket.on === 'function') {
            socket.on('message', onMessage);
            socket.on('error', onError);
            socket.on('close', onClose);
        }
        else {
            throw new Exception('Invalid WebSocket source. Missing event API.', GeneralErrorCodes.InvalidParameter);
        }

        return {
            reader: {
                read: async function () {

                    if (errored != null)
                        throw errored;

                    if (queue.length > 0)
                        return { done: false, value: queue.shift() };

                    if (done == true)
                        return { done: true, value: null };

                    return await new Promise((resolve, reject) => {
                        waiters.push({ resolve, reject });
                    });

                },
                releaseLock: function () { }
            },
            cleanup: () => {
                if (typeof socket.removeEventListener === 'function') {
                    socket.removeEventListener('message', onMessage);
                    socket.removeEventListener('error', onError);
                    socket.removeEventListener('close', onClose);
                }
                else if (typeof socket.off === 'function') {
                    socket.off('message', onMessage);
                    socket.off('error', onError);
                    socket.off('close', onClose);
                }
                else if (typeof socket.removeListener === 'function') {
                    socket.removeListener('message', onMessage);
                    socket.removeListener('error', onError);
                    socket.removeListener('close', onClose);
                }
            }
        };

    }

    /**
     * Read one socket source.
     * @param {object} socket The socket source.
     * @param {{ contentType?: string | object, contentLength?: number | string | null, maxMessages?: number | null } | null} options Optional read options.
     * @returns {Promise<object>} The parser result.
     */
    async read(socket, options = null) {

        if (this.isSocket(socket) == false) {
            throw new Exception('Invalid WebSocket source. Expected socket-like object.', GeneralErrorCodes.InvalidParameter);
        }

        var scope = this.createSocketReader(socket, options);

        try {
            return await this._partReader.readStream(scope.reader, options);
        }
        finally {
            scope.cleanup();
        }

    }

    /**
     * Set the current parser.
     * @param {DataParser} parser The parser.
     */
    set parser(parser) {
        this._partReader.parser = parser;
    }

    /**
     * Get the current parser.
     * @returns {DataParser} The parser.
     */
    get parser() {
        return this._partReader.parser;
    }

    /**
     * Set the onPart callback.
     * @param {Function | null} onPart The onPart callback.
     */
    set onPart(onPart) {
        this._partReader.onPart = onPart;
    }

    /**
     * Get the onPart callback.
     * @returns {Function | null} The onPart callback.
     */
    get onPart() {
        return this._partReader.onPart;
    }

    /**
     * Create one websocket stream reader.
     * @param {PartStreamReader | null} partReader Optional part reader.
     */
    constructor(partReader = null) {
        this._partReader = (partReader != null) ? partReader : new PartStreamReader();
    }

}

