import { registerSettings as debug } from "./debug";
import { registerSettings as avqol } from "./avqol";
import { registerSettings as cameraEffects } from "./camera-effects";

export default function registerSettings() {
    debug();
    avqol();
    cameraEffects();
}
