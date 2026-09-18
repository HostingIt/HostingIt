import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONTAINER_PORT,
  dockerfileRepoPath,
  parseDockerfileExpose,
  parseDockerfilePort,
  parseEnvPort,
  parsePortNumber,
  resolveContainerPort,
  STATIC_CONTAINER_PORT,
} from "./container-port.ts";

describe("parsePortNumber", () => {
  it("accepts 1-65535", () => {
    assert.equal(parsePortNumber("3400"), 3400);
    assert.equal(parsePortNumber(80), 80);
    assert.equal(parsePortNumber("0"), null);
    assert.equal(parsePortNumber("70000"), null);
    assert.equal(parsePortNumber("abc"), null);
  });
});

describe("parseDockerfileExpose", () => {
  it("reads the last TCP EXPOSE", () => {
    const text = `
FROM node:20
EXPOSE 8080
EXPOSE 3400/tcp
EXPOSE 9999/udp
`;
    assert.equal(parseDockerfileExpose(text), 3400);
  });

  it("parses space-separated EXPOSE lists", () => {
    assert.equal(parseDockerfileExpose("EXPOSE 80 443"), 443);
  });
});

describe("parseDockerfilePort", () => {
  it("prefers ENV PORT over EXPOSE", () => {
    const text = `
ENV PORT=3400
EXPOSE 3000
`;
    assert.equal(parseDockerfilePort(text), 3400);
  });
});

describe("resolveContainerPort", () => {
  it("uses 80 for static sites", () => {
    assert.equal(
      resolveContainerPort({ buildType: "static", dockerfileText: "EXPOSE 3000" }),
      STATIC_CONTAINER_PORT
    );
  });

  it("prefers runtime PORT env, then Dockerfile, then 3000", () => {
    assert.equal(
      resolveContainerPort({
        env: [{ key: "PORT", value: "3400" }],
        dockerfileText: "EXPOSE 8080",
      }),
      3400
    );
    assert.equal(
      resolveContainerPort({ dockerfileText: "EXPOSE 8080" }),
      8080
    );
    assert.equal(resolveContainerPort({}), DEFAULT_CONTAINER_PORT);
  });
});

describe("dockerfileRepoPath", () => {
  it("joins build path and dockerfile", () => {
    assert.equal(
      dockerfileRepoPath({ buildPath: "/", dockerfile: "Dockerfile" }),
      "Dockerfile"
    );
    assert.equal(
      dockerfileRepoPath({
        buildPath: "/apps/api",
        dockerContextPath: ".",
        dockerfile: "Dockerfile",
      }),
      "apps/api/Dockerfile"
    );
    assert.equal(
      dockerfileRepoPath({
        buildPath: "/",
        dockerContextPath: "docker",
        dockerfile: "Dockerfile.prod",
      }),
      "docker/Dockerfile.prod"
    );
  });
});

describe("parseEnvPort", () => {
  it("is case-insensitive on the key", () => {
    assert.equal(parseEnvPort([{ key: "port", value: "3400" }]), 3400);
  });
});
