/* Open-world planning: visited places become separated districts joined by a
   connected highway network. Runs in Node without a GPU. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { planWorld } from "../www/ow-world.js";

const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL("../www/data.js", import.meta.url), "utf8"), ctx);
const places = ctx.window.SUNFLOWER_DATA.places;
const coords = p => ({ Yerevan: [40.18, 44.5], Tbilisi: [41.72, 44.78], Nairobi: [-1.29, 36.82], Prague: [50.08, 14.43] })[p.city] || [((p.city.length * 7) % 60) - 20, ((p.country.length * 13) % 200) - 80];
const pick = names => names.map(n => places.find(p => p.city === n).id);

const visitedIds = pick(["Yerevan", "Tbilisi", "Nairobi", "Prague"]);
const plan = planWorld(places.filter(p => visitedIds.includes(p.id)), { visited: Object.fromEntries(visitedIds.map(i => [i, true])), currentId: visitedIds[0], coords });
assert.equal(plan.districts.length, 4, "every given place becomes a city");
for (const a of plan.districts) for (const b of plan.districts) if (a !== b) assert(Math.hypot(a.x - b.x, a.z - b.z) >= a.R + b.R + 100, "cities do not overlap");
const yer = plan.districts.find(d => d.place.city === "Yerevan"), tbi = plan.districts.find(d => d.place.city === "Tbilisi"), nai = plan.districts.find(d => d.place.city === "Nairobi");
assert(tbi.z < yer.z, "Tbilisi stays north of Yerevan (north is -z)");
assert(nai.z > yer.z, "Nairobi stays south");
assert(Math.hypot(yer.x - tbi.x, yer.z - tbi.z) < Math.hypot(yer.x - nai.x, yer.z - nai.z), "neighbouring cities stay closer");
// Highways connect every city.
const seen = new Set([0]), stack = [0];
while (stack.length) { const i = stack.pop(); for (const e of plan.edges) for (const [u, v] of [[e.a, e.b], [e.b, e.a]]) if (u === i && !seen.has(v)) { seen.add(v); stack.push(v); } }
assert.equal(seen.size, plan.districts.length, "highway network is connected");
for (const e of plan.edges) { assert(e.len > 50); assert.equal(e.cum.length, e.pts.length); }
const again = planWorld(places.filter(p => visitedIds.includes(p.id)), { visited: Object.fromEntries(visitedIds.map(i => [i, true])), currentId: visitedIds[0], coords });
assert.deepEqual(again.districts.map(d => [d.x, d.z]), plan.districts.map(d => [d.x, d.z]), "layout is deterministic");
const china = planWorld(places, { visited: {}, currentId: null, scope: "China", coords });
assert.equal(china.districts.length, places.filter(p => p.country === "China").length, "a country's world has every stop in that country");
const sg = planWorld(places, { visited: {}, currentId: null, scope: "Singapore", coords });
assert.equal(sg.districts.length, 1); assert.equal(sg.edges.length, 0);
const all = planWorld(places, { visited: {}, currentId: null, scope: "all", coords });
assert.equal(all.districts.length, places.length);
console.log("Open world layout, spacing, geography and highway network passed.");
