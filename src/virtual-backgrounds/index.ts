import { AVQOL } from "../avqol"
import { VirtualBackground } from "../constants"
import { debug } from "../debug"
import blur from "./blur"
import custom, { renderOptions as renderCustomBackgroundOptions } from "./custom"


Hooks.on("AVQOL.init", function(avqol: AVQOL) {
    debug('initializing AVQOL virtual backgrounds')
    avqol.registerVirtualBackground(VirtualBackground.BLUR, {
        label: "AVQOL.VirtualBackgroundBlurBackground",
        render: blur
    })
    avqol.registerVirtualBackground(VirtualBackground.CUSTOM, {
        label: "AVQOL.VirtualBackgroundCustomBackground",
        render: custom,
        renderOptions: renderCustomBackgroundOptions
    })
})
