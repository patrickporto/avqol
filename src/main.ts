import { getAVQOLAPI, registerAVQOLAPI, shouldOpenSettings, shouldOverrideInitWebRTC } from "./avqol";
import { CANONICAL_NAME, VideoEffect } from "./constants";
import { debug } from "./debug";
import registerSettings from "./module-settings";
import { getRTCWorldSettings } from "./rtcsettings";
import './styles.css'
import "./camera-view"
import "./video-effects"


Hooks.on("init", async () => {
    registerSettings();
    debug('initializing AVQOL');
    registerAVQOLAPI();
    const avqol = getAVQOLAPI();
    Hooks.callAll("AVQOL.init", avqol);
    if (shouldOverrideInitWebRTC()) {
        avqol.allowPlay = false
        $(document.body).addClass('avqol-deny-play')
        // @ts-ignore
        libWrapper.register(CANONICAL_NAME, 'AVMaster.prototype.connect', (wrapper: any) =>{
            if (!avqol.allowPlay) {
                debug('User is not allowed to play, not connecting to AV');
                return false
            }
            debug('User is allowed to play, connecting to AV');
            $(document.body).removeClass('avqol-deny-play')
            return wrapper()
        }, 'MIXED')
    }
});

Hooks.on("ready", function() {
    const rtcWorldSettings = getRTCWorldSettings()
    if (rtcWorldSettings.mode === AVSettings.AV_MODES.DISABLED) {
        debug('AV mode is disabled, not rendering AVQOL settings');
        return;
    }
    if (shouldOpenSettings()) {
        debug('Opening AVQOL settings');
        getAVQOLAPI().openSettings();
    }
});
