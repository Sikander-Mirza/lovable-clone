import { test } from "node:test";
import assert from "node:assert/strict";
import { listRoutes } from "../lib/routes";

test("listRoutes finds static pages and skips wildcards and params", () => {
  const app = `<Routes><Route path="/" element={<Home/>} /><Route path="about" element={<A/>}/><Route path="/blog/:id" element={<B/>}/><Route path="*" element={<N/>}/><Route path="/about" element={<A/>}/></Routes>`;
  assert.deepEqual(listRoutes(app), ["/", "/about"]);
  assert.deepEqual(listRoutes("export default function App(){return null}"), []);
});
