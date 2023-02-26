import "@mediapipe/selfie_segmentation";
import { debug } from "./debug";
import { CANONICAL_NAME, VirtualBackground } from "./constants";
import { getAVQOLAPI } from "./avqol";

const STREAM_FPS = 30;

export type CameraEffect = {
    stream: MediaStream;
    virtualBackground: string;
    cancel: () => void;
};
export type VirtualBackgroundRender = (
    canvas: HTMLCanvasElement
) => (results: any) => void;

const flipCanvasHorizontal = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
};

export const applyEffect = async (
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    videoEffectContainer: HTMLElement,
    virtualBackground: string
): Promise<CameraEffect> => {
    const virtualBackgroundRender = getAVQOLAPI().getVirtualBackgroundRender(virtualBackground);
    if (!virtualBackgroundRender) {
        throw new Error("No video effect found: " + virtualBackground);
    }
    debug("Applying video effect", virtualBackground);
    $(videoEffectContainer)
        .addClass("avqol-video-effect--active")
        .addClass("avqol-video-effect--loading");

    // @ts-ignore
    const selfieSegmentation = new SelfieSegmentation({
        locateFile: (file: any) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
        },
    });
    selfieSegmentation.setOptions({
        modelSelection: 1,
    });
    selfieSegmentation.onResults((results: any) => {
        flipCanvasHorizontal(canvas);
        virtualBackgroundRender(canvas)(results)
    });

    let videoRefreshAnimationFrame: null | number = null;

    const refreshVideoEffect = async () => {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            await new Promise((resolve) => {
                video.addEventListener("loadedmetadata", resolve);
            });
            video.play();
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
};

export const getVirtualBackground = (): string => {
    return (game as Game).settings.get(
        CANONICAL_NAME,
        "virtualBackground"
    ) as string;
};

export const setVirtualBackground = async (videoEffect: VirtualBackground) => {
    await (game as Game).settings.set(
        CANONICAL_NAME,
        "virtualBackground",
        videoEffect
    );
};
