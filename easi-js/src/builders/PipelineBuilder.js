//
// PipelineBuilder.js - 1.0.0
//
// Staged Pipeline Builder Entry Point
//

import PipelineBuildSession from "./PipelineBuildSession.js";
import PipelineSourceStage from "./stages/PipelineSourceStage.js";

/**
 * Public staged pipeline builder entry point.
 *
 * The fluent flow is intentionally staged:
 * `from*` -> `of*` -> `with*` -> `to*` -> `[into*]` -> `build()`.
 */
export default class PipelineBuilder extends PipelineSourceStage {

    /**
     * Construct a new staged pipeline builder.
     */
    constructor() {
        super(new PipelineBuildSession());
    }

}
