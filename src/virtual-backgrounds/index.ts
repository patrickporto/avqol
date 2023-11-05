import { AVQOL } from "../api"
import { VirtualBackground } from "../constants"
import { debug } from "../debug"
import blur, { renderOptions as renderBlurOptions, defaultOptions as blurDefaultOptions } from "./blur"
import custom, { renderOptions as renderCustomBackgroundOptions } from "./custom"


Hooks.on("AVQOL.init", function(avqol: AVQOL) {
    debug('initializing AVQOL virtual backgrounds')
    avqol.registerVirtualBackground(VirtualBackground.BLUR, {
        label: "AVQOL.VirtualBackgroundBlurBackground",
        render: blur,
        default: blurDefaultOptions,
        renderOptions: renderBlurOptions
    })
    avqol.registerVirtualBackground(VirtualBackground.CUSTOM, {
        label: "AVQOL.VirtualBackgroundCustomBackground",
        render: custom,
        renderOptions: renderCustomBackgroundOptions
    })
})
