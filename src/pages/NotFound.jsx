import { Page, Btn } from "../components/ui.jsx";

export default function NotFound() {
  return (
    <Page title="Page not found" kicker="Lost · Every section is one tap away" sub="That address does not match any section. The loop below goes everywhere real.">
      <div className="flex flex-wrap gap-2">
        <Btn to="/">Back to start</Btn>
        <Btn to="/home" variant="quiet">Command center</Btn>
        <Btn to="/jobs" variant="quiet">Browse roles</Btn>
      </div>
    </Page>
  );
}
