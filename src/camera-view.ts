import { createAVClientWrapper } from "./avclient";
import { VirtualBackground } from "./constants";
import { debug } from "./debug";
import {
    applyEffect,
    getVirtualBackground,
    getVirtualBackgroundOptions,
} from "./camera-effects";
import {
    cameraEffectsIsSupported,
} from "./rtcsettings";
import { getAVQOLAPI } from "./api";

let latestApplyRequest = 0;
let applyQueue: Promise<void> = Promise.resolve();

/**
 * (Re-)apply the configured virtual background to the local camera.
 *
 * Requests are serialised: this is triggered by every camera dock render
 * and by the config sheet, often several times in a row, and overlapping
 * runs would race each other to replace the outgoing video track. Runs that
 * have already been superseded by a newer request are skipped.
 */
export const applyCameraEffects = (): Promise<void> => {
    const request = ++latestApplyRequest;
    const run = async () => {
        if (request !== latestApplyRequest) {
            return;
        }
        await doApplyCameraEffects();
    };
    applyQueue = applyQueue.then(run, run);
    return applyQueue;
};

const doApplyCameraEffects = async (): Promise<void> => {
    const avqol = getAVQOLAPI();
    const cameraView = $(`.camera-view[data-user="${(game as Game).userId}"]`);
    if (!cameraView.length) {
        return;
    }
    const video = cameraView.find("video.user-camera");
    if (!video.length) {
        return;
    }
    const virtualBackground = getVirtualBackground();
    const webrtc = (game as Game).webrtc as AVMaster;
    const userSettings = webrtc.settings.getUser((game as Game).userId as string);
    if (virtualBackground === VirtualBackground.NONE || userSettings?.hidden) {
        // Only re-render (and clear the stored effect) when there was
        // actually something to remove. This runs on every renderCameraViews
        // hook, so unconditionally calling ui.webrtc.render() here would
        // re-trigger the same hook and spin forever whenever no virtual
        // background is configured (the default state) - which is exactly
        // when this branch is hit on every single render.
        if (!avqol?.getCameraEffect()) {
            return;
        }
        debug("Removing camera effects");
        avqol.getCameraEffect()?.cancel();
        avqol.setCameraEffect(null);
        // @ts-ignore
        ui.webrtc.render();
        return;
    }
    if (!cameraEffectsIsSupported()) {
        debug("Camera effects are not supported with this AV client.");
        return;
    }
    const virtualBackgroundOptions = getVirtualBackgroundOptions();
    let canvas = cameraView.find(
        ".avqol-video-effect__canvas"
    )[0] as HTMLCanvasElement;
    if (!canvas) {
        canvas = document.createElement("canvas");
        const videoElement = video[0] as HTMLVideoElement;
        canvas.width = video.width() || videoElement.videoWidth || 320;
        canvas.height = video.height() || videoElement.videoHeight || 240;
        canvas.classList.add("avqol-video-effect__canvas");
        video.after(canvas);
    }
    debug(
        "Applying camera effects",
        virtualBackground,
        virtualBackgroundOptions
    );
    // The previous effect drew to a canvas that may no longer exist; stop its
    // loop before starting the new one.
    avqol.getCameraEffect()?.cancel();
    avqol.setCameraEffect(null);
    const cameraEffect = await applyEffect(
        canvas,
        video[0] as HTMLVideoElement,
        cameraView[0],
        virtualBackground,
        virtualBackgroundOptions
    );
    avqol.setCameraEffect(cameraEffect);
    const avClientWrapper = createAVClientWrapper()
    avClientWrapper.updateLocalStream(cameraEffect);
};

Hooks.on("renderCameraViews", async () => {
    const avqol = getAVQOLAPI();
    if (avqol?.allowPlay) {
        try {
            await applyCameraEffects();
        } catch (error) {
            console.error("A/V Quality of Life | Failed to apply camera effects", error);
        }
    }
});
