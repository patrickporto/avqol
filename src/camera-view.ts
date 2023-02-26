import { CANONICAL_NAME, VideoEffect } from "./constants";
import { debug } from "./debug";
import { applyEffect, CameraEffect, getVideoEffect } from "./camera-effects";
import { avclientIsLivekit, avclientIsSimplePeer, cameraEffectsIsSupported, getRTCClient, LivekitAVClient } from "./rtcsettings";
import { getAVQOLAPI } from "./avqol";

export const applyCameraEffects = async (): Promise<void> => {
    const avqol = getAVQOLAPI()
    const cameraView = $(`.camera-view[data-user="${(game as Game).userId}"]`);
    if (!cameraView.length) {
        return
    }
    const video = cameraView.find(".user-camera");
    if (!video) {
        return
    }
    if (!cameraEffectsIsSupported()) {
        debug('Camera effects are not supported with this AV client.')
        return
    }
    const videoEffect = getVideoEffect();
    if (videoEffect === VideoEffect.NONE) {
        debug("Removing camera effects");
        avqol?.cameraEffect?.cancel();
        // @ts-ignore
        ui.webrtc.render()
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
    debug("Applying camera effects");
    cameraView.find(".video-container").addClass("avqol-video-effect");
    const cameraEffect = await applyEffect(
        canvas,
        video[0] as HTMLVideoElement,
        cameraView[0],
        videoEffect
    );
    if (avclientIsLivekit()) {
        debug('Updating local stream with camera effects')
        const rtcClient = getRTCClient() as LivekitAVClient;
        if (rtcClient._liveKitClient.videoTrack?.sender) {
            rtcClient._liveKitClient.videoTrack.sender.replaceTrack(
                cameraEffect?.stream.getVideoTracks()[0]
            );
        }
        return
    }
    if (avclientIsSimplePeer()) {
        debug('Updating local stream with camera effects')
        const rtcClient = getRTCClient() as SimplePeerAVClient;
        const oldStream = rtcClient.localStream
        rtcClient.levelsStream = cameraEffect?.stream.clone()
        for ( let peer of rtcClient.peers.values() ) {
            if (peer.destroyed) continue;
            if (oldStream) peer.removeStream(oldStream);
            peer.addStream(cameraEffect?.stream);
        }
        return
    }
    avqol.setCameraEffect(cameraEffect)
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
