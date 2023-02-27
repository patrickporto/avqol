export const renderOptions = (virtualBackgroundOptions: JQuery<HTMLElement>) => {
    const template = `
    <div class="form-group">
        <label for="customBackground">{{localize 'AVQOL.VirtualBackgroundCustomBackground'}}</label>
        <div class="form-fields">
            <input type="text" id="customBackground" name="virtualBackgroundOptions.customBackground">
            {{filePicker type="imagevideo" target="customBackground"}}
        </div>
        <p class="notes">{{localize 'AVQOL.VirtualBackgroundCustomBackgroundHint'}}</p>
    </div>`
    virtualBackgroundOptions.append(Handlebars.compile(template)({}));

    const customBackground = virtualBackgroundOptions.find("#customBackground")
    virtualBackgroundOptions.find("[data-target='customBackground']").on("click", async (event) => {
        event.preventDefault()
        const filePicker = new FilePicker({
            type: "imagevideo",
            field: customBackground[0],
        })
        return filePicker.browse('data')
    })
}

export default (canvas: HTMLCanvasElement, options: Record<string, any>) => {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    let customBackground: HTMLImageElement | HTMLVideoElement = new Image;
    customBackground.onerror = () => {
        customBackground = document.createElement("video") as HTMLVideoElement;
        customBackground.src = options.customBackground
        customBackground.loop = true
        customBackground.play()
    }
    customBackground.crossOrigin = "anonymous";
    customBackground.src = options.customBackground
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