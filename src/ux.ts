// @ts-ignore
import { libWrapper } from "./third-party/libwrapper-shim.js";
import { CANONICAL_NAME, TEMPLATE_PATH, VoiceButton } from "./constants";
import { debug } from "./debug";

export const registerSettings = () => {
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
