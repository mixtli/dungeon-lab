import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DocumentModel } from '../document.model.mjs';
import { AssetModel } from '../../../assets/models/asset.model.mjs';

describe('Mongoose toJSON Virtuals Behavior', () => {
  let mongoServer: MongoMemoryServer;
  let testCampaignId: Types.ObjectId;
  let testUserId: Types.ObjectId;

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

  describe('toJSON Virtuals Parameter Behavior', () => {
    it('should test different toJSON virtuals parameter behaviors', async () => {
      console.log('🧪 Testing Mongoose toJSON virtuals parameter behavior...');

      // Create test asset
      const asset = await AssetModel.createAssetWithPath({
        name: 'test-avatar.png',
        size: 1024,
        url: '/assets/test-avatar.png',
        type: 'image/png',
        metadata: { type: 'avatar' },
        createdBy: testUserId
      }, 'test-avatar.png');

      console.log('✅ Created test asset:', asset.id);

      // Create test character with asset reference
      const character = await DocumentModel.create({
        name: 'Test Character',
        slug: 'test-character',
        documentType: 'character',
        pluginId: 'dnd-5e-2024',
        pluginDocumentType: 'character',
        campaignId: testCampaignId,
        avatarId: asset._id,
        pluginData: {},
        createdBy: testUserId,
        updatedBy: testUserId
      });

      console.log('✅ Created test character:', character.id);

      // TEST 1: No populate, no virtuals (baseline)
      console.log('\n🔬 TEST 1: No populate, no virtuals');
      const unpopulatedDoc = await DocumentModel.findById(character._id);
      const unpopulatedJson = unpopulatedDoc!.toJSON();
      console.log('Result:', {
        hasAvatarField: 'avatar' in unpopulatedJson,
        avatarValue: unpopulatedJson.avatar
      });

      // TEST 2: Populate but no virtuals parameter
      console.log('\n🔬 TEST 2: Populate but NO virtuals parameter');
      const populatedDoc = await DocumentModel.findById(character._id).populate('avatar');
      const populatedNoVirtuals = populatedDoc!.toJSON();
      console.log('Result:', {
        hasAvatarField: 'avatar' in populatedNoVirtuals,
        avatarValue: populatedNoVirtuals.avatar
      });

      // TEST 3: Populate + toJSON({ virtuals: true })
      console.log('\n🔬 TEST 3: Populate + toJSON({ virtuals: true })');
      const populatedDoc2 = await DocumentModel.findById(character._id).populate('avatar');
      const populatedWithVirtualsTrue = populatedDoc2!.toJSON({ virtuals: true });
      console.log('Result:', {
        hasAvatarField: 'avatar' in populatedWithVirtualsTrue,
        avatarValue: populatedWithVirtualsTrue.avatar ? 'POPULATED' : undefined
      });

      // TEST 4: Populate + toJSON({ virtuals: false })
      console.log('\n🔬 TEST 4: Populate + toJSON({ virtuals: false })');
      const populatedDoc3 = await DocumentModel.findById(character._id).populate('avatar');
      const populatedWithVirtualsFalse = populatedDoc3!.toJSON({ virtuals: false });
      console.log('Result:', {
        hasAvatarField: 'avatar' in populatedWithVirtualsFalse,
        avatarValue: populatedWithVirtualsFalse.avatar
      });

      // TEST 5: Current invalid array syntax
      console.log('\n🔬 TEST 5: Current invalid array syntax - toJSON({ virtuals: [\"avatar\"] })');
      const populatedDoc4 = await DocumentModel.findById(character._id).populate('avatar');
      // @ts-ignore - Testing invalid syntax
      const populatedWithVirtualsArray = populatedDoc4!.toJSON({ virtuals: ['avatar'] });
      console.log('Result:', {
        hasAvatarField: 'avatar' in populatedWithVirtualsArray,
        avatarValue: populatedWithVirtualsArray.avatar ? 'POPULATED' : undefined
      });

      // TEST 6: Test multiple virtuals with populate
      console.log('\n🔬 TEST 6: Multiple populate + virtuals: true');
      const populatedDoc5 = await DocumentModel.findById(character._id).populate(['avatar', 'image', 'tokenImage']);
      const populatedMultipleVirtuals = populatedDoc5!.toJSON({ virtuals: true });
      console.log('Result:', {
        hasAvatarField: 'avatar' in populatedMultipleVirtuals,
        hasImageField: 'image' in populatedMultipleVirtuals,
        hasTokenImageField: 'tokenImage' in populatedMultipleVirtuals,
        avatarValue: populatedMultipleVirtuals.avatar ? 'POPULATED' : undefined,
        imageValue: populatedMultipleVirtuals.image ? 'POPULATED' : undefined,
        tokenImageValue: populatedMultipleVirtuals.tokenImage ? 'POPULATED' : undefined
      });

      // ASSERTIONS
      console.log('\n📊 ASSERTIONS:');

      // Test 1: No populate = no virtual fields
      expect('avatar' in unpopulatedJson).toBe(false);

      // Test 2: Populate but no virtuals param = virtual fields ARE included by default!
      expect('avatar' in populatedNoVirtuals).toBe(true);

      // Test 3: Populate + virtuals: true = virtual fields appear
      expect('avatar' in populatedWithVirtualsTrue).toBe(true);
      expect(populatedWithVirtualsTrue.avatar).toBeDefined();

      // Test 4: Populate + virtuals: false = no virtual fields
      expect('avatar' in populatedWithVirtualsFalse).toBe(false);

      // Test 5: Invalid array syntax - what actually happens?
      console.log('Array syntax result - hasAvatarField:', 'avatar' in populatedWithVirtualsArray);
      
      console.log('\n✅ All toJSON behavior tests completed!');
    });

    it('should verify the correct approach for game state service', async () => {
      console.log('\n🎯 Testing the CORRECT approach for game state service...');

      // Create test assets
      const avatar = await AssetModel.createAssetWithPath({
        name: 'avatar.png',
        size: 1024,
        url: '/assets/avatar.png',
        type: 'image/png',
        metadata: { type: 'avatar' },
        createdBy: testUserId
      }, 'avatar.png');

      const tokenImage = await AssetModel.createAssetWithPath({
        name: 'token.png',
        size: 2048,
        url: '/assets/token.png',
        type: 'image/png',
        metadata: { type: 'token' },
        createdBy: testUserId
      }, 'token.png');

      const image = await AssetModel.createAssetWithPath({
        name: 'image.png',
        size: 4096,
        url: '/assets/image.png',
        type: 'image/png',
        metadata: { type: 'image' },
        createdBy: testUserId
      }, 'image.png');

      // Create character with all asset references
      const character = await DocumentModel.create({
        name: 'Game State Character',
        slug: 'game-state-character',
        documentType: 'character',
        pluginId: 'dnd-5e-2024',
        pluginDocumentType: 'character',
        campaignId: testCampaignId,
        avatarId: avatar._id,
        tokenImageId: tokenImage._id,
        imageId: image._id,
        pluginData: {},
        createdBy: testUserId,
        updatedBy: testUserId
      });

      // CORRECT APPROACH: Populate all needed virtuals + use virtuals: true
      console.log('🎯 Using CORRECT approach:');
      console.log('1. Populate ALL needed virtual fields');
      console.log('2. Use toJSON({ virtuals: true })');

      const doc = await DocumentModel.findById(character._id)
        .populate(['avatar', 'tokenImage', 'image', 'thumbnail']);

      const correctJson = doc!.toJSON({ virtuals: true });

      console.log('📊 Result:', {
        hasAvatar: 'avatar' in correctJson,
        hasTokenImage: 'tokenImage' in correctJson,
        hasImage: 'image' in correctJson,
        hasThumbnail: 'thumbnail' in correctJson,
        avatarName: correctJson.avatar?.name,
        tokenImageName: correctJson.tokenImage?.name,
        imageName: correctJson.image?.name
      });

      // Assertions for correct approach
      expect(correctJson.avatar).toBeDefined();
      expect(correctJson.tokenImage).toBeDefined();
      expect(correctJson.image).toBeDefined();
      expect(correctJson.avatar.name).toBe('avatar.png');
      expect(correctJson.tokenImage.name).toBe('token.png');
      expect(correctJson.image.name).toBe('image.png');

      console.log('✅ Correct approach works perfectly!');
    });
  });
});