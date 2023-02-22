import { CANONICAL_NAME, VideoEffect } from "./constants";
import { debug } from "./debug";
import { applyEffect, CameraEffect, getVideoEffect } from "./camera-effects";
import { cameraEffectsIsSupported, updateLocalStream } from "./rtcsettings";
import { getAVQOLAPI } from "./avqol";

let cameraEffect: null | CameraEffect = null;

export const applyCameraEffects = async (): Promise<void> => {
    const cameraView = $(`.camera-view[data-user="${(game as Game).userId}"]`);
    if (!cameraView.length) {
        return
    }
    const video = cameraView.find(".user-camera");
    if (!video) {
        return
    }
    if (!cameraEffectsIsSupported()) {
        debug("Camera effects are not supported");
        return
    }
    const videoEffect = getVideoEffect();
    if (videoEffect === VideoEffect.NONE) {
        debug("Removing camera effects");
        cameraEffect?.cancel();
        // @ts-ignore
        ui.webrtc.render()
        return;
    }
    debug("Applying camera effects");
    let canvas = cameraView.find(
        ".avqol-video-effect__canvas"
    )[0] as HTMLCanvasElement;
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.classList.add("avqol-video-effect__canvas");
        video.after(canvas);
    }
    cameraView.find(".video-container").addClass("avqol-video-effect");
    cameraEffect = await applyEffect(
        canvas,
        video[0] as HTMLVideoElement,
        cameraView[0],
        videoEffect
    );
    if (cameraEffect?.stream) {
        updateLocalStream(cameraEffect.stream);
    }
}

Hooks.on(
    "renderCameraViews",
    async () => {
        const avqol = getAVQOLAPI();
        if (avqol.allowPlay) {
            await applyCameraEffects();
        }
    }
);
