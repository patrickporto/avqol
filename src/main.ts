import { AVQOLSettings } from "./avsettings";
import { debug } from "./debug";
import registerSettings from "./module-settings";
import { getRTCWorldSettings } from "./rtcsettings";
import './styles.css'

Hooks.on("init", function(...rest) {
    registerSettings();
    debug("This code runs once the Foundry VTT software begins its initialization workflow.", rest);
});

Hooks.on("ready", function() {
    const rtcWorldSettings = getRTCWorldSettings()
    if (rtcWorldSettings.mode === AVSettings.AV_MODES.DISABLED) {
        debug('AV mode is disabled, not rendering AVQOL settings');
        return;
    }
    debug('AV mode is enabled, rendering AVQOL settings');
    new AVQOLSettings('av-qol-settings').render(true);
});
