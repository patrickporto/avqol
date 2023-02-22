import { AVQOLSettings } from "./avsettings";
import { CANONICAL_NAME, OpenSettings, VideoEffect } from "./constants"
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
        const videoEffects: Record<string, string> = {
            [VideoEffect.NONE]: (game as Game).i18n.localize("None"),
        };
        for (const [name, config] of Object.entries(this.videoEffects)) {
            videoEffects[name] = (game as Game).i18n.localize(config.label);
        }
        return videoEffects;
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
        icon: 'fas fa-headset',
        // @ts-ignore
        type: AVQOLSettings,
    });
    (game as Game).settings.register(CANONICAL_NAME, 'openSettings', {
        name: (game as Game).i18n.localize('AVQOL.OpenSettings'),
        hint: (game as Game).i18n.localize('AVQOL.OpenSettingsHint'),
        scope: 'world',
        requiresReload: true,
        config: true,
        type: String,
        default: OpenSettings.EVERY_STARTUP,
        // @ts-ignore
        choices: {
            [OpenSettings.MANUAL]: (game as Game).i18n.localize('AVQOL.OpenSettingsManual'),
            [OpenSettings.EVERY_STARTUP]: (game as Game).i18n.localize('AVQOL.OpenSettingsEveryStartup'),
        }
    });
}

export const shouldOpenSettings = () => {
    return (game as Game).settings.get(CANONICAL_NAME, 'openSettings') === OpenSettings.EVERY_STARTUP;
}
