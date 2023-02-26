import { AVQOL } from "../avqol"
import { VirtualBackground } from "../constants"
import { debug } from "../debug"
import blur from "./blur"


Hooks.on("AVQOL.init", function(avqol: AVQOL) {
    debug('initializing AVQOL virtual backgrounds')
    avqol.registerVirtualBackground(VirtualBackground.BLUR_BACKGROUND, {
        label: "AVQOL.VirtualBackgroundBlurBackground",
        render: blur
    })
})
