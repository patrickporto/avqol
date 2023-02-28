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
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const blur = `blur(${options.blurRadius}px)`
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
        ctx.filter = blur;
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
        ctx.restore();
    };
}
