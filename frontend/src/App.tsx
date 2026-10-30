import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import Admin from "./pages/Admin";
import ArendeDetalj from "./pages/ArendeDetalj";
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
  if (!jag) return <Login />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={jag.roll === "stallforetradare" ? <Navigate to="/mina-uppdrag" replace /> : <Startsida />} />
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
