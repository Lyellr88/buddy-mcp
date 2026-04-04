export {
  savePetConfig,
  loadPetConfig,
  loadPetConfigV2,
  savePetConfigV2,
  saveProfile,
  getProfiles,
  switchToProfile,
  deleteProfile,
} from './pet-config.ts';
// Note: saveProfile(profile) keys by profile.salt
// switchToProfile(salt) and deleteProfile(salt) take salt, not name
export {
  getClaudeUserId,
  getCompanionName,
  renameCompanion,
  getCompanionPersonality,
  setCompanionPersonality,
  deleteCompanion,
} from './claude-config.ts';
export {
  getClaudeSettings,
  saveClaudeSettings,
  isHookInstalled,
  installHook,
  removeHook,
} from './hooks.ts';
