import "@mediapipe/selfie_segmentation";
import { debug } from "./debug";
import { CANONICAL_NAME, VirtualBackground } from "./constants";
import { getAVQOLAPI } from "./api";

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

const flipCanvasHorizontal = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
};

let videoRefreshAnimationFrame: null | number = null;

// @ts-ignore
const selfieSegmentation = new SelfieSegmentation({
    locateFile: (file: any) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
    },
});
selfieSegmentation.setOptions({
    modelSelection: 1,
});

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

    if (videoRefreshAnimationFrame) {
        cancelAnimationFrame(videoRefreshAnimationFrame);
        selfieSegmentation.reset();
    }
    selfieSegmentation.onResults(async (results: any) => {
        flipCanvasHorizontal(canvas);
        virtualBackgroundRender(results)
    });
    const refreshVideoEffect = async () => {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            await new Promise((resolve) => {
                video.addEventListener("loadedmetadata", resolve);
            });
            video?.play();
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        await selfieSegmentation.send({ image: video });
        $(videoEffectContainer).removeClass("avqol-video-effect--loading");
        videoRefreshAnimationFrame = requestAnimationFrame(refreshVideoEffect);
    };

    videoRefreshAnimationFrame = requestAnimationFrame(refreshVideoEffect);

    const cancel = async () => {
        if (videoRefreshAnimationFrame) {
            cancelAnimationFrame(videoRefreshAnimationFrame);
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
