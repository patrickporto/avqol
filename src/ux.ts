import { CANONICAL_NAME } from "./constants";
import { debug } from "./debug";


export const registerSettings = () => {
    (game as Game).settings.register(CANONICAL_NAME, "disableHideUser", {
        name: "AVQOL.UserExperienceDisableHideUser",
        hint: "AVQOL.UserExperienceDisableHideUserHint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
        onChange: () => {
            const cameraViews = ui.webrtc?.element;
            if (cameraViews) {
                updateHideUserButton(cameraViews);
            }
        }
    });
    (game as Game).settings.register(CANONICAL_NAME, "disablePopout", {
        name: "AVQOL.UserExperienceDisablePopout",
        hint: "AVQOL.UserExperienceDisablePopoutHint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
        onChange: () => {
            const cameraViews = ui.webrtc?.element;
            if (cameraViews) {
                updateDisablePopoutButton(cameraViews);
            }
        }
    });
};

export const getDisableHideUser = (): string => {
    return (game as Game).settings.get(
        CANONICAL_NAME,
        "disableHideUser"
    ) as string;
};

export const getDisablePopout = (): string => {
    return (game as Game).settings.get(
        CANONICAL_NAME,
        "disablePopout"
    ) as string;
};

const updateHideUserButton = (html: JQuery<HTMLElement>) => {
    if (getDisableHideUser()) {
        debug("Disabling hide user button");
        html.find('.av-control[data-action="hide-user"]').addClass('avqol-control--disabled');
    } else {
        debug("Enabling hide user button");
        html.find('.av-control[data-action="hide-user"]').removeClass('avqol-control--disabled');
    }
};

const updateDisablePopoutButton = (html: JQuery<HTMLElement>) => {
    if (getDisablePopout()) {
        debug("Disabling popout button");
        html.find('.av-control[data-action="toggle-popout"]').addClass('avqol-control--disabled');
    } else {
        debug("Enabling popout button");
        html.find('.av-control[data-action="toggle-popout"]').removeClass('avqol-control--disabled');
    }
};


Hooks.on(
    "renderCameraViews",
    async (_: any, html: JQuery<HTMLElement>) => {
        updateHideUserButton(html);
        updateDisablePopoutButton(html);
    }
);
