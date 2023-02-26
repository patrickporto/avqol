import { AVQOLSettings } from "./avsettings";
import { CANONICAL_NAME, OpenSettings, VideoEffect } from "./constants";
import { CameraEffect, VideoEffectRender } from "./camera-effects";
import { debug } from "./debug";
import { getRTCWorldSettings } from "./rtcsettings";

type VideoEffectConfig = {
    label: string;
    render: VideoEffectRender;
};

export class AVQOL {
    private videoEffects: Record<string, VideoEffectConfig> = {};
    public allowPlay = true
    private cameraEffect: null | CameraEffect = null;

    openSettings() {
        new AVQOLSettings("avqolSettings").render(true);
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

    setCameraEffect(cameraEffect: CameraEffect) {
        this.cameraEffect = cameraEffect;
    }

    getCameraEffect(): CameraEffect | null {
        return this.cameraEffect;
    }

    getCurrentVideoEffect(): string {
        return this.cameraEffect?.videoEffect ?? VideoEffect.NONE;
    }
}

export const registerAVQOLAPI = () => {
    // @ts-ignore
    (game as Game).modules.get(CANONICAL_NAME).api = new AVQOL();
};

export const getAVQOLAPI = (): AVQOL => {
    // @ts-ignore
    return (game as Game).modules.get(CANONICAL_NAME).api as AVQOL;
};

export const registerSettings = () => {
    (game as Game).settings.registerMenu(CANONICAL_NAME, "avqolSettings", {
        name: (game as Game).i18n.localize("AVQOL.MenuConfigutation"),
        label: (game as Game).i18n.localize("AVQOL.MenuConfigutationLabel"),
        hint: (game as Game).i18n.localize("AVQOL.MenuConfigutationHint"),
        icon: "fas fa-headset",
        // @ts-ignore
        type: AVQOLSettings,
    });

    const openSettingsOptions: Record<string, string> = {
        [OpenSettings.MANUAL]: (game as Game).i18n.localize(
            "AVQOL.OpenSettingsManual"
        ),
        [OpenSettings.EVERY_STARTUP]: (game as Game).i18n.localize(
            "AVQOL.OpenSettingsEveryStartup"
        ),
        [OpenSettings.EVERY_STARTUP_FORCED]: (game as Game).i18n.localize(
            "AVQOL.OpenSettingsEveryStartupForced"
        ),
    };

    (game as Game).settings.register(CANONICAL_NAME, "openSettings", {
        name: (game as Game).i18n.localize("AVQOL.OpenSettings"),
        hint: (game as Game).i18n.localize("AVQOL.OpenSettingsHint"),
        scope: "world",
        requiresReload: true,
        config: true,
        type: String,
        default: OpenSettings.EVERY_STARTUP,
        choices: openSettingsOptions,
    });
};

export const shouldOpenSettings = () => {
    return [
        OpenSettings.EVERY_STARTUP,
        OpenSettings.EVERY_STARTUP_FORCED,
    ].includes((game as Game).settings.get(CANONICAL_NAME, "openSettings") as OpenSettings);
};

export const isForcedOpenSettings = () => {
    return (game as Game).settings.get(CANONICAL_NAME, "openSettings") === OpenSettings.EVERY_STARTUP_FORCED;
};
