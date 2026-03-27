//
// CurrentRequestedProcedureEvidenceModule.js - 1.0.0
//
// DICOM Current Requested Procedure Evidence Module Class
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
