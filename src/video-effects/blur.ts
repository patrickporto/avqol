export default (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
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
