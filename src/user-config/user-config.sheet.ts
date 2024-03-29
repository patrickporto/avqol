import { getAVQOLAPI } from "../api";
import { getVirtualBackground, setVirtualBackground, setVirtualBackgroundOptions, getVirtualBackgroundOptions, applyEffect, CameraEffect } from "../camera-effects";
import { applyCameraEffects } from "../camera-view";
import { TEMPLATE_PATH, VirtualBackground } from "../constants";
import { debug } from "../debug";
import { cameraEffectsIsSupported, getRTCClient, getRTCClientSettings, getRTCWorldSettings, setRTCClientSettings } from "../rtcsettings";

const DEFAULT_AVATAR = "icons/svg/mystery-man.svg";

export class AVQOLUserConfig extends UserConfig {
    private previewCameraEffects: CameraEffect | null = null;
    private animationFrames: Record<string, number | null> = {};
    private hearMyselfAudio: HTMLAudioElement | null = null;

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["sheet", "user-config", "avqol-user-config"],
            template: `${TEMPLATE_PATH}/user-config.hbs`,
            width: 600,
            height: 'auto',
            tabs: [{ navSelector: ".tabs", contentSelector: "form", initial: "general" }]
        })
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    get title(): string {
        return `${game.i18n.localize("PLAYERS.ConfigTitle")}: ${this.object.name}`;
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    async getData(options = {}): Record<string, any> {
        const data = super.getData(options);
        const microphoneStatus = await this.getMicrophoneStatus();
        const cameraStatus = await this.getCameraStatus();
        const rtcWorldSettings = getRTCWorldSettings();
        const avqol = getAVQOLAPI();
        return {
            ...data,
            avatar: (game as Game).user?.avatar ?? DEFAULT_AVATAR,
            microphoneStatus: microphoneStatus,
            cameraStatus: cameraStatus,
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
            virtualBackgrounds: avqol.getVirtualBackgrounds(),
            virtualBackground: getVirtualBackground(),
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

        $(html)
            .find("#virtualBackground")
            .on("change", async () => {
                await this.renderVideoPreviewEffects(html);
            });
        $(html)
            .find("#videoSrc")
            .on("change", async () => {
                await this.checkVideoEffectAvailability(html);
                await this.changeVideoPreviewSource(html);
            });
        await this.changeVideoPreviewSource(html);
        $(html)
            .find("#audioSrc")
            .on("change", async () => {
                await this.renderAudioSourcePreview(html);
            });
        $(html)
            .find("#hearMyself")
            .on("change", async () => {
                await this.renderAudioSourcePreview(html);
            });
        await this.renderAudioSourcePreview(html);
        await this.checkVideoEffectAvailability(html);
    }

    private async getCameraStatus() {
        try {
            const status = await navigator.permissions.query({
                // @ts-ignore
                name: "camera",
            });
            return status.state;
        } catch (e) {
            debug("Check camera status not supported.");
            return "granted";
        }
    }

    private async getMicrophoneStatus() {
        try {
            const status = await navigator.permissions.query({
                // @ts-ignore
                name: "microphone",
            });
            return status.state;
        } catch (e) {
            debug("Check camera status not supported.");
            return "granted";
        }
    }

    checkVideoEffectAvailability(html: JQuery<HTMLElement>) {
        if (!cameraEffectsIsSupported()) {
            $(html)
                .find("#virtualBackground")
                .attr("disabled", "disabled")
                .val(VirtualBackground.NONE);
            $(html).find(".avqol-virtual-background-options").empty();
            return;
        }
        if ($(html).find("#videoSrc").val() === "disabled") {
            $(html)
                .find("#virtualBackground")
                .attr("disabled", "disabled")
                .val(VirtualBackground.NONE);
            $(html).find(".avqol-virtual-background-options").empty();
            return;
        }
        $(html).find("#virtualBackground").removeAttr("disabled");
    }

    private async checkPermissions() {
        const data = await this.getData();
        const audioPermission = data.microphoneStatus == "prompt" && data.audioDep;
        const videoPermission = data.cameraStatus == "prompt" && data.videoDep;
        if (audioPermission || videoPermission) {
            await this.requestPermissions();
        }
    }

    async _updateObject(event: Event, formData: any) {
        debug("Updating RTC Client settings", formData);
        this.disableHearMyself();
        const avqol = getAVQOLAPI();
        if (!avqol.allowPlay) {
            avqol.allowPlay = true;
            // @ts-ignore
            (game as Game).webrtc.connect();
        }
        await setRTCClientSettings({
            videoSrc: formData.videoSrc,
            audioSrc: formData.audioSrc,
            audioSink: formData.audioSink,
            voice: {
                mode: formData.voiceMode,
            },
        });
        if (formData.videoSrc === "disabled") {
            await setVirtualBackground(VirtualBackground.NONE);
            await setVirtualBackgroundOptions({});
        } else {
            await setVirtualBackground(formData.virtualBackground);
            let virtualBackgroundOptions: Record<string, any> = {};
            for (const [key, value] of Object.entries(formData)) {
                if (key.startsWith("virtualBackgroundOptions")) {
                    virtualBackgroundOptions[
                        key.replace(/^virtualBackgroundOptions\./, "")
                    ] = value;
                }
            }
            await setVirtualBackgroundOptions(virtualBackgroundOptions);
        }
        this.previewCameraEffects?.cancel();
        await applyCameraEffects();
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
        const selectedVirtualBackground = $(html)
            .find("#virtualBackground")
            .val() as VirtualBackground;
        debug("Rendering video preview effects");
        const preview = html.find(
            ".avqol-video-preview__video"
        )[0] as HTMLVideoElement;
        const virtualBackgroundOptionsContainer = $(html).find(
            ".avqol-virtual-background-options"
        );

        if (selectedVirtualBackground === VirtualBackground.NONE || !cameraEffectsIsSupported()) {
            this.previewCameraEffects?.cancel();
            virtualBackgroundOptionsContainer.empty();
            return;
        }

        const avqol = getAVQOLAPI();
        const previousVirtualBackground =
            this.previewCameraEffects?.virtualBackground;

        if (selectedVirtualBackground !== previousVirtualBackground) {
            virtualBackgroundOptionsContainer.empty();
            const renderOptions = avqol.getVirtualBackgroundRenderOptions(
                selectedVirtualBackground
            );
            if (renderOptions) {
                const currentVirtualBackgroundOptions = {
                    ...avqol.getVirtualBackgroundDefaultOptions(
                        selectedVirtualBackground
                    ),
                    ...getVirtualBackgroundOptions(),
                };
                const virtualBackgroundOptions: Record<string, any> = {};
                for (const [key, value] of Object.entries(
                    currentVirtualBackgroundOptions
                )) {
                    virtualBackgroundOptions[
                        `virtualBackgroundOptions.${key}`
                    ] = value;
                }
                renderOptions(
                    virtualBackgroundOptionsContainer,
                    virtualBackgroundOptions
                );
            }
        }
        const previewCanvas = $(html).find(
            ".avqol-video-preview__canvas"
        )[0] as HTMLCanvasElement;

        const videoEffectContainer = $(html).find(
            ".avqol-video-preview__container"
        )[0];

        let virtualBackgroundOptions: Record<string, any> = {};

        const updateVirtualBackgroundOptions = async ({ target }: Event) => {
            //@ts-ignore
            const name = ($(target).attr("name") as string).replace(
                /^virtualBackgroundOptions\./,
                ""
            );
            //@ts-ignore
            const value = $(target).val();
            virtualBackgroundOptions[name] = value;
            this.previewCameraEffects?.cancel();
            this.previewCameraEffects = await applyEffect(
                previewCanvas,
                preview,
                videoEffectContainer,
                selectedVirtualBackground,
                virtualBackgroundOptions
            );
        };

        for (const input of $(html).find(
            ".avqol-virtual-background-options [name]"
        )) {
            const name = ($(input).attr("name") as string).replace(
                /^virtualBackgroundOptions\./,
                ""
            );
            const value = $(input).val();
            virtualBackgroundOptions[name] = value;
            //@ts-ignore
            $(input).off("change", updateVirtualBackgroundOptions);
            $(input).on("change", updateVirtualBackgroundOptions);
        }

        this.previewCameraEffects = await applyEffect(
            previewCanvas,
            preview,
            videoEffectContainer,
            selectedVirtualBackground,
            virtualBackgroundOptions
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
        this.enableHearMyself(html, stream);
    }

    enableHearMyself(html: JQuery<HTMLElement>, stream: MediaStream) {
        const hearMyself = $(html).find("#hearMyself").is(":checked");
        debug("Hear myself", hearMyself);
        if (this.hearMyselfAudio) {
            this.disableHearMyself();
        }
        if (!hearMyself) {
            return;
        }
        this.hearMyselfAudio = document.createElement("audio");
        this.hearMyselfAudio.controls = true;
        this.hearMyselfAudio.autoplay = true;
        this.hearMyselfAudio.srcObject = stream;
    }

    private disableHearMyself() {
        if (!this.hearMyselfAudio) {
            return;
        }
        this.hearMyselfAudio.srcObject = null;
        this.hearMyselfAudio.remove();
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
