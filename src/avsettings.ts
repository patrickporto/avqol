import { TEMPLATE_PATH } from "./constants";
import { debug } from "./debug";
import {
    getRTCClientSettings,
    getRTCWorldSettings,
    getRTCClient as getRTCClient,
    setRTCClientSettings,
} from "./rtcsettings";

const DEFAULT_AVATAR = 'icons/svg/mystery-man.svg'

export class AVQOLSettings extends FormApplication {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form", "avqolsettings"],
            popOut: true,
            template: `${TEMPLATE_PATH}/avqolsettings.hbs`,
            id: "av-qol-settings",
            title: (game as Game).i18n.localize("AVQOL.SettingsTitle"),
        });
    }

    async getData() {
        const microphoneStatus = await navigator.permissions.query({
            // @ts-ignore
            name: "microphone",
        });
        debug("Microphone permission", microphoneStatus.state);
        const cameraStatus = await navigator.permissions.query({
            // @ts-ignore
            name: "camera",
        });
        debug("Camera permission", cameraStatus.state);
        const rtcWorldSettings = getRTCWorldSettings();
        return {
            avatar: (game as Game).user?.avatar ?? DEFAULT_AVATAR,
            microphoneStatus: microphoneStatus.state,
            cameraStatus: cameraStatus.state,
            audioDep: [
                AVSettings.AV_MODES.AUDIO,
                AVSettings.AV_MODES.AUDIO_VIDEO,
                // @ts-ignore
            ].includes(rtcWorldSettings.mode),
            // @ts-ignore
            videoDep: [
                AVSettings.AV_MODES.VIDEO,
                AVSettings.AV_MODES.AUDIO_VIDEO,
                // @ts-ignore
            ].includes(rtcWorldSettings.mode),
            videoSrc: getRTCClientSettings().videoSrc,
            videoDevices: await this.getVideoSources(),
            audioSrc: getRTCClientSettings().audioSrc,
            audioSourceDevices: await this.getAudioSources(),
            audioSink: getRTCClientSettings().audioSink,
            audioOutputDevices: await this.getAudioOutputs(),
            voiceMode: getRTCClientSettings().voice.mode,
            voiceModes: this.getVoiceModes(),
        };
    }
    getVoiceModes() {
        const voiceModes = {
            [AVSettings.VOICE_MODES.ALWAYS]: (game as Game).i18n.localize(
                "WEBRTC.VoiceModeAlways"
            ),
            [AVSettings.VOICE_MODES.ACTIVITY]: (game as Game).i18n.localize(
                "WEBRTC.VoiceModeActivity"
            ),
            [AVSettings.VOICE_MODES.PTT]: (game as Game).i18n.localize(
                "WEBRTC.VoiceModePtt"
            ),
        };
        // @ts-ignore
        delete voiceModes[undefined];
        return voiceModes;
    }
    async getAudioOutputs() {
        const audioSink = getRTCClientSettings().audioSink;
        const sources: Record<string, string> = {};
        sources["disabled"] = (game as Game).i18n.localize(
            "WEBRTC.DisableAudioSource"
        );
        sources["default"] = (game as Game).i18n.localize(
            "WEBRTC.DefaultSource"
        );
        if (audioSink === "unknown") {
            sources["unknown"] = (game as Game).i18n.localize(
                "WEBRTC.UnknownDevice"
            );
        }
        if (audioSink === "unavailable") {
            sources["unavailable"] = (game as Game).i18n.localize(
                "WEBRTC.UnavailableDevice"
            );
        }
        return { ...sources, ...(await getRTCClient().getAudioSinks()) };
    }
    async getAudioSources() {
        const audioSrc = getRTCClientSettings().audioSrc;
        const sources: Record<string, string> = {};
        sources["disabled"] = (game as Game).i18n.localize(
            "WEBRTC.DisableAudioSource"
        );
        sources["default"] = (game as Game).i18n.localize(
            "WEBRTC.DefaultSource"
        );
        if (audioSrc === "unknown") {
            sources["unknown"] = (game as Game).i18n.localize(
                "WEBRTC.UnknownDevice"
            );
        }
        if (audioSrc === "unavailable") {
            sources["unavailable"] = (game as Game).i18n.localize(
                "WEBRTC.UnavailableDevice"
            );
        }
        return { ...sources, ...(await getRTCClient().getAudioSources()) };
    }
    async getVideoSources() {
        const videoSrc = getRTCClientSettings().videoSrc;
        const sources: Record<string, string> = {};
        sources["disabled"] = (game as Game).i18n.localize(
            "WEBRTC.DisableVideoSource"
        );
        sources["default"] = (game as Game).i18n.localize(
            "WEBRTC.DefaultSource"
        );
        if (videoSrc === "unknown") {
            sources["unknown"] = (game as Game).i18n.localize(
                "WEBRTC.UnknownDevice"
            );
        }
        if (videoSrc === "unavailable") {
            sources["unavailable"] = (game as Game).i18n.localize(
                "WEBRTC.UnavailableDevice"
            );
        }
        return { ...sources, ...(await getRTCClient().getVideoSources()) };
    }

    async activateListeners(html: JQuery<HTMLElement>) {
        super.activateListeners(html);
        await this.checkPermissions();

        const microphoneStatus = await navigator.permissions.query({
            // @ts-ignore
            name: "microphone",
        });
        microphoneStatus.addEventListener("change", () => {
            this.render(true);
        });
        const cameraStatus = await navigator.permissions.query({
            // @ts-ignore
            name: "camera",
        });
        cameraStatus.addEventListener("change", async () => {
            this.render(true);
            await this.renderPreview(html);
        });
        $(html).find("#videoSrc").on("change", async ({ target }) => {
            await this.renderPreview(html);
        })
        await this.renderPreview(html);
    }

    private async checkPermissions() {
        const data = await this.getData();
        const audioPermission =
            data.microphoneStatus == "prompt" && data.audioDep;
        const videoPermission = data.cameraStatus == "prompt" && data.videoDep;
        if (audioPermission || videoPermission) {
            await this.requestPermissions();
        }
    }

    async _updateObject(event: Event, formData: any) {
        debug("Updating RTC Client settings", formData);
        setRTCClientSettings({
            videoSrc: formData.videoSrc,
            audioSrc: formData.audioSrc,
            audioSink: formData.audioSink,
            voice: {
                mode: formData.voiceMode,
            },
        });
    }

    async requestPermissions() {
        const data = await this.getData();
        const constraints = {
            audio: data.audioDep,
            video: data.videoDep,
        };
        await navigator.mediaDevices.getUserMedia(constraints);
        this.render(true);
    }

    async renderPreview(html: JQuery<HTMLElement>) {
        const data = await this.getData();
        if (!data.videoDep) return;
        const deviceId = $(html).find("#videoSrc").val() as string;
        if (deviceId === "disabled" || !deviceId) {
            return
        }
        debug("Rendering preview", deviceId);
        const preview = html.find(
            ".avqol-video-preview__video"
        )[0] as HTMLVideoElement;
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId } },
        });
        preview.srcObject = stream;
        $(html).find(".avqol-video-preview__avatar").hide()
    }
}
