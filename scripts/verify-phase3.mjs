import { readFileSync } from "node:fs";

const files = [
  "src/server/api/routers/account.ts",
  "src/server/api/routers/classRouter.ts",
  "src/server/api/routers/enrollment.ts",
  "src/server/api/routers/transaction.ts",
  "src/server/api/routers/user.ts",
  "src/server/api/trpc.ts",
];

const contents = Object.fromEntries(files.map((file) => [file, readFileSync(file, "utf8")]));
const combined = Object.values(contents).join("\n");

const checks = [
  {
    name: "routers do not import or throw TRPCClientError",
    pass: !combined.includes("TRPCClientError"),
  },
  {
    name: "routers do not throw raw Error for normal API paths",
    pass: !combined.includes("throw new Error"),
  },
  {
    name: "all reviewed routers use TRPCError for explicit API failures",
    pass: files
      .filter((file) => file.includes("/routers/"))
      .every((file) => contents[file].includes("TRPCError")),
  },
  {
    name: "class router active-class lookups filter soft-deleted classes",
    pass:
      contents["src/server/api/routers/classRouter.ts"].includes("deletedAt: null") &&
      (contents["src/server/api/routers/classRouter.ts"].match(/deletedAt: null/g)?.length ?? 0) >= 4,
  },
  {
    name: "user class-scoped route filters soft-deleted classes",
    pass: contents["src/server/api/routers/user.ts"].includes("classCode: input.classCode,\n          deletedAt: null"),
  },
  {
    name: "enrollment class-scoped routes filter soft-deleted classes",
    pass: (contents["src/server/api/routers/enrollment.ts"].match(/deletedAt: null/g)?.length ?? 0) >= 5,
  },
  {
    name: "account and transaction class-scoped routes still filter soft-deleted classes",
    pass:
      (contents["src/server/api/routers/account.ts"].match(/deletedAt: null/g)?.length ?? 0) >= 3 &&
      contents["src/server/api/routers/transaction.ts"].includes("classCode: input.classCode,\n          deletedAt: null"),
  },
  {
    name: "explicit TRPCError code categories are present",
    pass: ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "BAD_REQUEST", "INTERNAL_SERVER_ERROR"].every((code) =>
      combined.includes(code),
    ),
  },
];

let failed = 0;
for (const check of checks) {
  if (check.pass) {
    console.log(`PASS ${check.name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${check.name}`);
  }
}

if (failed > 0) {
  console.error(`${failed} Phase 3 verification check(s) failed.`);
  process.exit(1);
}

console.log("All Phase 3 static verification checks passed.");
