import { CANONICAL_NAME, TEMPLATE_PATH, VideoEffect } from "./constants";
import { debug } from "./debug";
import {
    getRTCClientSettings,
    getRTCWorldSettings,
    getRTCClient,
    setRTCClientSettings,
} from "./rtcsettings";
import { applyCameraEffects } from "./camera-view";
import {
    applyEffect,
    CameraEffect,
    getVideoEffect,
    setVideoEffect,
} from "./camera-effects";
import { getAVQOLAPI, shouldOverrideInitWebRTC } from "./avqol";

const DEFAULT_AVATAR = "icons/svg/mystery-man.svg";

export class AVQOLSettings extends FormApplication {
    private previewCameraEffects: CameraEffect | null = null;
    private animationFrames: Record<string, number | null> = {};

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form", "avqolsettings"],
            popOut: true,
            template: `${TEMPLATE_PATH}/avqolsettings.hbs`,
            id: "av-qol-settings",
            title: (game as Game).i18n.localize("AVQOL.SettingsTitle"),
            width: 600,
            height: 625,
        });
    }

    async getData() {
        const microphoneStatus = await navigator.permissions.query({
            // @ts-ignore
            name: "microphone",
        });
        const cameraStatus = await navigator.permissions.query({
            // @ts-ignore
            name: "camera",
        });
        const rtcWorldSettings = getRTCWorldSettings();
        const avqol = getAVQOLAPI()
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
            videoEffects: avqol.getVideoEffects(),
            videoEffect: getVideoEffect(),
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
        // await this.checkPermissions();

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
            await this.changeVideoPreviewSource(html);
        });
        $(html)
            .find("#videoEffect")
            .on("change", async () => {
                await this.renderVideoPreviewEffects(html);
            });
        $(html)
            .find("#videoSrc")
            .on("change", async () => {
                await this.changeVideoPreviewSource(html);
            });
        await this.changeVideoPreviewSource(html);
        $(html)
            .find("#audioSrc")
            .on("change", async () => {
                await this.renderAudioSourcePreview(html);
            });
        await this.renderAudioSourcePreview(html);
    }

    // private async checkPermissions() {
    //     const data = await this.getData();
    //     const audioPermission =
    //         data.microphoneStatus == "prompt" && data.audioDep;
    //     const videoPermission = data.cameraStatus == "prompt" && data.videoDep;
    //     if (audioPermission || videoPermission) {
    //         await this.requestPermissions();
    //     }
    // }

    async _updateObject(event: Event, formData: any) {
        debug("Updating RTC Client settings", formData);
        const avqol = getAVQOLAPI()
        if (!avqol.allowPlay) {
            avqol.allowPlay = true;
            // @ts-ignore
            (game as Game).webrtc.connect()
        }
        await setRTCClientSettings({
            videoSrc: formData.videoSrc,
            audioSrc: formData.audioSrc,
            audioSink: formData.audioSink,
            voice: {
                mode: formData.voiceMode,
            },
        });
        await setVideoEffect(formData.videoEffect);
        if (formData.videoEffect === VideoEffect.NONE) {
            return;
        }
        this.previewCameraEffects?.cancel();
        applyCameraEffects();
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

    async changeVideoPreviewSource(html: JQuery<HTMLElement>) {
        const data = await this.getData();
        if (!data.videoDep) return;
        const deviceId = $(html).find("#videoSrc").val() as string;
        debug("Changing video preview source", deviceId);
        const preview = html.find(
            ".avqol-video-preview__video"
        )[0] as HTMLVideoElement;
        const avatar = $(html).find(".avqol-video-preview__avatar");
        if (deviceId === "disabled") {
            preview.srcObject = null;
            avatar.show();
            this.previewCameraEffects?.cancel();
            return;
        }
        const stream = await this.getVideoStream(deviceId);
        preview.srcObject = stream;
        preview.play();
        avatar.hide();
        this.previewCameraEffects?.cancel();
        this.renderVideoPreviewEffects(html);
    }

    async renderVideoPreviewEffects(html: JQuery<HTMLElement>) {
        const data = await this.getData();
        if (!data.videoDep) return;
        const selectedVideoEffect = $(html)
            .find("#videoEffect")
            .val() as VideoEffect;
        debug("Rendering video preview effects");
        const preview = html.find(
            ".avqol-video-preview__video"
        )[0] as HTMLVideoElement;

        if (selectedVideoEffect === VideoEffect.NONE) {
            this.previewCameraEffects?.cancel();
            return;
        }
        const previewCanvas = $(html).find(
            ".avqol-video-preview__canvas"
        )[0] as HTMLCanvasElement;

        const videoEffectContainer = $(html).find(
            ".avqol-video-preview__container"
        )[0];
        this.previewCameraEffects = await applyEffect(
            previewCanvas,
            preview,
            videoEffectContainer,
            selectedVideoEffect
        );
    }

    private async getVideoStream(deviceId: string) {
        const devices = await this.getVideoDevides();
        if (devices.includes(deviceId)) {
            return await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: deviceId } },
            });
        }
        return await navigator.mediaDevices.getUserMedia({
            video: true,
        });
    }

    private async getVideoDevides() {
        return (await navigator.mediaDevices.enumerateDevices())
            .filter((device) => device.kind === "videoinput")
            .map((device) => device.deviceId);
    }

    async renderAudioSourcePreview(html: JQuery<HTMLElement>) {
        const data = await this.getData();
        if (!data.audioDep) return;
        const deviceId = $(html).find("#audioSrc").val() as string;
        if (deviceId === "disabled") {
            this.resetAudioPids("audioSrcPids");
            return;
        }
        const stream = await this.getAudioSourceStream(deviceId);

        this.renderAudioPids(
            "audioSrcPids",
            stream,
            $(html).find("#audioSrcPids")
        );
    }

    private renderAudioPids(
        animationFrameId: string,
        stream: MediaStream,
        pidsElement: JQuery<HTMLElement>
    ) {
        const audioContext = new AudioContext();
        const microphone = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 1024;
        audioContext.resume();
        microphone.connect(analyser);

        const update = () => {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            const arraySum = array.reduce((a, value) => a + value, 0);
            const volume = arraySum / array.length;

            const numberOfPidsToColor = Math.round(volume / 10);
            const pids = pidsElement.find(".avqol-pids__cell");
            pids.each((index, element) => {
                if (index < numberOfPidsToColor) {
                    $(element).addClass("avqol-pids__cell--active");
                } else {
                    $(element).removeClass("avqol-pids__cell--active");
                }
            });
            this.animationFrames[animationFrameId] =
                requestAnimationFrame(update);
        };
        this.animationFrames[animationFrameId] = requestAnimationFrame(update);
    }

    private resetAudioPids(animationFrameId: string) {
        if (this.animationFrames[animationFrameId]) {
            cancelAnimationFrame(
                this.animationFrames[animationFrameId] as number
            );
            this.animationFrames[animationFrameId] = null;
        }
    }

    private async getAudioSourceStream(deviceId: string) {
        const devices = await this.getAudioSourceDevides();
        if (devices.includes(deviceId)) {
            return await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: deviceId } },
            });
        }
        return await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
    }

    private async getAudioSourceDevides() {
        return (await navigator.mediaDevices.enumerateDevices())
            .filter((device) => device.kind === "audioinput")
            .map((device) => device.deviceId);
    }
}
