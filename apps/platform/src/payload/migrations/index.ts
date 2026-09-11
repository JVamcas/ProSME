import * as migration_20260911_180817_phase1_payload_foundation from './20260911_180817_phase1_payload_foundation';

export const migrations = [
  {
    up: migration_20260911_180817_phase1_payload_foundation.up,
    down: migration_20260911_180817_phase1_payload_foundation.down,
    name: '20260911_180817_phase1_payload_foundation'
  },
];
