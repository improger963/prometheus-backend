import { VersioningType } from '@nestjs/common';

export const API_VERSION_CONFIG = {
  type: VersioningType.URI,
  prefix: 'v',
  defaultVersion: '1',
};

export const SUPPORTED_VERSIONS = ['1'] as const;
export type ApiVersion = typeof SUPPORTED_VERSIONS[number];

export const API_ROUTES = {
  v1: {
    auth: 'auth',
    projects: 'projects',
    agents: 'agents',
    tasks: 'tasks',
    orchestrator: 'orchestrator',
    knowledge: 'knowledge',
  },
} as const;