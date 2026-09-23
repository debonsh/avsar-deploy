import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { importNaukri, mapNaukri } from "../scripts/naukri.mjs";

describe("naukri import", () => {
  it("maps a dev posting with skills + fresher score", () => {
    const j = mapNaukri({ id: 1, title: "React JS Developer", company: "Infosys", experience: "0-7 Yrs", location: "Hyderabad, Pune", posted: "now" }, "https://x");
    assert.equal(j.role, "sde");
    assert.ok(j.skills.includes("react"));
    assert.equal(j.minScore, 40);
    assert.equal(j.loc, "Hyderabad");
    assert.equal(j.src, "naukri");
  });
  it("denies mechanical/support/recruiter titles", () => {
    for (const t of ["Fresher Maintenance Engineer", "It Support Engineer", "US Recruiter - Mech background", "Field Service Engineer", "Purchase Specialist"]) {
      assert.equal(mapNaukri({ title: t, company: "X" }), null, t);
    }
  });
  it("dedupes same title+company, counts drops", () => {
    const raw = { url: "#", jobs: [
      { id: 1, title: "React JS Developer", company: "Infosys", experience: "0-1 Yrs", location: "Pune" },
      { id: 2, title: "React JS Developer", company: "Infosys", experience: "0-1 Yrs", location: "Pune" },
      { id: 3, title: "Truck Driver", company: "X" },
    ]};
    const { jobs, dropped, total } = importNaukri(raw);
    assert.equal(jobs.length, 1);
    assert.equal(dropped, 2);
    assert.equal(total, 3);
  });
});
