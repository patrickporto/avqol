import { getAVQOLAPI, registerAVQOLAPI } from "./avqol";
import { CANONICAL_NAME } from "./constants";
import { debug } from "./debug";
import registerSettings from "./module-settings";
import { getRTCWorldSettings } from "./rtcsettings";
import './styles.css'
import "./camera-view"

Hooks.on("init", function(...rest) {
    registerSettings();
    debug('initializing AVQOL');
    registerAVQOLAPI();
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
