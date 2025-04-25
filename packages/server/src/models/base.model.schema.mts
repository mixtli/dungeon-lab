//import mongoose from 'mongoose';
//import { zodSchemaRaw } from '@zodyac/zod-mongoose';
import { z } from 'zod';
import { zId } from '@zodyac/zod-mongoose';

export const baseMongooseZodSchema = z.object({
  createdBy: zId('User').optional(),
  updatedBy: zId('User').optional()
});
