import { Route, Routes } from "react-router-dom";
import { LandingPage } from "./pages/Landing/LandingPage";
import { LibraryPage } from "./pages/Library/LibraryPage";
import { ConfigurePage } from "./pages/Configure/ConfigurePage";
import { ResultsPage } from "./pages/Results/ResultsPage";

export default function App(): JSX.Element {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <main id="main-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<LibraryPage />} />
          <Route path="/configure/:bookId" element={<ConfigurePage />} />
          <Route path="/results/:generationId" element={<ResultsPage />} />
        </Routes>
      </main>
    </>
  );
}
