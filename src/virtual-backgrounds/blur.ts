import { ImageSegmenterResult } from '@mediapipe/tasks-vision';
import { createCopyTextureToCanvas, tasksCanvas } from './convertMPMaskToImageBitmap';

type VirtualBackgroundOptions = {
    blurRadius: number;
}

export const defaultOptions: VirtualBackgroundOptions = {
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


const safariBlurBackground = (context, blurRadius = 8) => {
    /**
     * Applies blur to the canvas image
     * An implementation for fallback for safari that does not support the filter property,
     * which is not practical because it is very slow.
     * @param context: 2d canvas context
     */
    const { height, width } = context.canvas
    const imageData = context.getImageData(0, 0, width, height)
    const videoPixels = imageData.data

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // get the pixel index
            const i = (y * width + x) * 4;
            // we get the average color of the neighboring pixels and set it to the current pixel
            let r = 0, g = 0, b = 0, a = 0;
            let pixelCount = 0;
            // we loop through the neighboring pixels
            for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                    let nx = x + dx;
                    let ny = y + dy;
                    // Check if the neighboring pixel is within the bounds of the image
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        let offset = (ny * width + nx) * 4;
                        r += videoPixels[offset];
                        g += videoPixels[offset + 1];
                        b += videoPixels[offset + 2];
                        a += videoPixels[offset + 3];
                        pixelCount++;
                    }
                }
            }

            // Compute the average color of the neighboring pixels
            let avgR = r / pixelCount;
            let avgG = g / pixelCount;
            let avgB = b / pixelCount;
            let avgA = a / pixelCount;

            // Write the blurred pixel to the video canvas
            videoPixels[i] = avgR;
            videoPixels[i + 1] = avgG;
            videoPixels[i + 2] = avgB;
            videoPixels[i + 3] = avgA;
        }
    }

    context.putImageData(imageData, 0, 0)
}

export default (canvas: HTMLCanvasElement, options: VirtualBackgroundOptions) => {
    const ctx = canvas.getContext("2d");
    const toImageBitmap = createCopyTextureToCanvas(tasksCanvas);
    return async (results: ImageSegmenterResult, input: ImageBitmap, video: HTMLVideoElement) => {
        // get the canvas dimensions
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // calculate the scale of the video to fit the canvas
        const scaleX = canvasWidth / videoWidth;
        const scaleY = canvasHeight / videoHeight;
        const scale = Math.min(scaleX, scaleY);

        // The scale is defined for the video width and height
        const scaledWidth = videoWidth * scale;
        const scaledHeight = videoHeight * scale;

        // calculate the offset to center the video on the canvas
        const offsetX = (canvasWidth - scaledWidth) / 2;
        const offsetY = (canvasHeight - scaledHeight) / 2;

        // const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // const originalImage = new ImageData(originalImageData.width, originalImageData.height);

        // Mask the image with the segmentation mask.

        ctx.save();
        ctx.fillStyle = 'white'
        ctx.clearRect(0, 0, scaledWidth, scaledHeight)

        // // draw the mask image on the canvas
        const segmentationMask = results.confidenceMasks[0];
        const segmentationMaskBitmap = await toImageBitmap(segmentationMask);
        // ctx.translate(canvasWidth, 0);
        // ctx.scale(-1, 1);
        ctx.drawImage(segmentationMaskBitmap, offsetX, offsetY, scaledWidth, scaledHeight);
        ctx.restore();

        ctx.save();

        const blurBackgroundCanvas = document.createElement('canvas');
        blurBackgroundCanvas.width = videoWidth;
        blurBackgroundCanvas.height = videoHeight;
        const blurBackgroundCtx = blurBackgroundCanvas.getContext('2d');
        // blurBackgroundCtx.translate(videoWidth, 0);
        // blurBackgroundCtx.scale(-1, 1);
        if (blurBackgroundCtx.filter) {
            blurBackgroundCtx.filter = `blur(${options.blurRadius}px)`
            blurBackgroundCtx.drawImage(input, 0, 0, videoWidth, videoHeight)
        } else {
            // Safari does not supported for filter property.
            blurBackgroundCtx.drawImage(input, 0, 0, scaledWidth, scaledHeight)
            safariBlurBackground(blurBackgroundCtx, options.blurRadius)
        }

        // draw the blur background on the canvas
        ctx.globalCompositeOperation = 'source-out'
        ctx.drawImage(blurBackgroundCanvas, offsetX, offsetY, scaledWidth, scaledHeight);

        ctx.restore();

        // ctx.save();
        // scale, flip and draw the video to fit the canvas
        ctx.globalCompositeOperation = 'destination-atop'
        ctx.drawImage(input, offsetX, offsetY, scaledWidth, scaledHeight);
        ctx.restore();
    };
}
