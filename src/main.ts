import { getAVQOLAPI, registerAVQOLAPI } from "./avqol";
import { VideoEffect } from "./constants";
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
    Hooks.callAll("AVQOL.init", getAVQOLAPI());
});

Hooks.on("ready", function() {
    const rtcWorldSettings = getRTCWorldSettings()
    if (rtcWorldSettings.mode === AVSettings.AV_MODES.DISABLED) {
        debug('AV mode is disabled, not rendering AVQOL settings');
        return;
    }
    debug('AV mode is enabled, rendering AVQOL settings');
    // getAVQOLAPI().openSettings();
});
