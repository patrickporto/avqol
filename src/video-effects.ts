import "@mediapipe/selfie_segmentation";
import { debug } from "./debug";
import { CANONICAL_NAME } from "./constants";

const STREAM_FPS = 30;

export type CameraEffect = {
    stream: MediaStream;
    cancel: () => void;
};

export enum VideoEffect {
    NONE = "NONE",
    BLUR_BACKGROUND = "BLUR_BACKGROUND",
}

export const getVideoEffectsOptions = (): Record<string, string> => ({
    [VideoEffect.NONE]: (game as Game).i18n.localize("None"),
    [VideoEffect.BLUR_BACKGROUND]: (game as Game).i18n.localize(
        "AVQOL.VideoEffectsBlurBackground"
    ),
});

export const applyVideoEffect = async (
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    videoEffectContainer: HTMLElement,
    videoEffect: VideoEffect
): Promise<CameraEffect> => {
    debug("Applying video effect", videoEffect);
    if (videoEffect === VideoEffect.BLUR_BACKGROUND) {
        return await applyBlurBackground(canvas, video, videoEffectContainer);
    }
    throw new Error("No video effect found");
};

export const applyBlurBackground = async (
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    videoEffectContainer: HTMLElement
): Promise<CameraEffect> => {
    debug("Applying blur background");
    $(videoEffectContainer)
        .addClass("avqol-video-effect--active")
        .addClass("avqol-video-effect--loading");

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    const onResults = (results: any) => {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the original image
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        // Mask the image with the segmentation mask.
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(
            results.segmentationMask,
            0,
            0,
            canvas.width,
            canvas.height
        );

        // Only overwrite missing pixels.
        ctx.globalCompositeOperation = "destination-over";
        ctx.filter = "blur(6px)";
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
        ctx.restore();
    };

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
        choices: getVideoEffectsOptions(),
    });
};

export const getVideoEffect = (): VideoEffect => {
    return (game as Game).settings.get(
        CANONICAL_NAME,
        "videoEffects"
    ) as VideoEffect;
};

export const setVideoEffect = async (videoEffect: VideoEffect) => {
    await (game as Game).settings.set(
        CANONICAL_NAME,
        "videoEffects",
        videoEffect
    );
};
