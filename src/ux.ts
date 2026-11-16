// @ts-ignore
import { libWrapper } from "./third-party/libwrapper-shim.js";
import { CANONICAL_NAME, TEMPLATE_PATH, VoiceButton } from "./constants";
import { debug } from "./debug";

// Settings that hide core camera controls. Each one toggles a class on
// <body>, and the stylesheet hides the matching buttons - so it keeps
// working across camera re-renders and pop-outs without touching the DOM
// that core owns.
const CAMERA_CONTROL_SETTINGS: Record<string, { cssClass: string; label: string; default: boolean }> = {
    disableHideUser: {
        cssClass: "avqol-disable-hide-user",
        label: "AVQOL.UserExperienceDisableHideUser",
        default: true,
    },
    disablePopout: {
        cssClass: "avqol-disable-popout",
        label: "AVQOL.UserExperienceDisablePopout",
        default: true,
    },
    disableBlockUserAV: {
        cssClass: "avqol-disable-block-user-av",
        label: "AVQOL.UserExperienceDisableBlockUserAV",
        default: false,
    },
};

const updateCameraControlClasses = () => {
    for (const [key, { cssClass }] of Object.entries(CAMERA_CONTROL_SETTINGS)) {
        const disabled = (game as Game).settings.get(CANONICAL_NAME, key) as boolean;
        document.body.classList.toggle(cssClass, disabled);
    }
};

Hooks.once("ready", updateCameraControlClasses);

export const registerSettings = () => {
    for (const [key, config] of Object.entries(CAMERA_CONTROL_SETTINGS)) {
        (game as Game).settings.register(CANONICAL_NAME, key, {
            name: config.label,
            hint: `${config.label}Hint`,
            scope: "world",
            config: true,
            default: config.default,
            type: Boolean,
            onChange: updateCameraControlClasses,
        });
    }
    (game as Game).settings.register(CANONICAL_NAME, "voiceButton", {
        name: (game as Game).i18n.localize("AVQOL.UserExperienceVoiceButton"),
        hint: (game as Game).i18n.localize(
            "AVQOL.UserExperienceVoiceButtonHint"
        ),
        scope: "world",
        requiresReload: true,
        config: true,
        type: String,
        default: VoiceButton.ENHANCED,
        //@ts-ignore
        choices: {
            [VoiceButton.STANDARD]: (game as Game).i18n.localize(
                "AVQOL.UserExperienceVoiceButtonStandard"
            ),
            [VoiceButton.ENHANCED]: (game as Game).i18n.localize(
                "AVQOL.UserExperienceVoiceButtonEnhanced"
            ),
        },
    });
};

export const getVoiceButton = (): VoiceButton => {
    return (game as Game).settings.get(
        CANONICAL_NAME,
        "voiceButton"
    ) as VoiceButton;
};


const activatePushToTalkButtonListeners = (
    pushToTalkButton: JQuery<HTMLElement>
) => {
    const webrtc = (game as Game).webrtc as AVMaster;

    pushToTalkButton.toggleClass("avqol-pushtotalk--disabled", !webrtc.canUserBroadcastAudio((game as Game).userId as string))

    pushToTalkButton.off("click");
    pushToTalkButton.off("mousedown");
    pushToTalkButton.off("mouseup");

    if (webrtc.client.isVoicePTT) {
        // @ts-ignore
        pushToTalkButton.on("mousedown", webrtc._onPTTStart.bind(webrtc));
        // @ts-ignore
        pushToTalkButton.on("mouseup", webrtc._onPTTEnd.bind(webrtc));
        // @ts-ignore
        webrtc._onPTTEnd.bind(webrtc)();
    } else {
        pushToTalkButton.on("click", async () => {
            const userSettings = webrtc.settings.getUser((game as Game).userId as string);
            const nextState = !userSettings?.muted;
            await webrtc.settings.set("client", `users.${(game as Game).userId}.muted`, nextState);
        });
        webrtc.client.toggleAudio(webrtc.client.isVoiceAlways)
        webrtc.broadcast(webrtc.client.isVoiceAlways);
    }
};

const renderPushToTalkButton = async (hotbar: JQuery<HTMLElement>) => {
    const container = hotbar.parent();
    let pushToTalkButton = container.find("#avqol-pushtotalk");
    if (pushToTalkButton.length > 0) {
        activatePushToTalkButtonListeners(pushToTalkButton);
        return;
    }
    debug("Rendering push to talk button");
    container.addClass("avqol-pushtotalk__container");
    const template = await getTemplate(`${TEMPLATE_PATH}/pushtotalk.hbs`);
    hotbar.after(template({}));
    pushToTalkButton = container.find("#avqol-pushtotalk");

    activatePushToTalkButtonListeners(pushToTalkButton);
};

const setPushToTalkButtonSpeaking = (
    hotbar: JQuery<HTMLElement>,
    speaking: boolean
) => {
    const pushToTalkButton = hotbar.parent().find("#avqol-pushtotalk");
    if (pushToTalkButton.length === 0) {
        return;
    }
    pushToTalkButton.toggleClass("avqol-pushtotalk--speaking", speaking);
};

const updatePushToTalkButtonBroadcasting = (
    hotbar: JQuery<HTMLElement>,
    intent: boolean = true
) => {
    const pushToTalkButton = hotbar.parent().find("#avqol-pushtotalk");
    if (pushToTalkButton.length === 0) {
        return;
    }
    const webrtc = (game as Game).webrtc as AVMaster;
    const userSettings = webrtc.settings.getUser((game as Game).userId as string);
    pushToTalkButton.toggleClass(
        "avqol-pushtotalk--broadcasting",
        (!userSettings?.muted && intent)
    );
};

// Foundry v13+ rebuilt Hotbar on ApplicationV2, which hands render hooks a
// native HTMLElement instead of a jQuery object. Wrap it once here so the
// rest of this file's jQuery-based DOM handling keeps working unchanged.
Hooks.once("renderHotbar", async (_: any, element: HTMLElement) => {
    const html = $(element);
    if (getVoiceButton() === VoiceButton.ENHANCED) {
        libWrapper.register(
            CANONICAL_NAME,
            "CameraViews.prototype.setUserIsSpeaking",
            async (
                setUserIsSpeaking: any,
                userId: string,
                speaking: boolean
            ) => {
                if (userId === (game as Game).userId) {
                    setPushToTalkButtonSpeaking(html, speaking);
                }
                return setUserIsSpeaking(userId, speaking);
            },
            "WRAPPER"
        );
        libWrapper.register(
            CANONICAL_NAME,
            "AVMaster.prototype.broadcast",
            async (broadcast: any, intent: boolean) => {
                updatePushToTalkButtonBroadcasting(html, intent);
                return broadcast(intent);
            },
            "WRAPPER"
        );
        libWrapper.register(
            CANONICAL_NAME,
            "AVMaster.prototype.onSettingsChanged",
            async (onSettingsChanged: any, ...args: any) => {
                await renderPushToTalkButton(html);
                updatePushToTalkButtonBroadcasting(html);
                return onSettingsChanged(...args);
            },
            "WRAPPER"
        );
        await renderPushToTalkButton(html);
    }
});
