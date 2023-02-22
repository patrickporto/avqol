import { CANONICAL_NAME, VideoEffect } from "./constants";
import { debug } from "./debug";
import { updateLocalStream } from "./rtcsettings";
import { applyEffect, getVideoEffect } from "./camera-effects";

export const applyCameraEffects = async (): Promise<void> => {
    debug("Applying camera effects");
    const cameraView = $(`.camera-view[data-user="${(game as Game).userId}"]`);
    if (!cameraView.length) {
        return
    }
    const video = cameraView.find(".user-camera");
    if (!video) {
        return
    }
    const videoEffect = getVideoEffect();
    if (videoEffect === VideoEffect.NONE) {
        return;
    }
    let canvas = cameraView.find(
        ".avqol-video-effect__canvas"
    )[0] as HTMLCanvasElement;
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.classList.add("avqol-video-effect__canvas");
        video.after(canvas);
    }
    cameraView.find(".video-container").addClass("avqol-video-effect");
    const cameraEffect = await applyEffect(
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
        await applyCameraEffects();
    }
);
