import { ImageSegmenterResult } from '@mediapipe/tasks-vision';
import { createCopyTextureToCanvas, tasksCanvas } from './convertMPMaskToImageBitmap';
export const defaultOptions = {
    blurRadius: 6,
}

export const renderOptions = (virtualBackgroundOptions: JQuery<HTMLElement>, data: Record<string, any>) => {
    const template = `
    <div class="form-group">
        <label for="blurRadius">{{localize 'AVQOL.VirtualBackgroundBlurBackgroundRadius'}}</label>
        {{rangePicker name="virtualBackgroundOptions.blurRadius" value=blurRadius min=3 max=10 step=1}}
    </div>`
    virtualBackgroundOptions.append(Handlebars.compile(template)(data));
}

export default async (canvas: HTMLCanvasElement, options: Record<string, any>) => {
    const ctx = canvas.getContext("2d");
    // const blur = `blur(${options.blurRadius}px)`
    const toImageBitmap = createCopyTextureToCanvas(tasksCanvas);
    return async (results: ImageSegmenterResult) => {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // const originalImage = new ImageData(originalImageData.width, originalImageData.height);

        // Mask the image with the segmentation mask.
        ctx.globalCompositeOperation = "destination-in";
        const segmentationMask = results.confidenceMasks[0];
        const segmentationMaskBitmap = await toImageBitmap(segmentationMask);
        ctx.drawImage(
            segmentationMaskBitmap,
            0,
            0,
            canvas.width,
            canvas.height
        );
        ctx.restore();

        // Only overwrite missing pixels.
        // ctx.globalCompositeOperation = "destination-over";
        // ctx.filter = blur;
        // ctx.drawImage(originalImageData, 0, 0, canvas.width, canvas.height);
        // ctx.filter = "none";
        // ctx.restore();
    };
}
