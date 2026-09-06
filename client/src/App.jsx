import { RouterProvider } from "react-router-dom";
import { Agentation } from "agentation";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { ErrorBoundary } from "./components/common/ErrorBoundary.jsx";
import { router } from "./routes/index.jsx";

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ErrorBoundary>
          <RouterProvider router={router} />
          {import.meta.env.DEV && <Agentation />}
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
