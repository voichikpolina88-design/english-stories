import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

type ErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("StoryLingo failed to render", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-runtime-error" role="alert">
          <div>
            <strong>StoryLingo не запустился</strong>
            <span>Обновите страницу. Если вы открыли сайт во встроенном браузере, попробуйте Safari.</span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

try {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Root element was not found");
  }

  createRoot(rootElement).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  );
} catch (error) {
  console.error("StoryLingo failed to start", error);
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div class="app-runtime-error" role="alert">
        <div>
          <strong>StoryLingo не запустился</strong>
          <span>Обновите страницу. Если вы открыли сайт во встроенном браузере, попробуйте Safari.</span>
        </div>
      </div>
    `;
  }
}
