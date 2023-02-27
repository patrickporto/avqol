// export const renderOptions = (virtualBackgroundOptions: JQuery<HTMLElement>) => {
//     virtualBackgroundOptions.append(`
//         <div class="form-group">
//             <label for="blurRadius">Blur radius</label>
//             <input data-virtual-background type="number" class="form-control" id="blurRadius" value="6">
//         </div>
//     `);
// }

export default (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
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
        ctx.filter = "blur(6px)";
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
        ctx.restore();
    };
}
