import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import Admin from "./pages/Admin";
import ArendeDetalj from "./pages/ArendeDetalj";
import ElsaStart, { KomIgang, VertikalSida } from "./pages/ElsaStart";
import Crm from "./pages/Crm";
import Energi from "./pages/Energi";
import Hemsida from "./pages/Hemsida";
import Leverans from "./pages/Leverans";
import ModulSida from "./pages/ModulSida";
import OrganisationSida from "./pages/Organisation";
import Projekt, { ProjektLista } from "./pages/Projekt";
import Arenden from "./pages/Arenden";
import Behovsprovning from "./pages/Behovsprovning";
import Logg from "./pages/Logg";
import Login from "./pages/Login";
import MinaUppdrag from "./pages/MinaUppdrag";
import Notiser from "./pages/Notiser";
import Regelkort from "./pages/Regelkort";
import Startsida from "./pages/Startsida";
import Valplanering from "./pages/Valplanering";
import { useStore } from "./store";

export default function App() {
  const { jag } = useStore();
  if (!jag)
    return (
      <Routes>
        <Route path="/logga-in/:dorr" element={<Login />} />
        <Route path="*" element={<Hemsida />} />
      </Routes>
    );
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to={jag.roll === "stallforetradare" ? "/mina-uppdrag" : "/start"} replace />} />
        <Route path="/oversikt" element={<Startsida />} />
        <Route path="/start" element={<ElsaStart />} />
        <Route path="/start/vertikal/:id" element={<VertikalSida />} />
        <Route path="/start/kom-igang" element={<KomIgang />} />
        <Route path="/modul/:id" element={<ModulSida />} />
        <Route path="/projekt" element={<ProjektLista />} />
        <Route path="/projekt/:id" element={<Projekt />} />
        <Route path="/leverans" element={<Leverans />} />
        <Route path="/energi" element={<Energi />} />
        <Route path="/organisation" element={<OrganisationSida />} />
        <Route path="/esm/crm" element={<Crm />} />
        <Route path="/notiser" element={<Notiser />} />
        <Route path="/arenden" element={<Arenden />} />
        <Route path="/arenden/:id" element={<ArendeDetalj />} />
        <Route path="/behovsprovning" element={<Behovsprovning />} />
        <Route path="/val" element={<Valplanering />} />
        <Route path="/mina-uppdrag" element={<MinaUppdrag />} />
        <Route path="/regelkort" element={<Regelkort />} />
        <Route path="/logg" element={<Logg />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
