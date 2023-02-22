import { AVQOLSettings } from "./avsettings";
import { CANONICAL_NAME, VideoEffect } from "./constants"
import { VideoEffectRender } from "./camera-effects";

type VideoEffectConfig = {
    label: string;
    render: VideoEffectRender;
}

export class AVQOL {
    private videoEffects: Record<string, VideoEffectConfig> = {};

    openSettings() {
        new AVQOLSettings('avqolSettings').render(true);
    }

    registerVideoEffect(name: string, videoEffectConfig: VideoEffectConfig) {
        this.videoEffects[name] = videoEffectConfig;
    }

    getVideoEffects(): Record<string, string> {
        return {
            [VideoEffect.NONE]: (game as Game).i18n.localize("None"),
            ...this.videoEffects
        };
    }

    getVideoEffectRender(name: string): VideoEffectRender | null {
        return this.videoEffects[name]?.render ?? null;
    }
}

export const registerAVQOLAPI = () => {
    // @ts-ignore
    (game as Game).modules.get(CANONICAL_NAME).api = new AVQOL()
}

export const getAVQOLAPI = () => {
    // @ts-ignore
    return (game as Game).modules.get(CANONICAL_NAME).api;
}


export const registerSettings = () => {
    (game as Game).settings.registerMenu(CANONICAL_NAME, 'avqolSettings', {
        name: (game as Game).i18n.localize('AVQOL.MenuConfigutation'),
        label: (game as Game).i18n.localize('AVQOL.MenuConfigutationLabel'),
        hint: (game as Game).i18n.localize('AVQOL.MenuConfigutationHint'),
        // scope: 'client',
        // requiresReload: true,
        icon: 'fas fa-headset',
        // @ts-ignore
        type: AVQOLSettings,
    });
}
