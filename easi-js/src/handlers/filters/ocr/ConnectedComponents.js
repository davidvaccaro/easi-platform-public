//
// ConnectedComponents.js
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

export default class ConnectedComponents {

    /**
     * Resolve one finite integer value.
     * @param {*} value Candidate value.
     * @param {number} fallback Fallback value.
     * @returns {number} Integer value.
     */
    toInteger(value, fallback) {

        var numeric = Number(value);
        if (Number.isFinite(numeric) == false)
            return fallback;

        return Math.floor(numeric);

    }

    /**
     * Clamp one numeric value.
     * @param {number} value Value.
     * @param {number} minimum Minimum value.
     * @param {number} maximum Maximum value.
     * @returns {number} Clamped value.
     */
    clamp(value, minimum, maximum) {
        if (value < minimum)
            return minimum;
        if (value > maximum)
            return maximum;
        return value;
    }

    /**
     * Resolve connectivity (4 or 8).
     * @param {*} connectivity Candidate connectivity.
     * @returns {number} Connectivity value.
     */
    resolveConnectivity(connectivity) {
        return (this.toInteger(connectivity, 8) == 4) ? 4 : 8;
    }

    /**
     * Push one valid unvisited pixel index into DFS stack.
     * @param {number[]} stack DFS stack.
     * @param {Uint8Array} mask Binary mask.
     * @param {Uint8Array} visited Visited bitmap.
     * @param {number} index Pixel index.
     */
    pushNeighbor(stack, mask, visited, index) {

        if ((index < 0) || (index >= mask.length))
            return;

        if ((mask[index] == 0) || (visited[index] == 1))
            return;

        visited[index] = 1;
        stack.push(index);

    }

    /**
     * Find connected components for one binary mask.
     * @param {Uint8Array} mask Binary mask.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @param {object} options Search options.
     * @returns {Array<object>} Component list.
     */
    find(mask, columns, rows, options = {}) {

        if ((mask instanceof Uint8Array) == false)
            return [];

        var normalizedColumns = Math.max(1, this.toInteger(columns, 1));
        var normalizedRows = Math.max(1, this.toInteger(rows, 1));
        var pixelCount = (normalizedColumns * normalizedRows);

        if (mask.length < pixelCount)
            return [];

        var connectivity = this.resolveConnectivity(options.connectivity);
        var maxComponents = Math.max(1, this.toInteger(options.maxComponents, 32768));

        var visited = new Uint8Array(pixelCount);
        var components = [];
        var stack = [];

        for (var index = 0; index < pixelCount; index++) {

            if ((mask[index] == 0) || (visited[index] == 1))
                continue;

            visited[index] = 1;
            stack.length = 0;
            stack.push(index);

            var minX = normalizedColumns;
            var minY = normalizedRows;
            var maxX = 0;
            var maxY = 0;
            var area = 0;

            while (stack.length > 0) {
                var current = stack.pop();
                var y = Math.floor(current / normalizedColumns);
                var x = (current - (y * normalizedColumns));

                area += 1;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);

                this.pushNeighbor(stack, mask, visited, current - 1);
                this.pushNeighbor(stack, mask, visited, current + 1);
                this.pushNeighbor(stack, mask, visited, current - normalizedColumns);
                this.pushNeighbor(stack, mask, visited, current + normalizedColumns);

                if (connectivity == 8) {
                    this.pushNeighbor(stack, mask, visited, current - normalizedColumns - 1);
                    this.pushNeighbor(stack, mask, visited, current - normalizedColumns + 1);
                    this.pushNeighbor(stack, mask, visited, current + normalizedColumns - 1);
                    this.pushNeighbor(stack, mask, visited, current + normalizedColumns + 1);
                }
            }

            var width = ((maxX - minX) + 1);
            var height = ((maxY - minY) + 1);
            components.push({
                x: minX,
                y: minY,
                width: width,
                height: height,
                area: area
            });

            if (components.length >= maxComponents)
                break;
        }

        return components;

    }

};
