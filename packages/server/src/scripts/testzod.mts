import { z } from 'zod';

const mapSchema = z.object({
  name: z.string(),
  description: z.string().transform((val) => val.length),
  imageUrl: z.string().optional().transform((val) => val ?val.length : undefined),
  thumbnailUrl: z.string().optional().transform((val) => val ?val.length : undefined),
});





type IMap = z.infer<typeof mapSchema>;
type IMapOutput = z.output<typeof mapSchema>;
type IMapInput = z.input<typeof mapSchema>;


const foo: IMapInput = {
  name: 'test',
  description: 'test',
  imageUrl: 'test',
  thumbnailUrl: 'test',
}

const res = mapSchema.parse(foo);
console.log(res);