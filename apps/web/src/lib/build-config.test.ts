import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findUnsafeBuildField,
  isSafeBuildStage,
  isSafeRepoPath,
  isValidGitBranch,
  isValidGithubOwner,
  isValidGithubRepo,
} from "@hostingit/dokploy-client/validation";

describe("build path validation", () => {
  it("accepts ordinary repo-relative paths", () => {
    for (const value of [
      "/",
      ".",
      "apps/web",
      "/apps/web",
      "Dockerfile",
      "docker/Dockerfile.prod",
      "./Dockerfile",
      "dist",
    ]) {
      assert.ok(isSafeRepoPath(value), value);
    }
  });

  it("rejects parent-directory segments", () => {
    for (const value of ["..", "../x", "a/../b", "a/..", "/../../etc"]) {
      assert.ok(!isSafeRepoPath(value), value);
    }
  });

  it("rejects shell metacharacters, whitespace and empty values", () => {
    for (const value of ["", "a b", "a;b", "a$b", "a`b", "a|b", "a&b", "a\nb", "a'b", 'a"b']) {
      assert.ok(!isSafeRepoPath(value), JSON.stringify(value));
    }
  });

  it("caps the length", () => {
    assert.ok(isSafeRepoPath("a".repeat(256)));
    assert.ok(!isSafeRepoPath("a".repeat(257)));
  });
});

describe("build stage validation", () => {
  it("accepts Docker stage names", () => {
    for (const value of ["runner", "build-stage", "prod_1", "v1.2"]) {
      assert.ok(isSafeBuildStage(value), value);
    }
  });

  it("rejects anything that is not a single plain token", () => {
    for (const value of ["", "-x", "a b", "a;b", "a$b", ".hidden"]) {
      assert.ok(!isSafeBuildStage(value), JSON.stringify(value));
    }
  });
});

describe("git branch validation", () => {
  it("accepts normal branch names", () => {
    for (const value of ["main", "feature/login", "release-1.2", "fix_bug", "v2+hotfix"]) {
      assert.ok(isValidGitBranch(value), value);
    }
  });

  it("rejects option-like, traversal and malformed names", () => {
    for (const value of ["", "-x", "/main", "main/", "a..b", "a//b", "a/.b", "x.lock", "a b", "a;b"]) {
      assert.ok(!isValidGitBranch(value), JSON.stringify(value));
    }
  });
});

describe("GitHub coordinates", () => {
  it("validates owners and repos", () => {
    assert.ok(isValidGithubOwner("octo-org"));
    assert.ok(!isValidGithubOwner("-octo"));
    assert.ok(!isValidGithubOwner("octo/org"));
    assert.ok(isValidGithubRepo("my.repo_name-1"));
    assert.ok(!isValidGithubRepo(".."));
    assert.ok(!isValidGithubRepo("a/b"));
  });
});

describe("findUnsafeBuildField", () => {
  it("returns null for a safe stored config", () => {
    assert.equal(
      findUnsafeBuildField({
        buildPath: "/",
        customGitBuildPath: "/apps/web",
        dockerfile: "Dockerfile",
        dockerContextPath: ".",
        dockerBuildStage: "runner",
        publishDirectory: null,
      }),
      null
    );
  });

  it("names the first unsafe field", () => {
    assert.equal(findUnsafeBuildField({ dockerContextPath: "../.." }), "dockerContextPath");
    assert.equal(findUnsafeBuildField({ dockerBuildStage: "a b" }), "dockerBuildStage");
    assert.equal(findUnsafeBuildField({ publishDirectory: "a;b" }), "publishDirectory");
  });
});
