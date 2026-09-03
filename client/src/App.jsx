import { RouterProvider } from "react-router-dom";
import { Agentation } from "agentation";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { router } from "./routes/index.jsx";

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <RouterProvider router={router} />
        {import.meta.env.DEV && <Agentation />}
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
