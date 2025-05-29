import { z } from 'zod';

// ============================================================================
// WORKFLOW AND MAP SCHEMAS
// ============================================================================

export const mapGenerationResponseSchema = z.object({
  success: z.boolean(),
  flowRunId: z.string(),
  error: z.string().optional()
});

export const mapEditResponseSchema = z.object({
  success: z.boolean(),
  flowRunId: z.string(),
  error: z.string().optional()
});

export const mapFeatureDetectionResponseSchema = z.object({
  success: z.boolean(),
  flowRunId: z.string(),
  error: z.string().optional()
});

export const workflowProgressCallbackSchema = z
  .function()
  .args(
    z.object({
      flow: z.string(),
      flowRun: z.string(),
      userId: z.string(),
      status: z.string(),
      progress: z.number(),
      message: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional()
    })
  )
  .returns(z.void());

export const workflowStateSchema = z.object({
  flow: z.string(),
  flowRun: z.string(),
  userId: z.string(),
  state: z.string(),
  result: z.record(z.string(), z.unknown()).optional()
});

export const mapGenerationRequestSchema = z.object({
  description: z.string(),
  parameters: z.object({
    width: z.number(),
    height: z.number(),
    style: z.string(),
    pixelsPerGrid: z.number(),
    name: z.string()
  })
});

export const mapEditRequestSchema = z.object({
  originalImageUrl: z.string(),
  editPrompt: z.string(),
  parameters: z.object({
    width: z.number(),
    height: z.number(),
    style: z.string(),
    pixelsPerGrid: z.number(),
    name: z.string()
  })
});

export const mapFeatureDetectionRequestSchema = z.object({
  imageUrl: z.string(),
  parameters: z.object({
    width: z.number(),
    height: z.number(),
    style: z.string(),
    pixelsPerGrid: z.number(),
    name: z.string()
  })
}); 