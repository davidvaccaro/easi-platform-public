//
// CurrentRequestedProcedureEvidenceModule.js
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

import Module from './Module.js';
import Tag from '../Tag.js';

export default class CurrentRequestedProcedureEvidenceModule extends Module {

    /**
     * Gets the top-level Current Requested Procedure Evidence sequence items.
     * @returns {Array<AttributeSet>} The study-level sequence items.
     */
    get items() {
        return this.accessSequenceItems(Tag.CurrentRequestedProcedureEvidenceSequence);
    }

    /**
     * Gets normalized study/series/instance reference details.
     * @returns {Array<object>} The evidence references grouped by study.
     */
    get studies() {

        var studies = [];
        for (var i = 0; i < this.items.length; i++) {

            var studyItem = this.items[i];
            var series = [];

            var referencedSeriesSequence = studyItem.find(Tag.ReferencedSeriesSequence);
            var referencedSeriesItems = (
                (referencedSeriesSequence != null)
                && (Array.isArray(referencedSeriesSequence.items) == true)
            )
                ? referencedSeriesSequence.items
                : [];

            for (var j = 0; j < referencedSeriesItems.length; j++) {

                var seriesItem = referencedSeriesItems[j];
                var instances = [];

                var referencedSopSequence = seriesItem.find(Tag.ReferencedSOPSequence);
                var referencedSopItems = (
                    (referencedSopSequence != null)
                    && (Array.isArray(referencedSopSequence.items) == true)
                )
                    ? referencedSopSequence.items
                    : [];

                for (var k = 0; k < referencedSopItems.length; k++) {
                    instances.push({
                        sopClassUid: referencedSopItems[k].value(Tag.ReferencedSOPClassUID, null),
                        sopInstanceUid: referencedSopItems[k].value(Tag.ReferencedSOPInstanceUID, null)
                    });
                }

                series.push({
                    seriesInstanceUid: seriesItem.value(Tag.SeriesInstanceUID, null),
                    instances: instances
                });

            }

            studies.push({
                studyInstanceUid: studyItem.value(Tag.StudyInstanceUID, null),
                series: series
            });

        }

        return studies;

    }

    /**
     * Gets flattened referenced SOP Instance UIDs.
     * @returns {Array<string>} The SOP Instance UIDs.
     */
    get referencedSopInstanceUids() {

        var result = [];
        var studies = this.studies;

        for (var i = 0; i < studies.length; i++) {
            for (var j = 0; j < studies[i].series.length; j++) {
                for (var k = 0; k < studies[i].series[j].instances.length; k++) {
                    var uid = studies[i].series[j].instances[k].sopInstanceUid;
                    if ((uid != null) && (uid != '')) {
                        result.push(uid);
                    }
                }
            }
        }

        return result;

    }

    /**
     * Constructs a Current Requested Procedure Evidence Module accessor instance.
     * @param {AttributeSet} attributeSet The source attribute set.
     */
    constructor(attributeSet) {
        super(attributeSet);
    }

};
