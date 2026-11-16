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
) => Promise<(results: any, input: ImageBitmap, video: HTMLVideoElement) => void | Promise<void>>;

let imageSegmenterPromise: Promise<ImageSegmenter> | null = null;
let lastSegmentationTimestamp = 0;

/**
 * The segmenter (WASM runtime + model) is loaded once and shared by every
 * effect (live camera and config preview). Camera views are re-rendered
 * often, and each re-render has to restart the effect on a fresh canvas -
 * re-downloading/re-initialising the model each time would be slow and
 * would leak the previous instance.
 */
const getImageSegmenter = (): Promise<ImageSegmenter> => {
    if (!imageSegmenterPromise) {
        imageSegmenterPromise = (async () => {
            // Pinned to match the "@mediapipe/tasks-vision" version in package.json,
            // instead of trusting "@latest" on the CDN to stay compatible forever.
            // Bump this alongside the "@mediapipe/tasks-vision" devDependency.
            //
            // @mediapipe/tasks-vision's WASM glue code (vision_wasm_internal.js) is
            // Emscripten-generated and follows the classic convention of a global
            // `Module` object for runtime config, read via
            // `typeof Module != 'undefined' ? Module : {}`. Foundry v13+ also
            // defines a *deprecated* global `Module` (a getter/setter shim for
            // `foundry.packages.Module`) for backwards compatibility. Before
            // MediaPipe ever assigns to it, that first read resolves through
            // Foundry's getter and returns Foundry's Module *class* (a function) -
            // and MediaPipe's own error/stack-trace handling then throws trying to
            // access `.arguments`/`.caller` on it, which is forbidden on strict-mode
            // functions (ES classes always are strict). Priming the global to
            // `undefined` first makes Foundry's compatibility getter short-circuit
            // (it returns early for any key it already has an override for) so
            // MediaPipe sees a plain `undefined` and sets up its own Module object
            // instead of tripping over Foundry's class.
            (globalThis as { Module?: unknown }).Module = undefined;
            const wasmFileset = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.7/wasm"
            );
            return ImageSegmenter.createFromOptions(wasmFileset, {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-tasks/image_segmenter/selfie_segmentation.tflite",
                    delegate: "GPU"
                },
                canvas: tasksCanvas,
                runningMode: "VIDEO",
            });
        })();
        // Allow a retry (e.g. after a network failure) instead of caching the error.
        imageSegmenterPromise.catch(() => {
            imageSegmenterPromise = null;
        });
    }
    return imageSegmenterPromise;
};

/**
 * MediaPipe requires strictly increasing timestamps per segmenter, and the
 * segmenter is shared between concurrently running effects.
 */
const nextSegmentationTimestamp = (): number => {
    lastSegmentationTimestamp = Math.max(lastSegmentationTimestamp + 1, performance.now());
    return lastSegmentationTimestamp;
};

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

    // Loop state is owned by this effect. It used to live in a module-level
    // variable shared by every effect, so cancelling one effect (e.g. the
    // config sheet preview when the sheet closes) cancelled whichever loop
    // had scheduled the most recent frame - usually the live camera's -
    // leaving the camera frozen on its last frame.
    let cancelled = false;
    let animationFrameId: number | null = null;

    let imageSegmenter: ImageSegmenter;
    try {
        imageSegmenter = await getImageSegmenter();
    } catch (error) {
        $(videoEffectContainer)
            .removeClass("avqol-video-effect--active")
            .removeClass("avqol-video-effect--loading");
        throw error;
    }

    const segmentationLoop = async () => {
        animationFrameId = null;
        // Stop for good once cancelled, or once the source <video> has been
        // thrown away by a re-render of its application.
        if (cancelled || !video.isConnected) {
            return;
        }
        try {
            // The video may not have a frame yet right after a (re-)render.
            if (video.readyState >= 2 && video.videoWidth > 0) {
                // In Safari, the timing of drawingImage for a VideoElement is severe and often results in an empty image.
                // Therefore, we use createImageBitmap to get the image from the video element at first.
                const input = await createImageBitmap(video);
                try {
                    if (cancelled) {
                        return;
                    }
                    const imageSegmenterResult = imageSegmenter.segmentForVideo(input, nextSegmentationTimestamp());
                    try {
                        // draw the segmentation mask on the canvas
                        await virtualBackgroundRender(imageSegmenterResult, input, video);
                    } finally {
                        for (const mask of imageSegmenterResult.confidenceMasks ?? []) {
                            mask.close();
                        }
                    }
                } finally {
                    input.close();
                }
                $(videoEffectContainer).removeClass("avqol-video-effect--loading");
            }
        } catch (error) {
            // A single bad frame must not kill the loop (and freeze the camera).
            debug("Failed to render a video effect frame", error);
        }
        if (!cancelled) {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            animationFrameId = requestAnimationFrame(segmentationLoop);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    animationFrameId = requestAnimationFrame(segmentationLoop);

    const cancel = () => {
        if (cancelled) {
            return;
        }
        cancelled = true;
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
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
