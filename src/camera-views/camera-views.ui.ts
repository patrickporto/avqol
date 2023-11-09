import { TEMPLATE_PATH } from "../constants";

export class AVQOLCameraViews extends CameraViews {
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        id: "camera-views",
        template: `${TEMPLATE_PATH}/camera-views.html`,
        popOut: false,
        width: 240,
        resizable: {selector: ".camera-view-width-control", resizeY: false}
      });
    }
    activateListeners(html) {
        super.activateListeners(html);
    }
}
