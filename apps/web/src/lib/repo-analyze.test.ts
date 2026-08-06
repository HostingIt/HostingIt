import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findDockerfileName,
  parseComposeBuildSpecs,
  parseComposeContexts,
  parseDockerfileStages,
  pickDockerBuildStage,
  scoreDirectory,
  selectDefaultTarget,
  rankTargets,
  type DeployTarget,
} from "./repo-analyze-core.ts";

describe("scoreDirectory", () => {
  it("detects a root Node app with package.json", () => {
    const target = scoreDirectory("/", new Set(["package.json", "src"]), {
      packageScripts: { start: true },
    });
    assert.ok(target);
    assert.equal(target.buildPath, "/");
    assert.equal(target.buildType, "nixpacks");
    assert.ok(target.confidence >= 40);
    assert.ok(target.signals.includes("package.json"));
  });

  it("prefers Dockerfile build type", () => {
    const target = scoreDirectory(
      "/backend",
      new Set(["Dockerfile", "requirements.txt"])
    );
    assert.ok(target);
    assert.equal(target.buildType, "dockerfile");
  });

  it("detects Next.js frontend", () => {
    const target = scoreDirectory(
      "/frontend",
      new Set(["package.json", "next.config.ts"]),
      { packageScripts: { dev: true } }
    );
    assert.ok(target);
    assert.equal(target.buildPath, "/frontend");
    assert.ok(
      target.label.includes("Next.js") || target.label.includes("Frontend")
    );
    assert.ok(target.confidence > 50);
  });

  it("detects static sites", () => {
    const target = scoreDirectory("/", new Set(["index.html", "style.css"]));
    assert.ok(target);
    assert.equal(target.buildType, "static");
  });

  it("returns null for empty/non-deployable dirs", () => {
    assert.equal(scoreDirectory("/docs", new Set(["README.md"])), null);
  });

  it("boosts frontend folder names", () => {
    const frontend = scoreDirectory("/frontend", new Set(["package.json"]), {
      packageScripts: { start: true },
    });
    const utils = scoreDirectory("/utils", new Set(["package.json"]), {
      packageScripts: { start: true },
    });
    assert.ok(frontend && utils);
    assert.ok(frontend.confidence > utils.confidence);
  });
});

describe("findDockerfileName", () => {
  it("prefers Dockerfile.prod over Dockerfile", () => {
    assert.equal(
      findDockerfileName(new Set(["Dockerfile", "Dockerfile.prod"])),
      "Dockerfile.prod"
    );
  });

  it("prefers Dockerfile over Containerfile", () => {
    assert.equal(
      findDockerfileName(new Set(["Containerfile", "Dockerfile"])),
      "Dockerfile"
    );
  });

  it("accepts dockerfile lowercase and Containerfile", () => {
    assert.equal(findDockerfileName(new Set(["dockerfile"])), "dockerfile");
    assert.equal(
      findDockerfileName(new Set(["Containerfile"])),
      "Containerfile"
    );
  });

  it("falls back to other Dockerfile.* variants", () => {
    assert.equal(
      findDockerfileName(new Set(["Dockerfile.dev", "README.md"])),
      "Dockerfile.dev"
    );
  });

  it("returns null when none present", () => {
    assert.equal(findDockerfileName(new Set(["package.json"])), null);
  });
});

describe("parseDockerfileStages / pickDockerBuildStage", () => {
  const multiStage = `
FROM node:20 AS deps
WORKDIR /app
COPY package.json .
RUN npm ci

FROM node:20 AS builder
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:20-alpine AS runner
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/server.js"]
`;

  it("extracts AS stage names in order", () => {
    assert.deepEqual(parseDockerfileStages(multiStage), [
      "deps",
      "builder",
      "runner",
    ]);
  });

  it("prefers runner over last non-production stage", () => {
    assert.equal(pickDockerBuildStage(["deps", "builder", "runner"]), "runner");
  });

  it("prefers production when present", () => {
    assert.equal(
      pickDockerBuildStage(["builder", "production", "debug"]),
      "production"
    );
  });

  it("falls back to last stage when no production-like name", () => {
    assert.equal(pickDockerBuildStage(["deps", "builder"]), "builder");
  });

  it("returns null for empty stages", () => {
    assert.equal(pickDockerBuildStage([]), null);
  });
});

describe("parseComposeContexts", () => {
  it("extracts build context paths", () => {
    const yaml = `
services:
  web:
    build:
      context: ./frontend
  api:
    build: ./backend
  db:
    image: postgres:16
volumes:
  data:
`;
    const contexts = parseComposeContexts(yaml);
    assert.deepEqual(contexts.sort(), ["/backend", "/frontend"]);
  });

  it("ignores root context and images", () => {
    const yaml = `
services:
  app:
    build:
      context: .
  db:
    image: redis
`;
    assert.deepEqual(parseComposeContexts(yaml), []);
  });
});

describe("parseComposeBuildSpecs", () => {
  it("returns dockerfile and target for a service", () => {
    const yaml = `
services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
      target: production
  web:
    build:
      context: ./frontend
`;
    const specs = parseComposeBuildSpecs(yaml);
    const api = specs.find((s) => s.context === "/backend");
    assert.ok(api);
    assert.equal(api.dockerfile, "Dockerfile.prod");
    assert.equal(api.target, "production");
    const web = specs.find((s) => s.context === "/frontend");
    assert.ok(web);
    assert.equal(web.dockerfile, undefined);
  });
});

describe("scoreDirectory dockerfile fields", () => {
  it("attaches nested dockerfile path and stage from options", () => {
    const target = scoreDirectory("/app", new Set(["package.json"]), {
      dockerfile: "docker/Dockerfile",
      dockerContextPath: ".",
      dockerBuildStage: "runner",
      dockerfileStages: ["deps", "runner"],
      packageScripts: { start: true },
    });
    assert.ok(target);
    assert.equal(target.buildType, "dockerfile");
    assert.equal(target.dockerfile, "docker/Dockerfile");
    assert.equal(target.dockerBuildStage, "runner");
    assert.ok(target.signals.includes("stage:runner"));
  });
});

describe("selectDefaultTarget / rankTargets", () => {
  const targets: DeployTarget[] = [
    {
      id: "backend",
      label: "Backend (Python)",
      buildPath: "/backend",
      buildType: "nixpacks",
      confidence: 40,
      signals: ["Python"],
    },
    {
      id: "frontend",
      label: "Frontend (Next.js)",
      buildPath: "/frontend",
      buildType: "nixpacks",
      confidence: 70,
      signals: ["package.json", "next.config"],
    },
  ];

  it("ranks by confidence", () => {
    const ranked = rankTargets(targets);
    assert.equal(ranked[0].id, "frontend");
  });

  it("selects highest confidence as default", () => {
    assert.equal(selectDefaultTarget(targets), "frontend");
  });

  it("returns null for empty list", () => {
    assert.equal(selectDefaultTarget([]), null);
  });
});
