import { z } from "zod";
import {
  isSafeBuildStage,
  isSafeRepoPath,
  isValidGitBranch,
  isValidGithubOwner,
  isValidGithubRepo,
} from "@hostingit/dokploy-client/validation";

const PATH_MESSAGE =
  "Use letters, numbers, '.', '_', '-' and '/' only, with no '..' segments";

/** Repo-relative path such as `/`, `apps/web`, or `docker/Dockerfile.prod`. */
export const repoPathSchema = z
  .string()
  .trim()
  .max(256)
  .refine((value) => value === "" || isSafeRepoPath(value), PATH_MESSAGE);

export const buildStageSchema = z
  .string()
  .trim()
  .max(128)
  .refine(
    (value) => value === "" || isSafeBuildStage(value),
    "Build stage may only use letters, numbers, '.', '_' and '-'"
  );

export const githubOwnerSchema = z
  .string()
  .trim()
  .refine(isValidGithubOwner, "Invalid GitHub owner");

export const githubRepoSchema = z
  .string()
  .trim()
  .refine(isValidGithubRepo, "Invalid GitHub repository name");

export const gitBranchSchema = z
  .string()
  .trim()
  .refine(isValidGitBranch, "Invalid branch name");
