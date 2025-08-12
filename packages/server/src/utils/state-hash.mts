// Re-export state hash utilities from shared package
export {
  generateStateHash,
  validateStateIntegrity,
  incrementStateVersion,
  isValidNextVersion
} from '@dungeon-lab/shared/utils/index.mjs';