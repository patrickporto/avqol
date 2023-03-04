import { getDefaultVirtualBackgroundPath } from "../avqol";

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

export default async (canvas: HTMLCanvasElement, options: Record<string, any>) => {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    let customBackground: HTMLImageElement | HTMLVideoElement = new Image;
    customBackground.onerror = () => {
        customBackground = document.createElement("video") as HTMLVideoElement;
        customBackground.src = options.customBackground
        customBackground.loop = true
        customBackground.autoplay = true
    }
    customBackground.crossOrigin = "anonymous";
    customBackground.src = options.customBackground
    await new Promise((resolve) => {
        customBackground.onload = resolve
        customBackground.onerror = () => {
            customBackground = document.createElement("video") as HTMLVideoElement;
            customBackground.src = options.customBackground
            customBackground.loop = true
            customBackground.autoplay = true
            resolve(null)
        }
    })
    return (results: any) => {
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
        if (options.customBackground) {
            ctx.drawImage(customBackground, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        }
        ctx.restore();
    };
}
