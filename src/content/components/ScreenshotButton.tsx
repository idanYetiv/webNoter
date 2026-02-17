import { useScreenshot } from "../../hooks/useScreenshot";

interface ScreenshotButtonProps {
  onCapture: (dataUrl: string) => void;
}

export default function ScreenshotButton({ onCapture }: ScreenshotButtonProps) {
  const { capture, capturing } = useScreenshot();

  const handleClick = async () => {
    const result = await capture();
    if (result) onCapture(result);
  };

  return (
    <button
      onClick={handleClick}
      disabled={capturing}
      title="Capture screenshot"
      style={{
        background: "none",
        border: "none",
        cursor: capturing ? "wait" : "pointer",
        padding: "2px 4px",
        fontSize: "14px",
        opacity: capturing ? 0.5 : 1,
      }}
    >
      {capturing ? "..." : "\u{1F4F7}"}
    </button>
  );
}
