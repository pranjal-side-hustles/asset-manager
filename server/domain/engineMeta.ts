export const ENGINE_VERSIONS = {
  strategicGrowth: "1.0.0",
  tacticalSentinel: "1.0.0",
} as const;

export type EngineName = keyof typeof ENGINE_VERSIONS;

export interface EngineMetadata {
  engine: EngineName;
  version: string;
  evaluatedAt: Date;
}

export function createEngineMetadata(engine: EngineName): EngineMetadata {
  return {
    engine,
    version: ENGINE_VERSIONS[engine],
    evaluatedAt: new Date(),
  };
}

export function getEngineVersion(engine: EngineName): string {
  return ENGINE_VERSIONS[engine];
}

export function getAllEngineVersions(): Record<EngineName, string> {
  return { ...ENGINE_VERSIONS };
}
