import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
import { debug } from "./debug";
import { CANONICAL_NAME, VirtualBackground } from "./constants";
import { getAVQOLAPI } from "./api";
import { tasksCanvas } from "./third-party/convertMPMaskToImageBitmap";

const STREAM_FPS = 30;

export type CameraEffect = {
    stream: MediaStream;
    virtualBackground: string;
    cancel: () => void;
};

export type VirtualBackgroundOptions = Record<string, any>

export type VirtualBackgroundRender = (
    canvas: HTMLCanvasElement,
    options: VirtualBackgroundOptions
) => Promise<(results: any) => void>;

let requestAnimationFrameId: null | number = null;

export const applyEffect = async (
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    videoEffectContainer: HTMLElement,
    virtualBackground: string,
    virtualBackgroundOptions: VirtualBackgroundOptions = {}
): Promise<CameraEffect> => {
    const virtualBackgroundRender = await getAVQOLAPI().getVirtualBackgroundRender(virtualBackground)?.call(null, canvas, virtualBackgroundOptions);
    if (!virtualBackgroundRender) {
        throw new Error("No video effect found: " + virtualBackground);
    }
    debug("Applying video effect", virtualBackground, virtualBackgroundOptions);
    $(videoEffectContainer)
        .addClass("avqol-video-effect--active")
        .addClass("avqol-video-effect--loading");

    if (requestAnimationFrameId) {
        cancelAnimationFrame(requestAnimationFrameId);
    }
    const wasmFileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    const imageSegmenter = await ImageSegmenter.createFromOptions(wasmFileset, {
        baseOptions: {
            modelAssetPath:
                "https://storage.googleapis.com/mediapipe-tasks/image_segmenter/selfie_segmentation.tflite",
            delegate: "GPU"
        },
        canvas: tasksCanvas,
        runningMode: "VIDEO",
    });

    async function startSegmentationTask() {
        // In Safari, the timing of drawingImage for a VideoElement is severe and often results in an empty image.
        // Therefore, we use createImageBitmap to get the image from the video element at first.
        const input = await createImageBitmap(video);
        /**
         * Dispatches the segmentation task
         */
        const frameId = requestAnimationFrameId || 0;
        const imageSegmenterResult = imageSegmenter.segmentForVideo(input, frameId);

        // draw the segmentation mask on the canvas
        await virtualBackgroundRender(imageSegmenterResult, input, video);

        for (const mask of imageSegmenterResult.confidenceMasks) {
            mask.close();
        }

        // start the segmentation task loop using requestAnimationFrame
        $(videoEffectContainer).removeClass("avqol-video-effect--loading");
        requestAnimationFrameId = window.requestAnimationFrame(startSegmentationTask);

    }

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    requestAnimationFrameId = requestAnimationFrame(startSegmentationTask);

    const cancel = () => {
        if (requestAnimationFrameId) {
            cancelAnimationFrame(requestAnimationFrameId);
        }
        $(videoEffectContainer)
            .removeClass("avqol-video-effect--active")
            .removeClass("avqol-video-effect--loading");
    };

    return {
        stream: canvas.captureStream(STREAM_FPS),
        virtualBackground: virtualBackground,
        cancel,
    };
};

export const registerSettings = () => {
    (game as Game).settings.register(CANONICAL_NAME, "virtualBackground", {
        name: "AVQOL.VirtualBackground",
        hint: "AVQOL.VirtualBackgroundHint",
        scope: "client",
        config: false,
        default: VirtualBackground.NONE,
        type: String,
    });
    (game as Game).settings.register(CANONICAL_NAME, "virtualBackgroundOptions", {
        scope: "client",
        config: false,
        default: {},
        type: Object,
    });
};

export const getVirtualBackground = (): string => {
    return (game as Game).settings.get(
        CANONICAL_NAME,
        "virtualBackground"
    ) as string;
};

export const setVirtualBackground = async (virtualBackground: VirtualBackground) => {
    await (game as Game).settings.set(
        CANONICAL_NAME,
        "virtualBackground",
        virtualBackground
    );
};

export const getVirtualBackgroundOptions = (): Record<string, any> => {
    return (game as Game).settings.get(
        CANONICAL_NAME,
        "virtualBackgroundOptions"
    ) as Record<string, any>;
};

export const setVirtualBackgroundOptions = async (virtualBackgroundOptions: Record<string, any>) => {
    await (game as Game).settings.set(
        CANONICAL_NAME,
        "virtualBackgroundOptions",
        virtualBackgroundOptions
    );
};
