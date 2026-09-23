import { Page, Btn } from "../components/ui.jsx";

export default function NotFound() {
  return (
    <Page title="Page not found" sub="That address does not match any section.">
      <Btn to="/">Back to home</Btn>
    </Page>
  );
}
