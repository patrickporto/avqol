// @ts-ignore
import { libWrapper } from "./third-party/libwrapper-shim.js";
import {
    getAVQOLAPI,
    registerAVQOLAPI,
} from "./api.js";
import { CANONICAL_NAME } from "./constants";

import { debug } from "./debug";
import registerSettings from "./module-settings";
import "./avqol.css";
import "./camera-view";
import "./virtual-backgrounds";
import "./ux";
import { AVQOLUserConfig } from "./user-config/user-config.sheet.js";

Hooks.on("init", async () => {
    registerSettings();

    // @ts-ignore - the global `DocumentSheetConfig` still works but is
    // deprecated as of v13, removed in v15.
    foundry.applications.apps.DocumentSheetConfig.registerSheet(User, CANONICAL_NAME, AVQOLUserConfig, {
        label: "AVQOL.UserConfig",
        makeDefault: true,
    })
    debug("initializing AVQOL");
    registerAVQOLAPI();
    const avqol = getAVQOLAPI();
    Hooks.callAll("AVQOL.init", avqol);
});
