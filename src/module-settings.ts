import { registerSettings as debug } from "./debug";
import { registerSettings as avqol } from "./avqol";
import { registerSettings as cameraEffects } from "./camera-effects";
import { registerSettings as ux } from "./ux";

export default function registerSettings() {
    debug();
    avqol();
    cameraEffects();
    ux()
}
