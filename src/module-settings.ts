import { registerSettings as debug } from "./debug";
import { registerSettings as avqol } from "./avqol";
import { registerSettings as videoEffects } from "./video-effects";

export default function registerSettings() {
    debug();
    avqol();
    videoEffects();
}
