import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateLimitStatus,
  expectedLimits,
  formatCpu,
  formatMemory,
  formatSpec,
  parseConfiguredLimits,
  parseRuntimeLimits,
  toDokployLimits,
} from "./resource-limits.ts";

const FREE = { ramMb: 512, cpuLimit: 1 };

describe("toDokployLimits", () => {
  it("converts MB to bytes and vCPU to nanoCPUs", () => {
    assert.deepEqual(toDokployLimits(FREE), {
      memoryLimit: "536870912",
      memoryReservation: "",
      cpuLimit: "1000000000",
      cpuReservation: "",
    });
  });

  it("handles fractional CPUs", () => {
    assert.equal(toDokployLimits({ ramMb: 256, cpuLimit: 0.25 }).cpuLimit, "250000000");
  });

  it("leaves zero limits uncapped", () => {
    assert.deepEqual(toDokployLimits({ ramMb: 0, cpuLimit: 0 }), {
      memoryLimit: "",
      memoryReservation: "",
      cpuLimit: "",
      cpuReservation: "",
    });
  });
});

describe("parseConfiguredLimits", () => {
  it("reads Dokploy string fields", () => {
    assert.deepEqual(
      parseConfiguredLimits({ memoryLimit: "536870912", cpuLimit: "1000000000" }),
      { memoryBytes: 536870912, nanoCpus: 1000000000 }
    );
  });

  it("treats empty and null as no cap", () => {
    assert.deepEqual(parseConfiguredLimits({ memoryLimit: "", cpuLimit: null }), {
      memoryBytes: null,
      nanoCpus: null,
    });
  });
});

describe("parseRuntimeLimits", () => {
  it("reads a Swarm task inspect", () => {
    const task = {
      ID: "abc",
      Spec: {
        Resources: {
          Limits: { MemoryBytes: 536870912, NanoCPUs: 1000000000 },
          Reservations: {},
        },
      },
    };
    assert.deepEqual(parseRuntimeLimits(task), {
      memoryBytes: 536870912,
      nanoCpus: 1000000000,
    });
  });

  it("reads a container inspect (array form)", () => {
    const container = [{ HostConfig: { Memory: 268435456, NanoCpus: 250000000 } }];
    assert.deepEqual(parseRuntimeLimits(container), {
      memoryBytes: 268435456,
      nanoCpus: 250000000,
    });
  });

  it("reports no cap when the task has no limits", () => {
    assert.deepEqual(parseRuntimeLimits({ Spec: { Resources: {} } }), {
      memoryBytes: null,
      nanoCpus: null,
    });
  });

  it("returns null for unknown payloads", () => {
    assert.equal(parseRuntimeLimits({ raw: "error" }), null);
    assert.equal(parseRuntimeLimits(null), null);
    assert.equal(parseRuntimeLimits("x"), null);
  });
});

describe("evaluateLimitStatus", () => {
  const expected = expectedLimits(FREE);
  const old = { memoryBytes: 268435456, nanoCpus: 250000000 };

  it("is unknown when Dokploy was unreachable", () => {
    assert.equal(
      evaluateLimitStatus({ expected, configured: null, runtime: null, isRunning: true }),
      "unknown"
    );
  });

  it("is not_applied when config differs from the plan", () => {
    assert.equal(
      evaluateLimitStatus({ expected, configured: old, runtime: old, isRunning: true }),
      "not_applied"
    );
  });

  it("is configured when the app is stopped", () => {
    assert.equal(
      evaluateLimitStatus({ expected, configured: expected, runtime: null, isRunning: false }),
      "configured"
    );
  });

  it("is configured when the runtime could not be inspected", () => {
    assert.equal(
      evaluateLimitStatus({ expected, configured: expected, runtime: null, isRunning: true }),
      "configured"
    );
  });

  it("is restart_required when the container predates the config", () => {
    assert.equal(
      evaluateLimitStatus({ expected, configured: expected, runtime: old, isRunning: true }),
      "restart_required"
    );
  });

  it("is enforced when the running container matches", () => {
    assert.equal(
      evaluateLimitStatus({
        expected,
        configured: expected,
        runtime: { ...expected },
        isRunning: true,
      }),
      "enforced"
    );
  });
});

describe("formatting", () => {
  it("formats CPU and memory", () => {
    assert.equal(formatCpu(1000000000), "1 vCPU");
    assert.equal(formatCpu(250000000), "0.25 vCPU");
    assert.equal(formatCpu(null), "No cap");
    assert.equal(formatMemory(536870912), "512 MB");
    assert.equal(formatMemory(1073741824), "1 GB");
    assert.equal(formatMemory(null), "No cap");
    assert.equal(formatSpec(FREE), "1 vCPU · 512 MB RAM");
  });
});
