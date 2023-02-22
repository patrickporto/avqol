import "@mediapipe/selfie_segmentation";
import { debug } from "./debug";
import { CANONICAL_NAME, VideoEffect } from "./constants";
import { getAVQOLAPI } from "./avqol";

const STREAM_FPS = 30;

export type CameraEffect = {
    stream: MediaStream;
    cancel: () => void;
};
export type VideoEffectRender = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => (results: any) => void;

export const applyEffect = async (
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    videoEffectContainer: HTMLElement,
    videoEffect: string
): Promise<CameraEffect> => {
    debug("Applying video effect", videoEffect);
    const render = getAVQOLAPI().getVideoEffectRender(videoEffect)
    if (!render) {
        throw new Error("No video effect found: " + videoEffect);
    }
    return await renderCameraEffect(canvas, video, videoEffectContainer, render);
};

const renderCameraEffect = async (
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    videoEffectContainer: HTMLElement,
    videoEffectRender: VideoEffectRender,
): Promise<CameraEffect> => {
    debug("Applying blur background");
    $(videoEffectContainer)
        .addClass("avqol-video-effect--active")
        .addClass("avqol-video-effect--loading");

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    const onResults = videoEffectRender(ctx, canvas);

    // @ts-ignore
    const selfieSegmentation = new SelfieSegmentation({
        locateFile: (file: any) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
        },
    });
    selfieSegmentation.setOptions({
        modelSelection: 1,
    });
    selfieSegmentation.onResults(onResults);

    let videoRefreshAnimationFrame: null | number = null

    const refreshVideoEffect = async () => {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            await new Promise((resolve) => {
                video.addEventListener("loadedmetadata", resolve)
            })
            video.play()
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
        cancel,
    };
};

export const registerSettings = () => {
    (game as Game).settings.register(CANONICAL_NAME, "videoEffects", {
        name: "AVQOL.VideoEffects",
        hint: "AVQOL.VideoEffectsHint",
        scope: "client",
        config: false,
        default: VideoEffect.NONE,
        type: String,
    });
};

export const getVideoEffect = (): string => {
    return (game as Game).settings.get(
        CANONICAL_NAME,
        "videoEffects"
    ) as string;
};

export const setVideoEffect = async (videoEffect: VideoEffect) => {
    await (game as Game).settings.set(
        CANONICAL_NAME,
        "videoEffects",
        videoEffect
    );
};


