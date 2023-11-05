import { debug } from "./debug";

import {
  cameraEffectsIsSupported,
  avclientIsLivekit,
  getRTCClient,
  LivekitAVClient,
  TrackEvent,
  avclientIsSimplePeer,
} from "./rtcsettings";

import { getAVQOLAPI } from "./api";
import { CameraEffect } from "./camera-effects";

interface AVClientWrapper {
    updateLocalStream(cameraEffect: CameraEffect): void;
}


class SimplePeerAVClientWrapper implements AVClientWrapper {
    constructor(private readonly rtcClient: SimplePeerAVClient) {}

    updateLocalStream(cameraEffect: CameraEffect) {
        const rtcClient = this.rtcClient;
        const oldStream = rtcClient.localStream;
        rtcClient.levelsStream = cameraEffect?.stream.clone();
        for (let peer of rtcClient.peers.values()) {
            if (peer.destroyed) continue;
            if (oldStream) peer.removeStream(oldStream);
            peer.addStream(cameraEffect?.stream);
        }
        return;
    }
}

class LivekitAVClientWrapper implements AVClientWrapper {
    constructor(private readonly rtcClient: LivekitAVClient) {}

    private updateVideoTrack(cameraEffect: CameraEffect) {
        debug("Updating local stream with camera effects");

        this.rtcClient._liveKitClient.videoTrack.sender.replaceTrack(
            cameraEffect?.stream.getVideoTracks()[0]
        );
    }

    updateLocalStream(cameraEffect: CameraEffect) {
        if (!this.rtcClient._liveKitClient.videoTrack?.sender) {
            return
        }
        this.updateVideoTrack(cameraEffect);
        this.rtcClient._liveKitClient.videoTrack.off(
            TrackEvent.Unmuted,
            this.updateVideoTrack.bind(this, cameraEffect)
        );
        this.rtcClient._liveKitClient.videoTrack.on(
            TrackEvent.Unmuted,
            this.updateVideoTrack.bind(this, cameraEffect)
        );
    }
}

export const createAVClientWrapper = (): AVClientWrapper => {
    const rtcClient = getRTCClient();
    if (avclientIsLivekit()) {
        return new LivekitAVClientWrapper(rtcClient as LivekitAVClient);
    }
    if (avclientIsSimplePeer()) {
        return new SimplePeerAVClientWrapper(rtcClient as SimplePeerAVClient);
    }
    throw new Error("Unknown AV client");
}
