import { createRoot } from "react-dom/client";
import ContentApp from "./ContentApp";

function init() {
  // Create a shadow DOM host to isolate our styles
  const host = document.createElement("div");
  host.id = "webnoter-root";
  host.style.all = "initial";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // Create a container inside shadow DOM
  const container = document.createElement("div");
  container.id = "webnoter-container";
  shadow.appendChild(container);

  const root = createRoot(container);
  root.render(<ContentApp />);
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
