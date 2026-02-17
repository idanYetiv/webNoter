import html2canvas from "html2canvas";

export async function captureScreenshot(): Promise<string> {
  const canvas = await html2canvas(document.body, {
    useCORS: true,
    allowTaint: true,
    width: window.innerWidth,
    height: window.innerHeight,
    x: window.scrollX,
    y: window.scrollY,
  });

  return canvas.toDataURL("image/png", 0.5);
}

export function createThumbnail(
  dataUrl: string,
  maxWidth = 200
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = maxWidth / img.width;
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.src = dataUrl;
  });
}
