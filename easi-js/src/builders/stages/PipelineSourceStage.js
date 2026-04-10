//
// PipelineSourceStage.js
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

import PartStreamReader from "../../readers/PartStreamReader.js";
import HttpStreamReader from "../../readers/HttpStreamReader.js";
import ByteStreamReader from "../../readers/ByteStreamReader.js";
import FileStreamReader from "../../readers/FileStreamReader.js";
import WebSocketStreamReader from "../../readers/WebSocketStreamReader.js";
import NodeStreamAdapterReader from "../../readers/NodeStreamAdapterReader.js";
import DimseAssociationReader from "../../readers/DimseAssociationReader.js";

import PipelineBuilderStage from "./PipelineBuilderStage.js";
import PipelineFormatStage from "./PipelineFormatStage.js";

/**
 * Source stage.
 *
 * Responsible for source transport/framing (`from*`) only.
 * Parser format selection is intentionally hosted in `PipelineFormatStage`.
 */
export default class PipelineSourceStage extends PipelineBuilderStage {

    /**
     * Set the current reader.
     * @param {object} reader The reader used to process source input.
     * @param {*} source Optional default source bound at build-time.
     * @param {object | null} options Optional default source options bound at build-time.
     * @returns {PipelineFormatStage} A format stage reference.
     */
    withReader(reader, source = null, options = null) {
        return this.nextStage(
            (session) => session.withReader(reader, source, options),
            PipelineFormatStage
        );
    }

    /** @returns {PipelineFormatStage} */
    fromPartStream(source = null, options = null) {
        return this.withReader(new PartStreamReader(), source, options);
    }

    /** @returns {PipelineFormatStage} */
    fromHttpStream(source = null, options = null) {
        return this.withReader(new HttpStreamReader(new PartStreamReader()), source, options);
    }

    /** @returns {PipelineFormatStage} */
    fromByteStream(source = null, options = null) {
        return this.withReader(new ByteStreamReader(new PartStreamReader()), source, options);
    }

    /** @returns {PipelineFormatStage} */
    fromFileStream(source = null, options = null) {
        return this.withReader(new FileStreamReader(new PartStreamReader()), source, options);
    }

    /** @returns {PipelineFormatStage} */
    fromWebSocketStream(source = null, options = null) {
        return this.withReader(new WebSocketStreamReader(new PartStreamReader()), source, options);
    }

    /** @returns {PipelineFormatStage} */
    fromNodeStreamAdapter(source = null, options = null) {
        return this.withReader(new NodeStreamAdapterReader(new PartStreamReader()), source, options);
    }

    /**
     * Set the source transport to DIMSE association input.
     * @param {object | null} association Default DIMSE source association options.
     * @param {object | null} transport DIMSE source transport adapter.
     * @returns {PipelineFormatStage}
     */
    fromDimseAssociation(association = null, transport = null) {
        return this.withReader(new DimseAssociationReader(association, transport, new PartStreamReader()), association, null);
    }

}
