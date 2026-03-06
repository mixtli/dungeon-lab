// Export client classes
/** @deprecated Use DocumentsClient instead */
export { ActorsClient } from './actors.client.js';
/** @deprecated Use DocumentsClient for documents, CampaignsClient for campaign operations */
export { CharactersClient } from './characters.client.js';
export { PluginsClient } from './plugins.client.js';
/** @deprecated Use DocumentsClient instead */
export { ItemsClient } from './items.client.js';
export { AssetsClient } from './assets.client.js';
export { CampaignsClient } from './campaigns.client.js';
export { ChatbotsClient } from './chatbots.client.js';
export { CompendiumsClient } from './compendiums.client.js';
export { GameSessionsClient } from './game-sessions.client.js';
export { DocumentsClient } from './documents.client.js';
export { DocumentsSocketClient } from './documents-socket.client.js';
export { EncountersClient } from './encounters.client.js';
export { MapsClient } from './maps.client.js';
export { UsersClient } from './users.client.js';
export { InvitesClient } from './invites.client.js';
// Export ApiClient base class
export { ApiClient, configureApiClient } from './api.client.js';
