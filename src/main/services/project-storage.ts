import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import type { ProjectFileV1 } from "../../shared/types";
import { ensureProjectShape, normalizeProjectFile } from "../../shared/utils/project";

export function projectsRootDir(): string {
  return path.join(app.getPath("documents"), "CursorfulDesktopMvp", "projects");
}

export function defaultProjectFilePath(projectId: string): string {
  return path.join(projectsRootDir(), `${projectId}.cursorful.json`);
}

export function resolveProjectFilePath(project: ProjectFileV1): string {
  return project.storagePath ?? defaultProjectFilePath(project.id);
}

export async function saveProject(project: ProjectFileV1): Promise<ProjectFileV1> {
  const normalized = ensureProjectShape({
    ...project,
    storagePath: resolveProjectFilePath(project),
    updatedAt: new Date().toISOString()
  });
  const filePath = resolveProjectFilePath(normalized);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

export async function loadProject(filePath: string): Promise<ProjectFileV1> {
  const raw = await fs.readFile(filePath, "utf8");
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    throw new Error(`Invalid project file ${filePath}: ${message}`);
  }
  const parsed = normalizeProjectFile(parsedJson);
  return ensureProjectShape({
    ...parsed,
    storagePath: filePath
  });
}
