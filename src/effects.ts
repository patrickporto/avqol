import '@mediapipe/control_utils/control_utils'
import '@mediapipe/drawing_utils/drawing_utils'
import "@mediapipe/camera_utils";
import "@mediapipe/selfie_segmentation"
import { debug } from "./debug";

const STREAM_FPS = 30;

export type CameraEffect = {
    stream: MediaStream;
    cancel: () => void;
};

export const applyBlurBackground = async (
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    videoEffectContainer: HTMLElement
): Promise<CameraEffect> => {
    debug("Applying blur background");
    $(videoEffectContainer).addClass("avqol-video-effect--active");

    // let lastTime = performance.now();
    let animationFrame: number | null = null;
    const cancel = () => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        $(videoEffectContainer).removeClass("avqol-video-effect--active");
    };
    // const ctx = canvas.getContext('webgl2') as WebGL2RenderingContext;
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
        ctx.globalCompositeOperation = "destination-atop";
        ctx.fillStyle = "#00FF00";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    // @ts-ignore
    const camera = new Camera(video, {
        onFrame: async () => {
            await selfieSegmentation.send({ image: video });
        },
        width: 1280,
        height: 720,
    });
    camera.start();
    return {
        stream: canvas.captureStream(STREAM_FPS),
        cancel,
    };
};
