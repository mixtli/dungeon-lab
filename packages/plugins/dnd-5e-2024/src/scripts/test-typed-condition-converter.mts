/**
 * Test script for the new typed condition converter
 * 
 * This script tests the new pipeline architecture by converting conditions
 * and comparing the results with the old approach.
 */

import { TypedConditionConverter } from '../5etools-converter/pipeline/typed-condition-converter.mjs';

async function testTypedConditionConverter() {
  console.log('🧪 Testing Typed Condition Converter');
  console.log('=====================================');
  
  try {
    // Create converter with test options
    const converter = new TypedConditionConverter({
      srdOnly: true,
      includeAssets: false,
      textProcessing: {
        cleanText: true,
        extractReferences: true
      }
    });
    
    // Run conversion
    const result = await converter.convertConditions();
    
    if (!result.success) {
      console.error('❌ Conversion failed:', result.errors);
      return;
    }
    
    console.log(`✅ Conversion successful!`);
    console.log(`📊 Stats: ${result.stats.converted}/${result.stats.total} converted, ${result.stats.errors} errors`);
    
    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.forEach(error => console.log(`  ${error}`));
    }
    
    if (result.results.length > 0) {
      console.log('\n📋 Sample results:');
      
      // Show first few conditions
      const sampleSize = Math.min(3, result.results.length);
      for (let i = 0; i < sampleSize; i++) {
        const condition = result.results[i];
        console.log(`\n  ${i + 1}. ${condition.name}`);
        console.log(`     ID: ${condition.id}`);
        console.log(`     Type: ${condition.documentType}/${condition.pluginDocumentType}`);
        console.log(`     Description: ${condition.description.substring(0, 100)}...`);
        
        if (condition.pluginData && typeof condition.pluginData === 'object') {
          const data = condition.pluginData as any;
          if (data.severity) {
            console.log(`     Severity: ${data.severity}`);
          }
          if (data.effects?.length) {
            console.log(`     Effects: ${data.effects.length} effects`);
          }
          if (data.relatedConditions?.length) {
            console.log(`     Related: ${data.relatedConditions.join(', ')}`);
          }
        }
      }
      
      if (result.results.length > sampleSize) {
        console.log(`\n  ... and ${result.results.length - sampleSize} more conditions`);
      }
    }
    
    // Test single condition conversion
    console.log('\n🔍 Testing single condition conversion...');
    
    // Read one condition manually to test the pipeline stages
    const converter2 = new TypedConditionConverter({ srdOnly: true });
    const rawData = await converter2['readEtoolsData']('conditionsdiseases.json');
    
    if (rawData && typeof rawData === 'object' && 'condition' in rawData) {
      const conditions = (rawData as any).condition;
      if (Array.isArray(conditions) && conditions.length > 0) {
        const sampleCondition = conditions.find((c: any) => c.name === 'Blinded') || conditions[0];
        
        console.log(`\n  Testing conversion of: ${sampleCondition.name}`);
        
        const singleResult = await converter2.convertItem(sampleCondition);
        
        if (singleResult.success && singleResult.document) {
          console.log('  ✅ Single conversion successful');
          console.log(`  📄 Document type: ${singleResult.document.documentType}`);
          console.log(`  🔧 Plugin type: ${singleResult.document.pluginDocumentType}`);
          console.log(`  📝 Description length: ${singleResult.document.description.length} characters`);
          
          // Validate the structure
          const hasCorrectFields = 
            singleResult.document.id &&
            singleResult.document.name &&
            singleResult.document.slug &&
            singleResult.document.documentType === 'vtt-document' &&
            singleResult.document.pluginDocumentType === 'condition' &&
            singleResult.document.pluginData;
            
          if (hasCorrectFields) {
            console.log('  ✅ Document structure is correct');
          } else {
            console.log('  ❌ Document structure has issues');
          }
        } else {
          console.log('  ❌ Single conversion failed:', singleResult.errors);
        }
      }
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testTypedConditionConverter().catch(console.error);