import { debug } from "./debug"

type RTCWorldSettings = {
    mode: AVSettings.AV_MODES
}

type RTCClientSettings = {
    audioSink: string
    audioSrc: string
    videoSrc: string
    voice: {
        mode: AVSettings.VOICE_MODES
    }
}

export type LivekitAVClient = AVClient & {
    _liveKitClient: {
        videoTrack: {
            sender: RTCRtpSender
        }
    }
}

type AVQOLClient = LivekitAVClient | SimplePeerAVClient

export const getRTCWorldSettings = () => {
    const settings = (game as Game).settings.get("core", "rtcWorldSettings");
    return settings as RTCWorldSettings
}

export const getRTCClientSettings = () => {
    const settings = (game as Game).settings.get("core", "rtcClientSettings");
    return settings as RTCClientSettings
}


export const getRTCClient = (): AVQOLClient => {
    // @ts-ignore
    return game.webrtc.client;
}

export const setRTCClientSettings = async (settings: RTCClientSettings) => {
    const currentSettings = (game as Game).settings.get("core", "rtcClientSettings");
    await (game as Game).settings.set("core", "rtcClientSettings", {
        ...currentSettings,
        ...settings,
        voice: {
            ...currentSettings.voice,
            ...settings.voice
        }
    });
}

export const avclientIsLivekit = (): boolean => {
    return (game as Game).modules.get("avclient-livekit")?.active ?? false;
}

export const avclientIsSimplePeer = (): boolean => {
    // @ts-ignore
    return (game as Game).webrtc.client?.constructor?.name == "SimplePeerAVClient";
}

export const cameraEffectsIsSupported = (): boolean => {
    return avclientIsLivekit();
}
