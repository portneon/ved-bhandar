import { Route, Routes } from "react-router-dom";
// import { LandingPage } from "./pages/Landing/LandingPage";
import { LibraryPage } from "./pages/Library/LibraryPage";
import { ConfigurePage } from "./pages/Configure/ConfigurePage";
import { ResultsPage } from "./pages/Results/ResultsPage";
// import { LoginPage } from "./pages/Auth/LoginPage";
// import { SignupPage } from "./pages/Auth/SignupPage";
import { TemplatesPage } from "./pages/Templates/TemplatesPage";
import { TemplateBuilderPage } from "./pages/Templates/TemplateBuilderPage";
import { UploadTemplatePage } from "./pages/Templates/UploadTemplatePage";
// import { ProtectedRoute } from "./auth/ProtectedRoute";

export default function App(): JSX.Element {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <main id="main-content">
        <Routes>
          {/* Login is disabled — the site opens straight into the upload/generate menus. */}
          <Route path="/" element={<LibraryPage />} />
          {/* <Route path="/login" element={<LoginPage />} /> */}
          {/* <Route path="/signup" element={<SignupPage />} /> */}

          {/* <Route element={<ProtectedRoute />}> */}
          <Route path="/app" element={<LibraryPage />} />
          <Route path="/configure/:bookId" element={<ConfigurePage />} />
          <Route path="/results/:generationId" element={<ResultsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/new" element={<TemplateBuilderPage />} />
          <Route path="/templates/upload" element={<UploadTemplatePage />} />
          {/* </Route> */}
        </Routes>
      </main>
    </>
  );
}
