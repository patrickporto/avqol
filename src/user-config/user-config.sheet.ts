import { TEMPLATE_PATH } from "../constants";

export class AVQOLUserConfig extends UserConfig {

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["sheet", "user-config"],
            template: `${TEMPLATE_PATH}/user-config.hbs`,
            width: 400,
            height: "auto",
            tabs: [{ navSelector: ".tabs", contentSelector: "form", initial: "general" }]
        })
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    get title(): string {
        return `${game.i18n.localize("PLAYERS.ConfigTitle")}: ${this.object.name}`;
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    getData(options = {}): Record<string, any> {
        const data = super.getData(options);
        return {
            ...data,
        };
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    activateListeners(html) {
        super.activateListeners(html);
    }
}
