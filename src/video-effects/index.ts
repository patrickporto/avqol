import { AVQOL, getAVQOLAPI } from "../avqol"
import { VideoEffect } from "../constants"
import { debug } from "../debug"
import blur from "./blur"


Hooks.on("AVQOL.init", function(avqol: AVQOL) {
    debug('initializing AVQOL video effects')
    avqol.registerVideoEffect(VideoEffect.BLUR_BACKGROUND, {
        label: (game as Game).i18n.localize(
            "AVQOL.VideoEffectsBlurBackground"
        ),
        render: blur
    })
})
