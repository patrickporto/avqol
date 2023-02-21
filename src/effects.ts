import "@tensorflow/tfjs-backend-webgl";
import * as bodyPix from "@tensorflow-models/body-pix";
import { debug } from "./debug";
import {
    getRTCClient,
    avclientIsLivekit,
    LivekitAVClient,
} from "./rtcsettings";

const OPACITY_VALUE = 8;
const MASK_BLUR_DENSITY = 2;
const FLIP_HORIZONTAL = false;

const STREAM_FPS = 30;

export type CameraEffect = {
    stream: MediaStream,
    cancel: () => void
}

export const applyBlurBackground = async (
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    videoEffectContainer: HTMLElement
): Promise<CameraEffect> => {
    debug("Applying blur background");
    $(videoEffectContainer).addClass("avqol-video-effect--active");
    const net = await bodyPix.load({
        architecture: "MobileNetV1",
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2,
    });

    // let lastTime = performance.now();
    let animationFrame:  number | null = null
    const cancel = () => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        $(videoEffectContainer).removeClass("avqol-video-effect--active");
    }
    // const gl = canvas.getContext('webgl2');

    let attemps: number = 0;
    const update = async () => {
        try {
            const segmentation = await net.segmentPerson(video, {
                flipHorizontal: false,
                internalResolution: "low",
                segmentationThreshold: 0.7,
            });
            video.width = video.width || video.videoWidth;
            video.height = video.height || video.videoHeight;

            bodyPix.drawBokehEffect(
                canvas,
                video,
                segmentation,
                OPACITY_VALUE,
                MASK_BLUR_DENSITY,
                FLIP_HORIZONTAL
            );
            attemps = 0;
        } catch (e) {
            attemps++;
            if (attemps > 1000) {
                debug("Failed to apply blur background", e);
                cancel()
                return;
            }
        }
        animationFrame = requestAnimationFrame(update);
    };

    video.addEventListener("loadedmetadata", update);

    animationFrame = requestAnimationFrame(update);
    return {
        stream: canvas.captureStream(STREAM_FPS),
        cancel,
    }
};
