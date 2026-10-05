import assert from "node:assert/strict";
import { test } from "node:test";

import { checkUseForm } from "./check-form-architecture.mjs";

function failuresFor(source) {
  const failures = [];
  checkUseForm("example.tsx", source, failures);
  return failures;
}

test("Payload form context does not require an RHF resolver", () => {
  assert.deepEqual(failuresFor(`
    import { useForm } from "@payloadcms/ui";
    const { submit } = useForm();
  `), []);
});

test("RHF forms still require a resolver", () => {
  assert.equal(failuresFor(`
    import { useForm } from "react-hook-form";
    const form = useForm<Values>();
  `).length, 1);
});

test("aliased RHF forms still require a resolver alongside Payload", () => {
  assert.equal(failuresFor(`
    import { useForm } from "@payloadcms/ui";
    import { useForm as useApplicationForm } from "react-hook-form";
    const payload = useForm();
    const form = useApplicationForm();
  `).length, 1);
});

test("RHF forms using a Zod resolver pass", () => {
  assert.deepEqual(failuresFor(`
    import { useForm } from "react-hook-form";
    const form = useForm({ resolver: zodResolver(schema) });
  `), []);
});
