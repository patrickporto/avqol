import { CANONICAL_NAME, MODULE_NAME } from "./constants";

export const debug = (...args: any[]) => {
    // @ts-ignore
    if (game.settings.get(CANONICAL_NAME, 'debug')) {
        console.log(`${MODULE_NAME} | `, ...args);
    }
}

export const registerSettings = () => {
    (game as Game).settings.register(CANONICAL_NAME, 'debug', {
        name: 'Debug',
        hint: 'Enable debug logging',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
    });
}
