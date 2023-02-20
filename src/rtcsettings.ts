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

export const getRTCWorldSettings = () => {
    const settings = (game as Game).settings.get("core", "rtcWorldSettings");
    return settings as RTCWorldSettings
}

export const getRTCClientSettings = () => {
    const settings = (game as Game).settings.get("core", "rtcClientSettings");
    return settings as RTCClientSettings
}


export const getRTFClient = (): AVClient => {
    // @ts-ignore
    return game.webrtc.client;
}

export const setRTCClientSettings = (settings: RTCClientSettings) => {
    const currentSettings = (game as Game).settings.get("core", "rtcClientSettings");
    (game as Game).settings.set("core", "rtcClientSettings", {
        ...currentSettings,
        ...settings,
        voice: {
            ...currentSettings.voice,
            ...settings.voice
        }
    });
}
