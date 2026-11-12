import { Route, Routes } from "react-router-dom";
import { LibraryPage } from "./pages/Library/LibraryPage";
import { ConfigurePage } from "./pages/Configure/ConfigurePage";
import { ResultsPage } from "./pages/Results/ResultsPage";

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<LibraryPage />} />
      <Route path="/configure/:bookId" element={<ConfigurePage />} />
      <Route path="/results/:generationId" element={<ResultsPage />} />
    </Routes>
  );
}
