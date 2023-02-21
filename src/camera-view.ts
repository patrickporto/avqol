import { debug } from "./debug";
import { applyBlurBackground, CameraEffect } from "./effects";



export const applyCameraEffects = async (): Promise<CameraEffect> => {
    const cameraView = $(`.camera-view[data-user="${(game as Game).userId}"]`)
    if (!cameraView.length) {
        throw new Error("No camera view found");
    }
    const video = cameraView.find(".user-camera")[0] as HTMLVideoElement;
    if (!video) {
        throw new Error("No video element found");
    }
    debug("Applying camera effects");
    let canvas = cameraView.find(".avqol-video-effect__canvas")[0] as HTMLCanvasElement;
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.classList.add("avqol-video-effect__canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        $(video).after(canvas);
    }
    cameraView.find('.video-container').addClass('avqol-video-effect')
    return await applyBlurBackground(canvas, video, cameraView[0]);
}
