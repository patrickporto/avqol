import { registerSettings as debug } from "./debug";
import { registerSettings as avqol } from "./avqol";

export default function registerSettings() {
    debug();
    avqol();
}
