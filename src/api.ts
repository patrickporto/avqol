import { CANONICAL_NAME, VirtualBackground } from "./constants";
import { CameraEffect, VirtualBackgroundRender } from "./camera-effects";

type VirtualBackgroundRenderOptions = (
    virtualBackgroundOptionsElement: JQuery<HTMLElement>,
    data: Record<string, any>
) => void;

type VirtualBackgroundConfig = {
    label: string;
    default?: Record<string, any>;
    render: VirtualBackgroundRender;
    renderOptions?: VirtualBackgroundRenderOptions;
};

export class AVQOL {
    private virtualBackgrounds: Record<string, VirtualBackgroundConfig> = {};
    public allowPlay = true;
    private cameraEffect: null | CameraEffect = null;

    registerVirtualBackground(
        name: string,
        virtualBackgroundConfig: VirtualBackgroundConfig
    ) {
        this.virtualBackgrounds[name] = virtualBackgroundConfig;
    }

    getVirtualBackgrounds(): Record<string, string> {
        const virtualBackgrounds: Record<string, string> = {
            [VirtualBackground.NONE]: (game as Game).i18n.localize("None"),
        };
        for (const [name, config] of Object.entries(this.virtualBackgrounds)) {
            virtualBackgrounds[name] = (game as Game).i18n.localize(
                config.label
            );
        }
        return virtualBackgrounds;
    }

    getVirtualBackgroundDefaultOptions(name: string): Record<string, any> {
        return this.virtualBackgrounds[name]?.default ?? {};
    }

    getVirtualBackgroundRender(name: string): VirtualBackgroundRender | null {
        return this.virtualBackgrounds[name]?.render ?? null;
    }

    getVirtualBackgroundRenderOptions(
        name: string
    ): VirtualBackgroundRenderOptions | null {
        return this.virtualBackgrounds[name]?.renderOptions ?? null;
    }

    setCameraEffect(cameraEffect: CameraEffect) {
        this.cameraEffect = cameraEffect;
    }

    getCameraEffect(): CameraEffect | null {
        return this.cameraEffect;
    }

    getCurrentVirtualBackground(): string {
        return this.cameraEffect?.virtualBackground ?? VirtualBackground.NONE;
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
    (game as Game).settings.register(CANONICAL_NAME, "defaultVirtualBackgroundPath", {
        name: (game as Game).i18n.localize("AVQOL.DefaultVirtualBackgroundPath"),
        hint: (game as Game).i18n.localize("AVQOL.DefaultVirtualBackgroundPathHint"),
        scope: "world",
        requiresReload: false,
        config: true,
        type: String,
        default: 'data',
        // @ts-ignore
        filePicker: 'folder',
    });
};

export const getDefaultVirtualBackgroundPath = (): string => {
    return (game as Game).settings.get(CANONICAL_NAME, "defaultVirtualBackgroundPath") as string;
};
