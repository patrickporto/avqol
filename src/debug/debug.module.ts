import { DebugService } from "./debug.service";
import { DebugSettings } from "./debug.settings";

let debugSettings: DebugSettings;
export let debugService: DebugService;

export default {
    hooks: {
        async init() {
            debugSettings = new DebugSettings();
            debugSettings.registerSettings();

            debugService = new DebugService(debugSettings);
        }
    }
}
