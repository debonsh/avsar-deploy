// Home dispatches to the portal's own command center. Both live at /home
// because that is the screen a student opens every day; the ayush notice-board
// and the tech console are separate components, not one file full of ternaries.
import { useAvsar } from "../app/store.jsx";
import AyushHome from "./AyushHome.jsx";
import TechHome from "./TechHome.jsx";

export default function Home() {
  const { lane } = useAvsar();
  return lane === "ayush" ? <AyushHome /> : <TechHome />;
}
