// Export client classes
/** @deprecated Use DocumentsClient instead */
export { ActorsClient } from './actors.client.mjs';
/** @deprecated Use DocumentsClient for documents, CampaignsClient for campaign operations */
export { CharactersClient } from './characters.client.mjs';
export { PluginsClient } from './plugins.client.mjs';
/** @deprecated Use DocumentsClient instead */
export { ItemsClient } from './items.client.mjs';
export { AssetsClient } from './assets.client.mjs';
export { CampaignsClient } from './campaigns.client.mjs';
export { ChatbotsClient } from './chatbots.client.mjs';
export { CompendiumsClient } from './compendiums.client.mjs';
export { GameSessionsClient } from './game-sessions.client.mjs';
export { DocumentsClient } from './documents.client.mjs';
export { DocumentsSocketClient } from './documents-socket.client.mjs';
export { EncountersClient } from './encounters.client.mjs';
export { MapsClient } from './maps.client.mjs';
export { UsersClient } from './users.client.mjs';
export { InvitesClient } from './invites.client.mjs';
// Export ApiClient base class
export { ApiClient, configureApiClient } from './api.client.mjs';
