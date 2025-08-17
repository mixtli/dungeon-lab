import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DocumentModel } from '../document.model.mjs';
import { CharacterDocumentModel } from '../character-document.model.mjs';
import { ActorDocumentModel } from '../actor-document.model.mjs';
import { ItemDocumentModel } from '../item-document.model.mjs';
import { AssetModel } from '../../../assets/models/asset.model.mjs';
import type { IAsset, ICharacter, IActor, IItem, BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

describe('Document Virtual Fields', () => {
  let mongoServer: MongoMemoryServer;
  let testCampaignId: Types.ObjectId;
  let testUserId: Types.ObjectId;
  
  // Test assets
  let avatarAsset: IAsset;
  let tokenImageAsset: IAsset;
  let imageAsset: IAsset;
  let thumbnailAsset: IAsset;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    // Create test IDs
    testCampaignId = new Types.ObjectId();
    testUserId = new Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await mongoose.connection.dropDatabase();
  });

  describe('Asset Setup and Virtual Field Population', () => {
    it('should create test assets and populate virtual fields correctly', async () => {
      console.log('🔧 Creating test assets...');
      
      // Create test assets first
      avatarAsset = await AssetModel.createAssetWithPath({
        name: 'avatar.png',
        size: 1024,
        url: '/assets/avatar.png',
        type: 'image/png',
        metadata: { type: 'avatar' },
        createdBy: testUserId
      }, 'avatar.png');

      tokenImageAsset = await AssetModel.createAssetWithPath({
        name: 'token.png',
        size: 2048,
        url: '/assets/token.png',
        type: 'image/png',
        metadata: { type: 'token' },
        createdBy: testUserId
      }, 'token.png');

      imageAsset = await AssetModel.createAssetWithPath({
        name: 'image.png',
        size: 4096,
        url: '/assets/image.png',
        type: 'image/png',
        metadata: { type: 'image' },
        createdBy: testUserId
      }, 'image.png');

      thumbnailAsset = await AssetModel.createAssetWithPath({
        name: 'thumbnail.png',
        size: 512,
        url: '/assets/thumbnail.png',
        type: 'image/png',
        metadata: { type: 'thumbnail' },
        createdBy: testUserId
      }, 'thumbnail.png');

      console.log('✅ Test assets created:', {
        avatarId: avatarAsset.id,
        tokenImageId: tokenImageAsset.id,
        imageId: imageAsset.id,
        thumbnailId: thumbnailAsset.id
      });

      // Verify assets were created
      expect(avatarAsset.id).toBeDefined();
      expect(tokenImageAsset.id).toBeDefined();
      expect(imageAsset.id).toBeDefined();
      expect(thumbnailAsset.id).toBeDefined();
    });

    it('should create Character document with asset references and populate virtuals', async () => {
      // First create assets using the proper method
      avatarAsset = await AssetModel.createAssetWithPath({
        name: 'avatar.png',
        size: 1024,
        url: '/assets/avatar.png',
        type: 'image/png',
        metadata: { type: 'avatar' },
        createdBy: testUserId
      }, 'avatar.png');

      tokenImageAsset = await AssetModel.createAssetWithPath({
        name: 'token.png',
        size: 2048,
        url: '/assets/token.png',
        type: 'image/png',
        metadata: { type: 'token' },
        createdBy: testUserId
      }, 'token.png');

      imageAsset = await AssetModel.createAssetWithPath({
        name: 'image.png',
        size: 4096,
        url: '/assets/image.png',
        type: 'image/png',
        metadata: { type: 'image' },
        createdBy: testUserId
      }, 'image.png');

      console.log('🎭 Creating Character document...');

      // Create character with asset references
      const characterData = {
        name: 'Test Character',
        slug: 'test-character',
        documentType: 'character' as const,
        pluginId: 'dnd-5e-2024',
        pluginDocumentType: 'character',
        campaignId: testCampaignId,
        avatarId: avatarAsset._id,
        tokenImageId: tokenImageAsset._id,
        imageId: imageAsset._id,
        pluginData: { class: 'Fighter', level: 1 },
        createdBy: testUserId,
        updatedBy: testUserId
      };

      const character = await CharacterDocumentModel.create(characterData);
      console.log('✅ Character created with ID:', character.id);

      // Test: Fetch character without population
      const characterUnpopulated = await CharacterDocumentModel.findById(character._id);
      expect(characterUnpopulated).toBeDefined();
      console.log('📋 Character without population:');
      console.log('  avatarId:', characterUnpopulated!.avatarId);
      console.log('  tokenImageId:', characterUnpopulated!.tokenImageId);
      console.log('  imageId:', characterUnpopulated!.imageId);

      // Test: Fetch character WITH population (like game state service does)
      const characterPopulated = await CharacterDocumentModel
        .findById(character._id)
        .populate(['avatar', 'tokenImage', 'image'])
        .exec();

      expect(characterPopulated).toBeDefined();
      console.log('🔗 Character with population:');
      console.log('  avatar populated:', !!characterPopulated!.avatar);
      console.log('  tokenImage populated:', !!characterPopulated!.tokenImage);
      console.log('  image populated:', !!characterPopulated!.image);

      // Test: Convert to JSON with virtuals (like game state service does)
      const characterJson = characterPopulated!.toJSON({ virtuals: true });
      console.log('📄 Character toJSON result:');
      console.log('  Has avatar field:', 'avatar' in characterJson);
      console.log('  Has tokenImage field:', 'tokenImage' in characterJson);
      console.log('  Has image field:', 'image' in characterJson);
      console.log('  Avatar value:', characterJson.avatar);
      console.log('  TokenImage value:', characterJson.tokenImage);
      console.log('  Image value:', characterJson.image);

      // Assertions
      expect(characterJson.avatar).toBeDefined();
      expect(characterJson.tokenImage).toBeDefined();
      expect(characterJson.image).toBeDefined();
      expect(characterJson.avatar.name).toBe('avatar.png');
      expect(characterJson.tokenImage.name).toBe('token.png');
      expect(characterJson.image.name).toBe('image.png');
    });

    it('should create Actor document with asset references and populate virtuals', async () => {
      // Create assets using the proper method
      tokenImageAsset = await AssetModel.createAssetWithPath({
        name: 'actor-token.png',
        size: 2048,
        url: '/assets/actor-token.png',
        type: 'image/png',
        metadata: { type: 'token' },
        createdBy: testUserId
      }, 'actor-token.png');

      imageAsset = await AssetModel.createAssetWithPath({
        name: 'actor-image.png',
        size: 4096,
        url: '/assets/actor-image.png',
        type: 'image/png',
        metadata: { type: 'image' },
        createdBy: testUserId
      }, 'actor-image.png');

      console.log('🎭 Creating Actor document...');

      // Create actor with asset references
      const actorData = {
        name: 'Test Actor',
        slug: 'test-actor',
        documentType: 'actor' as const,
        pluginId: 'dnd-5e-2024',
        pluginDocumentType: 'npc',
        campaignId: testCampaignId,
        tokenImageId: tokenImageAsset._id,
        imageId: imageAsset._id,
        pluginData: { type: 'NPC', cr: 1 },
        createdBy: testUserId,
        updatedBy: testUserId
      };

      const actor = await ActorDocumentModel.create(actorData);
      console.log('✅ Actor created with ID:', actor.id);

      // Test: Fetch actor WITH population (like game state service does)
      const actorPopulated = await ActorDocumentModel
        .findById(actor._id)
        .populate(['tokenImage', 'image'])
        .exec();

      expect(actorPopulated).toBeDefined();
      console.log('🔗 Actor with population:');
      console.log('  tokenImage populated:', !!actorPopulated!.tokenImage);
      console.log('  image populated:', !!actorPopulated!.image);

      // Test: Convert to JSON with virtuals (like game state service does)
      const actorJson = actorPopulated!.toJSON({ virtuals: ['tokenImage', 'image'] });
      console.log('📄 Actor toJSON result:');
      console.log('  Has tokenImage field:', 'tokenImage' in actorJson);
      console.log('  Has image field:', 'image' in actorJson);
      console.log('  TokenImage value:', actorJson.tokenImage);
      console.log('  Image value:', actorJson.image);

      // Assertions
      expect(actorJson.tokenImage).toBeDefined();
      expect(actorJson.image).toBeDefined();
      expect(actorJson.tokenImage.name).toBe('actor-token.png');
      expect(actorJson.image.name).toBe('actor-image.png');
    });

    it('should create Item document with asset references and populate virtuals', async () => {
      // Create assets using the proper method
      imageAsset = await AssetModel.createAssetWithPath({
        name: 'item-image.png',
        size: 4096,
        url: '/assets/item-image.png',
        type: 'image/png',
        metadata: { type: 'image' },
        createdBy: testUserId
      }, 'item-image.png');

      thumbnailAsset = await AssetModel.createAssetWithPath({
        name: 'item-thumbnail.png',
        size: 512,
        url: '/assets/item-thumbnail.png',
        type: 'image/png',
        metadata: { type: 'thumbnail' },
        createdBy: testUserId
      }, 'item-thumbnail.png');

      console.log('🎒 Creating Item document...');

      // Create item with asset references
      const itemData = {
        name: 'Test Item',
        slug: 'test-item',
        documentType: 'item' as const,
        pluginId: 'dnd-5e-2024',
        pluginDocumentType: 'weapon',
        campaignId: testCampaignId,
        imageId: imageAsset._id,
        thumbnailId: thumbnailAsset._id,
        pluginData: { type: 'weapon', damage: '1d8' },
        createdBy: testUserId,
        updatedBy: testUserId
      };

      const item = await ItemDocumentModel.create(itemData);
      console.log('✅ Item created with ID:', item.id);

      // Test: Fetch item WITH population
      const itemPopulated = await ItemDocumentModel
        .findById(item._id)
        .populate(['image', 'thumbnail'])
        .exec();

      expect(itemPopulated).toBeDefined();
      console.log('🔗 Item with population:');
      console.log('  image populated:', !!itemPopulated!.image);
      console.log('  thumbnail populated:', !!itemPopulated!.thumbnail);

      // Test: Convert to JSON with virtuals
      const itemJson = itemPopulated!.toJSON({ virtuals: true });
      console.log('📄 Item toJSON result:');
      console.log('  Has image field:', 'image' in itemJson);
      console.log('  Has thumbnail field:', 'thumbnail' in itemJson);
      console.log('  Image value:', itemJson.image);
      console.log('  Thumbnail value:', itemJson.thumbnail);

      // Assertions
      expect(itemJson.image).toBeDefined();
      expect(itemJson.thumbnail).toBeDefined();
      expect(itemJson.image.name).toBe('item-image.png');
      expect(itemJson.thumbnail.name).toBe('item-thumbnail.png');
    });
  });

  describe('Game State Service Flow Recreation', () => {
    it('should replicate the exact loadCampaignData flow and verify virtual fields', async () => {
      console.log('🎮 Testing Game State Service flow...');

      // Create all assets first using the proper method
      const avatar = await AssetModel.createAssetWithPath({
        name: 'flow-avatar.png',
        size: 1024,
        url: '/assets/flow-avatar.png',
        type: 'image/png',
        metadata: { type: 'avatar' },
        createdBy: testUserId
      }, 'flow-avatar.png');

      const tokenImage = await AssetModel.createAssetWithPath({
        name: 'flow-token.png',
        size: 2048,
        url: '/assets/flow-token.png',
        type: 'image/png',
        metadata: { type: 'token' },
        createdBy: testUserId
      }, 'flow-token.png');

      const image = await AssetModel.createAssetWithPath({
        name: 'flow-image.png',
        size: 4096,
        url: '/assets/flow-image.png',
        type: 'image/png',
        metadata: { type: 'image' },
        createdBy: testUserId
      }, 'flow-image.png');

      const thumbnail = await AssetModel.createAssetWithPath({
        name: 'flow-thumbnail.png',
        size: 512,
        url: '/assets/flow-thumbnail.png',
        type: 'image/png',
        metadata: { type: 'thumbnail' },
        createdBy: testUserId
      }, 'flow-thumbnail.png');

      console.log('✅ Flow assets created');

      // Create test documents with asset references
      const [character, actor, item] = await Promise.all([
        // Character with avatar and token
        DocumentModel.create({
          name: 'Flow Character',
          slug: 'flow-character',
          documentType: 'character',
          pluginId: 'dnd-5e-2024',
          pluginDocumentType: 'character',
          campaignId: testCampaignId,
          avatarId: avatar._id,
          tokenImageId: tokenImage._id,
          imageId: image._id,
          pluginData: { class: 'Fighter' },
          createdBy: testUserId,
          updatedBy: testUserId
        }),
        // Actor with token
        DocumentModel.create({
          name: 'Flow Actor',
          slug: 'flow-actor',
          documentType: 'actor',
          pluginId: 'dnd-5e-2024',
          pluginDocumentType: 'npc',
          campaignId: testCampaignId,
          tokenImageId: tokenImage._id,
          imageId: image._id,
          pluginData: { type: 'NPC' },
          createdBy: testUserId,
          updatedBy: testUserId
        }),
        // Item with image and thumbnail
        DocumentModel.create({
          name: 'Flow Item',
          slug: 'flow-item',
          documentType: 'item',
          pluginId: 'dnd-5e-2024',
          pluginDocumentType: 'weapon',
          campaignId: testCampaignId,
          imageId: image._id,
          thumbnailId: thumbnail._id,
          pluginData: { type: 'weapon' },
          createdBy: testUserId,
          updatedBy: testUserId
        })
      ]);

      console.log('✅ Flow documents created');

      // TEST DESIRED BEHAVIOR: Complete virtual field population
      console.log('🔍 Testing complete virtual field population...');

      // 1. Characters query - populate ALL asset virtual fields
      const characters = await DocumentModel.find({ 
        campaignId: testCampaignId, 
        documentType: 'character' 
      }).populate(['avatar', 'tokenImage', 'image', 'thumbnail']).exec();

      // 2. Actors query - populate ALL asset virtual fields  
      const actors = await DocumentModel.find({ 
        campaignId: testCampaignId, 
        documentType: 'actor' 
      }).populate(['tokenImage', 'image', 'thumbnail']).exec();

      // 3. Items query - populate ALL asset virtual fields
      const items = await DocumentModel.find({ 
        campaignId: testCampaignId,
        documentType: 'item'
      }).populate(['image', 'thumbnail']).exec();

      console.log('📊 Query results:', {
        charactersFound: characters.length,
        actorsFound: actors.length,
        itemsFound: items.length
      });

      // REPLICATE EXACT toJSON PROCESSING
      console.log('🔄 Replicating exact toJSON processing...');

      // Characters processing (like line 679-701)
      const charactersPlain = characters.map(doc => {
        console.log('Processing character doc:', {
          name: doc.name,
          avatarId: doc.avatarId,
          tokenImageId: doc.tokenImageId,
          imageId: doc.imageId,
          hasAvatar: !!doc.avatar,
          hasTokenImage: !!doc.tokenImage,
          hasImage: !!doc.image
        });
        
        const obj = doc.toJSON({ virtuals: ['avatar', 'tokenImage', 'image', 'thumbnail'] });
        
        console.log('Character toJSON result:', {
          name: obj.name,
          hasAvatarField: 'avatar' in obj,
          hasTokenImageField: 'tokenImage' in obj,
          hasImageField: 'image' in obj,
          hasThumbnailField: 'thumbnail' in obj,
          avatarValue: obj.avatar,
          tokenImageValue: obj.tokenImage,
          imageValue: obj.image,
          thumbnailValue: obj.thumbnail
        });
        
        return obj;
      });

      // Actors processing (like line 702-732)
      const actorsPlain = actors.map(doc => {
        console.log('Processing actor doc:', {
          name: doc.name,
          tokenImageId: doc.tokenImageId,
          imageId: doc.imageId,
          hasTokenImage: !!doc.tokenImage,
          hasImage: !!doc.image
        });
        
        const obj = doc.toJSON({ virtuals: ['tokenImage', 'image', 'thumbnail'] });
        
        console.log('Actor toJSON result:', {
          name: obj.name,
          hasTokenImageField: 'tokenImage' in obj,
          hasImageField: 'image' in obj,
          hasThumbnailField: 'thumbnail' in obj,
          tokenImageValue: obj.tokenImage,
          imageValue: obj.image,
          thumbnailValue: obj.thumbnail
        });
        
        return obj;
      });

      // Items processing
      const itemsPlain = items.map(doc => {
        console.log('Processing item doc:', {
          name: doc.name,
          imageId: doc.imageId,
          thumbnailId: doc.thumbnailId
        });
        
        const obj = doc.toJSON({ virtuals: ['image', 'thumbnail'] });
        
        console.log('Item toJSON result:', {
          name: obj.name,
          hasImageField: 'image' in obj,
          hasThumbnailField: 'thumbnail' in obj,
          imageValue: obj.image,
          thumbnailValue: obj.thumbnail
        });
        
        return obj;
      });

      // COMBINE INTO UNIFIED DOCUMENTS (like line 821-836)
      const documents: Record<string, BaseDocument> = {};
      
      charactersPlain.forEach(character => {
        documents[character.id] = character as BaseDocument;
      });
      
      actorsPlain.forEach(actor => {
        documents[actor.id] = actor as BaseDocument;
      });
      
      itemsPlain.forEach(item => {
        documents[item.id] = item as BaseDocument;
      });

      console.log('📦 Final unified documents:', {
        totalDocuments: Object.keys(documents).length,
        documentIds: Object.keys(documents)
      });

      // VERIFY FINAL RESULTS
      const characterDoc = documents[character.id] as ICharacter;
      const actorDoc = documents[actor.id] as IActor;
      const itemDoc = documents[item.id] as IItem;

      console.log('🔍 Final document virtual fields:');
      console.log('Character:', {
        hasAvatar: 'avatar' in characterDoc,
        hasTokenImage: 'tokenImage' in characterDoc,
        hasImage: 'image' in characterDoc,
        hasThumbnail: 'thumbnail' in characterDoc
      });
      console.log('Actor:', {
        hasTokenImage: 'tokenImage' in actorDoc,
        hasImage: 'image' in actorDoc,
        hasThumbnail: 'thumbnail' in actorDoc
      });
      console.log('Item:', {
        hasImage: 'image' in itemDoc,
        hasThumbnail: 'thumbnail' in itemDoc
      });

      // ASSERTIONS - Test desired behavior: ALL virtual asset fields should be populated
      
      // Characters should have ALL asset virtual fields populated
      expect(characterDoc.avatar).toBeDefined();
      expect(characterDoc.tokenImage).toBeDefined(); 
      expect(characterDoc.image).toBeDefined();
      // Note: thumbnail may be undefined if character doesn't have one, which is ok
      
      // Actors should have ALL relevant asset virtual fields populated
      expect(actorDoc.tokenImage).toBeDefined();
      expect(actorDoc.image).toBeDefined();
      // Note: actors don't typically have avatar/thumbnail, which is ok
      
      // Items should have ALL relevant asset virtual fields populated
      expect(itemDoc.image).toBeDefined();
      expect(itemDoc.thumbnail).toBeDefined();

      // Verify populated asset data is complete and correct
      expect(characterDoc.avatar.name).toBe('flow-avatar.png');
      expect(characterDoc.tokenImage.name).toBe('flow-token.png');
      expect(characterDoc.image.name).toBe('flow-image.png');
      expect(actorDoc.tokenImage.name).toBe('flow-token.png');
      expect(actorDoc.image.name).toBe('flow-image.png');
      expect(itemDoc.image.name).toBe('flow-image.png');
      expect(itemDoc.thumbnail.name).toBe('flow-thumbnail.png');
    });
  });

  describe('Virtual Field Debugging', () => {
    it('should debug virtual field definitions and population mechanics', async () => {
      console.log('🔧 Debugging virtual field mechanics...');

      // Create a simple asset for testing
      const testAsset = await AssetModel.createAssetWithPath({
        name: 'debug-asset.png',
        size: 1024,
        url: '/assets/debug-asset.png',
        type: 'image/png',
        metadata: { type: 'debug' },
        createdBy: testUserId
      }, 'debug-asset.png');

      // Create a character document
      const character = await DocumentModel.create({
        name: 'Debug Character',
        slug: 'debug-character',
        documentType: 'character',
        pluginId: 'dnd-5e-2024',
        pluginDocumentType: 'character',
        campaignId: testCampaignId,
        avatarId: testAsset._id,
        pluginData: {},
        createdBy: testUserId,
        updatedBy: testUserId
      });

      console.log('📋 Created debug character:', character.id);

      // Test 1: Check virtual field definitions exist
      const schema = DocumentModel.schema;
      const virtuals = schema.virtuals;
      console.log('🔍 Available virtual fields on DocumentModel:', Object.keys(virtuals));

      // Test 2: Check if specific virtuals exist
      const avatarVirtual = schema.virtuals.avatar;
      console.log('👤 Avatar virtual definition:', {
        exists: !!avatarVirtual,
        ref: avatarVirtual?.options?.ref,
        localField: avatarVirtual?.options?.localField,
        foreignField: avatarVirtual?.options?.foreignField
      });

      // Test 3: Test population step by step
      console.log('🔄 Testing population step by step...');

      // Step 1: Raw document
      const rawDoc = await DocumentModel.findById(character._id);
      console.log('Step 1 - Raw document avatarId:', rawDoc?.avatarId);

      // Step 2: Populated document
      const populatedDoc = await DocumentModel.findById(character._id).populate('avatar');
      console.log('Step 2 - Populated document:', {
        avatarId: populatedDoc?.avatarId,
        hasAvatarVirtual: !!populatedDoc?.avatar,
        avatarValue: populatedDoc?.avatar
      });

      // Step 3: toJSON with virtuals
      const jsonResult = populatedDoc?.toJSON({ virtuals: true });
      console.log('Step 3 - toJSON result:', {
        hasAvatarField: jsonResult && 'avatar' in jsonResult,
        avatarValue: jsonResult?.avatar
      });

      // Test 4: Check discriminator model
      const characterModel = await CharacterDocumentModel.findById(character._id).populate('avatar');
      console.log('🎭 Character discriminator model:', {
        hasAvatarVirtual: !!characterModel?.avatar,
        avatarValue: characterModel?.avatar
      });

      const characterJson = characterModel?.toJSON({ virtuals: true });
      console.log('🎭 Character discriminator toJSON:', {
        hasAvatarField: characterJson && 'avatar' in characterJson,
        avatarValue: characterJson?.avatar
      });

      // Assertions to verify debugging results
      expect(populatedDoc?.avatar).toBeDefined();
      expect(jsonResult?.avatar).toBeDefined();
      expect(characterModel?.avatar).toBeDefined();
      expect(characterJson?.avatar).toBeDefined();
    });
  });
});