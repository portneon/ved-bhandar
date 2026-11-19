import { Route, Routes } from "react-router-dom";
import { LibraryPage } from "./pages/Library/LibraryPage";
import { ConfigurePage } from "./pages/Configure/ConfigurePage";
import { ResultsPage } from "./pages/Results/ResultsPage";
import { TemplatesPage } from "./pages/Templates/TemplatesPage";
import { TemplateBuilderPage } from "./pages/Templates/TemplateBuilderPage";
import { UploadTemplatePage } from "./pages/Templates/UploadTemplatePage";

export default function App(): JSX.Element {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <main id="main-content">
        <Routes>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/app" element={<LibraryPage />} />
          <Route path="/configure/:bookId" element={<ConfigurePage />} />
          <Route path="/results/:generationId" element={<ResultsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/new" element={<TemplateBuilderPage />} />
          <Route path="/templates/upload" element={<UploadTemplatePage />} />
        </Routes>
      </main>
    </>
  );
}
