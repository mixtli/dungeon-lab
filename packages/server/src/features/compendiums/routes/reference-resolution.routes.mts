import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { compendiumReferenceResolutionService } from '../services/compendium-reference-resolution.service.mjs';
import { CompendiumModel } from '../models/compendium.model.mjs';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * POST /api/compendiums/:id/resolve-references
 * Manually trigger reference resolution for a compendium
 */
router.post('/:id/resolve-references', async (req, res) => {
  const { id } = req.params;
  
  // Validate compendium exists and user has access
  const compendium = await CompendiumModel.findById(id);
  if (!compendium) {
    return res.status(404).json({ error: 'Compendium not found' });
  }
  
  // Check if user owns this compendium or has admin access
  if (compendium.createdBy?.toString() !== req.session.user!.id && !req.session.user!.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const result = await compendiumReferenceResolutionService.resolveCompendiumReferences(id);
    
    res.json({
      success: true,
      result: {
        resolved: result.resolved,
        failed: result.failed,
        ambiguous: result.ambiguous,
        errors: result.errors.map(error => ({
          documentId: error.documentId.toString(),
          fieldPath: error.fieldPath,
          reference: error.reference,
          reason: error.reason,
          candidates: error.candidates
        }))
      }
    });
  } catch (error) {
    console.error('Reference resolution failed:', error);
    res.status(500).json({ 
      error: 'Reference resolution failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/compendiums/:id/reference-stats
 * Get statistics about unresolved references in a compendium
 */
router.get('/:id/reference-stats', async (req, res) => {
  const { id } = req.params;
  
  // Validate compendium exists and user has access
  const compendium = await CompendiumModel.findById(id);
  if (!compendium) {
    return res.status(404).json({ error: 'Compendium not found' });
  }
  
  // Check if user owns this compendium or has admin access
  if (compendium.createdBy?.toString() !== req.session.user!.id && !req.session.user!.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const stats = await compendiumReferenceResolutionService.getUnresolvedReferenceStats(id);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Failed to get reference stats:', error);
    res.status(500).json({ 
      error: 'Failed to get reference statistics',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/compendiums/:compendiumId/entries/:entryId/resolve-references
 * Manually trigger reference resolution for a single entry
 */
router.post('/:compendiumId/entries/:entryId/resolve-references', async (req, res) => {
  const { compendiumId, entryId } = req.params;
  
  // Validate compendium exists and user has access
  const compendium = await CompendiumModel.findById(compendiumId);
  if (!compendium) {
    return res.status(404).json({ error: 'Compendium not found' });
  }
  
  // Check if user owns this compendium or has admin access
  if (compendium.createdBy?.toString() !== req.session.user!.id && !req.session.user!.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const result = await compendiumReferenceResolutionService.resolveEntryReferences(entryId, compendiumId);
    
    res.json({
      success: true,
      result: {
        resolved: result.resolved,
        failed: result.failed,
        errors: result.errors.map(error => ({
          documentId: error.documentId.toString(),
          fieldPath: error.fieldPath,
          reference: error.reference,
          reason: error.reason,
          candidates: error.candidates
        }))
      }
    });
  } catch (error) {
    console.error('Entry reference resolution failed:', error);
    res.status(500).json({ 
      error: 'Entry reference resolution failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;