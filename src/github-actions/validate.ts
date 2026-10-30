import type { Diagnostic } from "../core/index.js";
import type { Job, Workflow } from "./types.js";

const jobPath = (index: number): string => `$.jobs[${index}]`;

const idPath = (index: number): string => `${jobPath(index)}.id`;

const needsPath = (index: number, need?: number): string =>
  need === undefined ? `${jobPath(index)}.needs` : `${jobPath(index)}.needs[${need}]`;

const needsOf = (job: Job): readonly string[] => {
  if (job.needs === undefined) {
    return [];
  }

  return typeof job.needs === "string" ? [job.needs] : job.needs;
};

const duplicateIds = (jobs: readonly Job[]): readonly Diagnostic[] => {
  const positions = new Map<string, number[]>();

  for (const [index, job] of jobs.entries()) {
    const found = positions.get(job.id);

    if (found === undefined) {
      positions.set(job.id, [index]);
    } else {
      found.push(index);
    }
  }

  const diagnostics: Diagnostic[] = [];

  for (const [id, indexes] of positions) {
    if (indexes.length < 2) {
      continue;
    }

    const message = `duplicate job id "${id}": ${indexes.map((index) => idPath(index)).join(" and ")}`;

    for (const index of indexes) {
      diagnostics.push({ path: idPath(index), message });
    }
  }

  return diagnostics;
};

const danglingNeeds = (jobs: readonly Job[]): readonly Diagnostic[] => {
  const ids = new Set(jobs.map((job) => job.id));
  const diagnostics: Diagnostic[] = [];

  for (const [index, job] of jobs.entries()) {
    for (const [needIndex, need] of needsOf(job).entries()) {
      if (ids.has(need)) {
        continue;
      }

      diagnostics.push({
        path: needsPath(index, typeof job.needs === "string" ? undefined : needIndex),
        message: `job "${job.id}" needs "${need}", which does not exist`,
      });
    }
  }

  return diagnostics;
};

interface NeedsGraph {
  readonly firstIndex: ReadonlyMap<string, number>;
  readonly needsById: ReadonlyMap<string, readonly string[]>;
}

const needsGraph = (jobs: readonly Job[]): NeedsGraph => {
  const firstIndex = new Map<string, number>();
  const needsById = new Map<string, readonly string[]>();

  for (const [index, job] of jobs.entries()) {
    if (!firstIndex.has(job.id)) {
      firstIndex.set(job.id, index);
      needsById.set(job.id, needsOf(job));
    }
  }

  return { firstIndex, needsById };
};

const reportCycle = (
  jobs: readonly Job[],
  firstIndex: ReadonlyMap<string, number>,
  stack: readonly string[],
  seen: Set<string>,
  id: string,
  needIndex: number,
  need: string,
): Diagnostic | undefined => {
  const start = stack.indexOf(need);
  const members = [...stack.slice(start), need];
  const key = members.join(" -> ");

  if (seen.has(key)) {
    return undefined;
  }

  seen.add(key);

  const index = firstIndex.get(id);
  const job = index === undefined ? undefined : jobs[index];

  if (index === undefined || job === undefined) {
    return undefined;
  }

  return {
    path: needsPath(index, typeof job.needs === "string" ? undefined : needIndex),
    message: `needs cycle: ${key}`,
  };
};

/**
 * Walks the graph by id rather than by position, so a duplicate id cannot hide an edge. A cycle is
 * reported once, at the edge that closes it, with its members in traversal order.
 */
const cycles = (jobs: readonly Job[]): readonly Diagnostic[] => {
  const { firstIndex, needsById } = needsGraph(jobs);
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const seen = new Set<string>();
  const diagnostics: Diagnostic[] = [];

  const visit = (id: string): void => {
    state.set(id, "visiting");
    stack.push(id);

    for (const [needIndex, need] of (needsById.get(id) ?? []).entries()) {
      if (!firstIndex.has(need)) {
        continue;
      }

      if (state.get(need) === "visiting") {
        const diagnostic = reportCycle(jobs, firstIndex, stack, seen, id, needIndex, need);

        if (diagnostic !== undefined) {
          diagnostics.push(diagnostic);
        }
      } else if (state.get(need) === undefined) {
        visit(need);
      }
    }

    stack.pop();
    state.set(id, "done");
  };

  for (const id of firstIndex.keys()) {
    if (state.get(id) === undefined) {
      visit(id);
    }
  }

  return diagnostics;
};

const jobBodies = (jobs: readonly Job[]): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  for (const [index, job] of jobs.entries()) {
    if (job.steps !== undefined && job.uses !== undefined) {
      diagnostics.push({
        path: jobPath(index),
        message: `job "${job.id}" has both "steps" and "uses"`,
      });
    }

    for (const [stepIndex, step] of (job.steps ?? []).entries()) {
      if (step.run !== undefined && step.uses !== undefined) {
        diagnostics.push({
          path: `${jobPath(index)}.steps[${stepIndex}]`,
          message: 'a step has both "run" and "uses"',
        });
      }
    }
  }

  return diagnostics;
};

/** Whole-document checks. It only collects; `toDoc` is the one place that throws. */
export const validate = (workflow: Workflow): readonly Diagnostic[] => [
  ...duplicateIds(workflow.jobs),
  ...danglingNeeds(workflow.jobs),
  ...cycles(workflow.jobs),
  ...jobBodies(workflow.jobs),
];
