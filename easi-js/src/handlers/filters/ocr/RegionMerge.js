//
// RegionMerge.js
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

export default class RegionMerge {

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
     * Determine whether two regions overlap or are near enough to merge.
     * @param {object} first First region.
     * @param {object} second Second region.
     * @param {number} gapX Horizontal merge gap.
     * @param {number} gapY Vertical merge gap.
     * @returns {boolean} TRUE when merge is allowed.
     */
    intersectsOrNear(first, second, gapX, gapY) {

        var firstRight = first.x + first.width;
        var firstBottom = first.y + first.height;
        var secondRight = second.x + second.width;
        var secondBottom = second.y + second.height;

        if ((firstRight + gapX) < second.x)
            return false;
        if ((secondRight + gapX) < first.x)
            return false;
        if ((firstBottom + gapY) < second.y)
            return false;
        if ((secondBottom + gapY) < first.y)
            return false;

        return true;

    }

    /**
     * Merge two regions into one union region.
     * @param {object} first First region.
     * @param {object} second Second region.
     * @returns {object} Merged region.
     */
    merge(first, second) {

        var left = Math.min(first.x, second.x);
        var top = Math.min(first.y, second.y);
        var right = Math.max(first.x + first.width, second.x + second.width);
        var bottom = Math.max(first.y + first.height, second.y + second.height);

        return {
            x: left,
            y: top,
            width: (right - left),
            height: (bottom - top)
        };

    }

    /**
     * Merge nearby regions.
     * @param {Array<object>} regions Input regions.
     * @param {object} options Merge options.
     * @returns {Array<object>} Merged region list.
     */
    mergeAll(regions, options = {}) {

        if (Array.isArray(regions) == false)
            return [];

        var gapX = Math.max(0, this.toInteger(options.gapX, 12));
        var gapY = Math.max(0, this.toInteger(options.gapY, 8));

        var merged = [];
        for (var index = 0; index < regions.length; index++) {
            var region = regions[index];
            if (region == null)
                continue;

            merged.push({
                x: this.toInteger(region.x, 0),
                y: this.toInteger(region.y, 0),
                width: Math.max(0, this.toInteger(region.width, 0)),
                height: Math.max(0, this.toInteger(region.height, 0))
            });
        }

        if (merged.length <= 1)
            return merged;

        var changed = true;
        while (changed == true) {
            changed = false;

            for (var firstIndex = 0; firstIndex < merged.length; firstIndex++) {
                var first = merged[firstIndex];
                var didMerge = false;

                for (var secondIndex = firstIndex + 1; secondIndex < merged.length; secondIndex++) {
                    var second = merged[secondIndex];
                    if (this.intersectsOrNear(first, second, gapX, gapY) != true)
                        continue;

                    merged[firstIndex] = this.merge(first, second);
                    merged.splice(secondIndex, 1);
                    changed = true;
                    didMerge = true;
                    break;
                }

                if (didMerge == true)
                    break;
            }
        }

        return merged;

    }

};
