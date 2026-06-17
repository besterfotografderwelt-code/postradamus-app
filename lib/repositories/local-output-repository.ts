import type { OutputRepository } from "@/lib/repositories/output-repository";
import type { ProjectOutput, ProjectOutputType } from "@/lib/types";

const STORAGE_KEY = "weddingflow.project-outputs.v1";

function readOutputs(): ProjectOutput[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOutputs(outputs: ProjectOutput[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(outputs));
}

export class LocalOutputRepository implements OutputRepository {
  async list(projectId: string) {
    return readOutputs()
      .filter((output) => output.projectId === projectId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async create(
    projectId: string,
    type: ProjectOutputType,
    content: string,
    generator: ProjectOutput["generator"]
  ) {
    const now = new Date().toISOString();
    const output: ProjectOutput = {
      id: `output-${crypto.randomUUID()}`,
      projectId,
      type,
      content,
      generator,
      createdAt: now,
      updatedAt: now
    };
    writeOutputs([output, ...readOutputs()]);
    return output;
  }

  async update(projectId: string, outputId: string, content: string) {
    const outputs = readOutputs();
    const index = outputs.findIndex(
      (output) => output.id === outputId && output.projectId === projectId
    );
    if (index < 0) throw new Error("Ausgabe wurde nicht gefunden.");

    const updated = {
      ...outputs[index],
      content,
      updatedAt: new Date().toISOString()
    };
    outputs[index] = updated;
    writeOutputs(outputs);
    return updated;
  }

  async deleteAll(projectId: string) {
    writeOutputs(readOutputs().filter((output) => output.projectId !== projectId));
  }
}
