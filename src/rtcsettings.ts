import { debug } from "./debug";

type RTCWorldSettings = {
    mode: AVSettings.AV_MODES;
};

type RTCClientSettings = {
    audioSink: string;
    audioSrc: string;
    videoSrc: string;
    voice: {
        mode: AVSettings.VOICE_MODES;
    };
};

export enum TrackEvent {
    Unmuted = "unmuted",
}

export type LivekitAVClient = AVClient & {
    _liveKitClient: {
        videoTrack: {
            mediaStream: MediaStream;
            sender: RTCRtpSender;
            on(event: TrackEvent, callback: () => void): void;
            off(event: TrackEvent, callback: () => void): void;
        };
    };
};

type AVQOLClient = LivekitAVClient | SimplePeerAVClient;

export const getRTCWorldSettings = () => {
    const settings = game.settings.get("core", "rtcWorldSettings");
    return settings as RTCWorldSettings;
};

export const getRTCClientSettings = () => {
    const settings = game.settings.get("core", "rtcClientSettings");
    return settings as RTCClientSettings;
};

export const getRTCClient = (): AVQOLClient => {
    // @ts-ignore
    return game.webrtc.client;
};

export const setRTCClientSettings = async (updatedSettings: RTCClientSettings) => {
    const settings = game.webrtc.settings;
    settings.client.videoSrc = settings.client.videoSrc || null;
    settings.client.audioSrc = settings.client.audioSrc || null;

    const client = foundry.utils.mergeObject(settings.client, updatedSettings)
    await game.settings.set("core", "rtcClientSettings", client);
};

export const avclientIsLivekit = (): boolean => {
    return game.modules.get("avclient-livekit")?.active ?? false;
};

export const avclientIsSimplePeer = (): boolean => {
    return (
        // @ts-ignore
        game.webrtc.client?.constructor?.name == "SimplePeerAVClient"
    );
};

const isFirefox = () => {
    return navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
};

export const cameraEffectsIsSupported = (): boolean => {
    return (avclientIsLivekit() || avclientIsSimplePeer()) && !isFirefox();
};
