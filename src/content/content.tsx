import { createRoot } from "react-dom/client";
import ContentApp from "./ContentApp";

function init() {
  if (document.getElementById("notara-root")) return;

  const container = document.createElement("div");
  container.id = "notara-root";
  // Reset inherited styles but keep it positioned for fixed children
  container.style.cssText =
    "all:initial; position:fixed; top:0; left:0; width:0; height:0; z-index:2147483647; pointer-events:none;";
  document.body.appendChild(container);

  // Inner wrapper that re-enables pointer events on actual UI
  const inner = document.createElement("div");
  inner.id = "notara-container";
  inner.style.pointerEvents = "auto";
  container.appendChild(inner);

  const root = createRoot(inner);
  root.render(<ContentApp />);
}

export function onExecute() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
