import { ImageSegmenterResult } from '@mediapipe/tasks-vision';
import { getDefaultVirtualBackgroundPath } from "../api";
import { createCopyTextureToCanvas, tasksCanvas, toImageBitmap } from '../third-party/convertMPMaskToImageBitmap';

type VirtualBackgroundOptions = {
    customBackground: string;
}

export const renderOptions = (virtualBackgroundOptions: JQuery<HTMLElement>, data: Record<string, any>) => {
    const template = `
    <div class="form-group">
        <label for="customBackground">{{localize 'AVQOL.VirtualBackgroundCustomBackground'}}</label>
        <div class="form-fields">
            <input type="text" id="customBackground" name="virtualBackgroundOptions.customBackground" value="{{'virtualBackgroundOptions.customBackground'}}">
            {{filePicker type="imagevideo" target="customBackground"}}
        </div>
        <p class="notes">{{localize 'AVQOL.VirtualBackgroundCustomBackgroundHint'}}</p>
    </div>`
    virtualBackgroundOptions.append(Handlebars.compile(template)(data));

    const customBackground = virtualBackgroundOptions.find("#customBackground")
    virtualBackgroundOptions.find("[data-target='customBackground']").on("click", async (event) => {
        event.preventDefault()
        const filePicker = new FilePicker({
            type: "imagevideo",
            field: customBackground[0],
        })
        return filePicker.browse(getDefaultVirtualBackgroundPath())
    })
}

export default async (canvas: HTMLCanvasElement, options: VirtualBackgroundOptions) => {
    const ctx = canvas.getContext("2d");
    let customBackground: HTMLImageElement | HTMLVideoElement = new Image;
    customBackground.onerror = () => {
        customBackground = document.createElement("video");
        customBackground.src = options.customBackground
        customBackground.loop = true
        customBackground.autoplay = true
    }
    customBackground.crossOrigin = "anonymous";
    customBackground.src = options.customBackground
    await new Promise((resolve) => {
        customBackground.onload = resolve
        customBackground.onerror = () => {
            customBackground = document.createElement("video");
            customBackground.src = options.customBackground
            customBackground.loop = true
            customBackground.autoplay = true
            resolve(null)
        }
    })
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

        // Mask the image with the segmentation mask.
        ctx.save();
        ctx.fillStyle = 'white'
        ctx.clearRect(offsetX, offsetY, scaledWidth, scaledHeight)

        // // draw the mask image on the canvas
        // ctx.globalCompositeOperation = 'destination-in'
        // ctx.globalCompositeOperation = 'destination-atop'
        const segmentationMask = results.confidenceMasks[0];
        const segmentationMaskBitmap = await toImageBitmap(segmentationMask);
        ctx.drawImage(segmentationMaskBitmap, offsetX, offsetY, scaledWidth, scaledHeight);
        ctx.restore();

        ctx.save();

        ctx.globalCompositeOperation = 'source-atop'
        ctx.drawImage(input, offsetX, offsetY, scaledWidth, scaledHeight);
        ctx.restore();
        ctx.save();

        ctx.globalCompositeOperation = 'destination-over'
        if(options.customBackground) {
            ctx.drawImage(customBackground, offsetX, offsetY, scaledWidth, scaledHeight);
        } else {
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, video.videoWidth, videoHeight)
        }

        ctx.restore();
    };
}
