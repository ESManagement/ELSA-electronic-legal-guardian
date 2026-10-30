import { Kort, Markning, Sida } from "../components/ui";
import { ANVANDARE } from "../demo";

const DOMAN: Record<string, string> = { overformyndare: "Överförmyndare", val: "Val" };

export default function Admin() {
  return (
    <Sida titel="Administration" ingress="Konton, roller och domäner. Roller ger behörighet inom en domän; beslutsrätt kommer från delegationsordningen, inte från rollen.">
      <Kort titel="Konton">
        <div className="tabellram">
          <table>
            <thead>
              <tr>
                <th>Namn</th>
                <th>Roll</th>
                <th>Domän</th>
                <th>Egna uppdrag</th>
              </tr>
            </thead>
            <tbody>
              {ANVANDARE.map((a) => (
                <tr key={a.id}>
                  <td>{a.namn}</td>
                  <td>{a.roll_namn}</td>
                  <td>{[...new Set(a.motor.roller.map((r) => DOMAN[r.doman]))].join(", ")}</td>
                  <td>{a.motor.egnaUppdrag?.map((u) => u.uppdragId).join(", ") || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kort>
      <Kort titel="Begäran om tillfällig åtkomst">
        <ul className="radlista">
          <li>
            <span>
              Leverantörssupport vill felsöka AR-SYNT-3
              <div className="dampad">Ändamål: saknas · Godkännare: saknas · Giltig till: saknas</div>
            </span>
            <Markning varde="overskriden" text="Kan inte beviljas" />
          </li>
        </ul>
        <p className="dampad">Tillfällig läsåtkomst kräver ändamål, godkännare och sluttid. Systemadministratörer och leverantörssupport ser aldrig ärendeinnehåll genom sin roll.</p>
      </Kort>
    </Sida>
  );
}
