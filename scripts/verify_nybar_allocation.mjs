import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window:{} };
vm.runInNewContext(fs.readFileSync(path.join(root, "nybar-allocation.js"), "utf8"), sandbox);
const allocation = sandbox.window.NY_BAR_ALLOCATION;

const professionalResponsibility = {
  id:"LAW-6641",
  code:"LAW 6641",
  credits:3,
  barPrimary:"professional",
  barCategories:["professional", "core"]
};
const legalWriting = {
  id:"LAW-6761",
  code:"LAW 6761",
  credits:2,
  barPrimary:"writing",
  barCategories:["writing"]
};

assert.ok(allocation, "allocation helper must load");
assert.deepEqual([...allocation.categories(professionalResponsibility)], ["professional", "core"]);
assert.equal(allocation.assignedCategory(professionalResponsibility, {}), "professional");
assert.equal(allocation.assignedCategory(professionalResponsibility, { "LAW-6641":"core" }), "core");
assert.equal(allocation.assignedCategory(professionalResponsibility, { "LAW-6641":"invalid" }), "professional");

const defaultTotals = allocation.creditsByCategory([professionalResponsibility, legalWriting], {}, () => true);
assert.deepEqual({ ...defaultTotals }, { professional:3, writing:2, american:0, core:0 });

const reallocatedTotals = allocation.creditsByCategory(
  [professionalResponsibility, legalWriting],
  { "LAW-6641":"core" },
  () => true
);
assert.deepEqual({ ...reallocatedTotals }, { professional:0, writing:2, american:0, core:3 });
assert.equal(Object.values(reallocatedTotals).reduce((sum, credits) => sum + credits, 0), 5, "category credits must count each selected course once");

const excludedTotals = allocation.creditsByCategory(
  [professionalResponsibility, legalWriting],
  { "LAW-6641":"core" },
  course => course.id !== "LAW-6641"
);
assert.deepEqual({ ...excludedTotals }, { professional:0, writing:2, american:0, core:0 });

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.ok(index.indexOf("./nybar-allocation.js") < index.indexOf("./app.js"), "allocation helper must load before app.js");

console.log("PASS: LAW 6641 defaults to Professional Responsibility, can move once to NYLE / Bar, and is never double counted.");
