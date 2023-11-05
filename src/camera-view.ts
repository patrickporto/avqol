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

export const applyCameraEffects = async (): Promise<void> => {
    const avqol = getAVQOLAPI();
    const cameraView = $(`.camera-view[data-user="${(game as Game).userId}"]`);
    if (!cameraView.length) {
        return;
    }
    const video = cameraView.find(".user-camera");
    if (!video) {
        return;
    }
    if (!cameraEffectsIsSupported()) {
        debug("Camera effects are not supported with this AV client.");
        return;
    }
    const virtualBackground = getVirtualBackground();
    const webrtc = (game as Game).webrtc as AVMaster;
    const userSettings = webrtc.settings.getUser((game as Game).userId as string);
    if (virtualBackground === VirtualBackground.NONE || userSettings?.hidden) {
        debug("Removing camera effects");
        avqol?.getCameraEffect()?.cancel();
        // @ts-ignore
        ui.webrtc.render();
        return;
    }
    const virtualBackgroundOptions = getVirtualBackgroundOptions();
    let canvas = cameraView.find(
        ".avqol-video-effect__canvas"
    )[0] as HTMLCanvasElement;
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.classList.add("avqol-video-effect__canvas");
        video.after(canvas);
    }
    debug(
        "Applying camera effects",
        virtualBackground,
        virtualBackgroundOptions
    );
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
    if (avqol.allowPlay) {
        await applyCameraEffects();
    }
});
