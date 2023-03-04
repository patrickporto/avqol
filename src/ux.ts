// @ts-ignore
import { libWrapper } from "./third-party/libwrapper-shim.js";
import { CANONICAL_NAME, TEMPLATE_PATH, VoiceButton } from "./constants";
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
        },
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
        },
    });
    (game as Game).settings.register(CANONICAL_NAME, "disableBlockUserAV", {
        name: "AVQOL.UserExperienceDisableBlockUserAV",
        hint: "AVQOL.UserExperienceDisableBlockUserAVHint",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        onChange: () => {
            const cameraViews = ui.webrtc?.element;
            if (cameraViews) {
                updateDisableBlockUserAVButtons(cameraViews);
            }
        },
    });
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

export const getDisableBlockUserAV = (): string => {
    return (game as Game).settings.get(
        CANONICAL_NAME,
        "disableBlockUserAV"
    ) as string;
};

const getVoiceButton = (): VoiceButton => {
    return (game as Game).settings.get(
        CANONICAL_NAME,
        "voiceButton"
    ) as VoiceButton;
};

const updateHideUserButton = (html: JQuery<HTMLElement>) => {
    if (getDisableHideUser()) {
        debug("Disabling hide user button");
        html.find('.av-control[data-action="hide-user"]').addClass(
            "avqol-control--disabled"
        );
    } else {
        debug("Enabling hide user button");
        html.find('.av-control[data-action="hide-user"]').removeClass(
            "avqol-control--disabled"
        );
    }
};

const updateDisablePopoutButton = (html: JQuery<HTMLElement>) => {
    if (getDisablePopout()) {
        debug("Disabling popout button");
        html.find('.av-control[data-action="toggle-popout"]').addClass(
            "avqol-control--disabled"
        );
    } else {
        debug("Enabling popout button");
        html.find('.av-control[data-action="toggle-popout"]').removeClass(
            "avqol-control--disabled"
        );
    }
};

const updateDisableBlockUserAVButtons = (html: JQuery<HTMLElement>) => {
    if (getDisableBlockUserAV()) {
        debug("Disabling block user A/V buttons");
        html.find('.av-control[data-action="block-video"]').addClass(
            "avqol-control--disabled"
        );
        html.find('.av-control[data-action="block-audio"]').addClass(
            "avqol-control--disabled"
        );
    } else {
        debug("Enabling block user A/V buttons");
        html.find('.av-control[data-action="block-video"]').removeClass(
            "avqol-control--disabled"
        );
        html.find('.av-control[data-action="block-audio"]').removeClass(
            "avqol-control--disabled"
        );
    }
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

const disableToggleAudioButton = (html: JQuery<HTMLElement>) => {
    html.find(
        ".user-controls .av-control[data-action='toggle-audio']"
    ).addClass("avqol-control--disabled");
    html.find(`.camera-view[data-user=${(game as Game).userId}] .notification-bar .status-muted`).addClass('hidden');
}

const renderToggleFullScreen = async (html: JQuery<HTMLElement>) => {
    const controlBar = html.find('.user-controls .control-bar');
    let toggleFullScreen = controlBar.find(".av-control[data-action='toggle-fullscreen']");
    debug("Rendering full screen av control");
    const template = await getTemplate(`${TEMPLATE_PATH}/avcontrol-toggle-fullscreen.hbs`);
    const avcontrol = $(template({
        fullscreen: toggleFullScreen?.hasClass("avqol-control--active"),
    }))
    debug(toggleFullScreen?.hasClass("avqol-control--active"))
    if (toggleFullScreen.length > 0) {
        toggleFullScreen.replaceWith(avcontrol);
    } else {
        controlBar.append(avcontrol);
    }
    avcontrol.off("click");
    avcontrol.on("click", async () => {
        avcontrol.toggleClass("avqol-control--active");
        $(html).toggleClass("avqol-fullscreen");
        await renderToggleFullScreen(html);
    });
}

Hooks.on("renderCameraViews", async (_: any, html: JQuery<HTMLElement>) => {
    updateHideUserButton(html);
    updateDisablePopoutButton(html);
    updateDisableBlockUserAVButtons(html);
    renderToggleFullScreen(html);
    if (getVoiceButton() === VoiceButton.ENHANCED) {
        disableToggleAudioButton(html);
    }
});

Hooks.once("renderHotbar", async (_: any, html: JQuery<HTMLElement>) => {
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
                return onSettingsChanged(args);
            },
            "WRAPPER"
        );
        await renderPushToTalkButton(html);
    }
});
