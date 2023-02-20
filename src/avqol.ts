import { AVQOLSettings } from "./avsettings";
import { CANONICAL_NAME } from "./constants"

class AVQOL {
    openSettings() {
        new AVQOLSettings('avqolSettings').render(true);
    }
}

export const registerAVQOLAPI = () => {
    // @ts-ignore
    (game as Game).modules.get(CANONICAL_NAME).api = new AVQOL()
}

export const getAVQOLAPI = () => {
    // @ts-ignore
    return (game as Game).modules.get(CANONICAL_NAME).api;
}


export const registerSettings = () => {
    (game as Game).settings.registerMenu(CANONICAL_NAME, 'avqolSettings', {
        name: (game as Game).i18n.localize('AVQOL.MenuConfigutation'),
        label: (game as Game).i18n.localize('AVQOL.MenuConfigutationLabel'),
        hint: (game as Game).i18n.localize('AVQOL.MenuConfigutationHint'),
        // scope: 'client',
        // requiresReload: true,
        icon: 'fas fa-headset',
        // @ts-ignore
        type: AVQOLSettings,
    });
}
