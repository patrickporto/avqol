import { VirtualBackground } from "./constants";
import { debug } from "./debug";
import {
    applyEffect,
    getVirtualBackground,
    getVirtualBackgroundOptions,
} from "./camera-effects";
import {
    avclientIsLivekit,
    avclientIsSimplePeer,
    cameraEffectsIsSupported,
    getRTCClient,
    LivekitAVClient,
    TrackEvent,
} from "./rtcsettings";
import { getAVQOLAPI } from "./avqol";

const updateLocalStream = () => {
    const avqol = getAVQOLAPI();
    const cameraEffect = avqol.getCameraEffect();
    if (!cameraEffectsIsSupported() || !cameraEffect) return;
    if (avclientIsLivekit()) {
        const rtcClient = getRTCClient() as LivekitAVClient;
        if (rtcClient._liveKitClient.videoTrack?.sender) {
            const updateVideoTrack = () => {
                debug("Updating local stream with camera effects");

                rtcClient._liveKitClient.videoTrack.sender.replaceTrack(
                    cameraEffect?.stream.getVideoTracks()[0]
                );
            };
            updateVideoTrack();
            rtcClient._liveKitClient.videoTrack.off(
                TrackEvent.Unmuted,
                updateVideoTrack
            );
            rtcClient._liveKitClient.videoTrack.on(
                TrackEvent.Unmuted,
                updateVideoTrack
            );
            return;
        }
    }
    if (avclientIsSimplePeer()) {
        debug("Updating local stream with camera effects");
        const rtcClient = getRTCClient() as SimplePeerAVClient;
        const oldStream = rtcClient.localStream;
        rtcClient.levelsStream = cameraEffect?.stream.clone();
        for (let peer of rtcClient.peers.values()) {
            if (peer.destroyed) continue;
            if (oldStream) peer.removeStream(oldStream);
            peer.addStream(cameraEffect?.stream);
        }
        return;
    }
};

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
    if (virtualBackground === VirtualBackground.NONE) {
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
    updateLocalStream();
};

Hooks.on("renderCameraViews", async () => {
    const avqol = getAVQOLAPI();
    if (avqol.allowPlay) {
        await applyCameraEffects();
    }
});
