import { z } from 'zod';
import mongoose  from 'mongoose';
import { zId, zodSchemaRaw } from '@zodyac/zod-mongoose';
import { ObjectId } from 'mongodb';

import { extendZod } from "@zodyac/zod-mongoose";
extendZod(z);

const connection = await mongoose.connect('mongodb://localhost:27017/test');

const stringToNumber = z.string().transform((val) => val.length);
const res = stringToNumber.parse("test");
console.log(res);



/**
 * Creates a base mongoose schema with common configuration
 * @param zodSchema The Zod object schema to convert
 * @param options Schema configuration options
 * @returns Configured mongoose schema
 */
export function createMongoSchema(
  schema: z.ZodObject<Record<string, z.ZodTypeAny>, "strip", z.ZodTypeAny>,
  transform?: (doc: unknown, ret: Record<string, unknown>) => unknown
): mongoose.Schema {

  const myZodSchema = zodSchemaRaw(schema.omit({id: true}));
  
  const fullSchema = new mongoose.Schema(myZodSchema, {
    timestamps: true,
    toObject: {
      virtuals: true,
      getters: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        if (transform) {
          transform(doc, ret);
        }
        return ret;
      },
    },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        if (transform) {
          transform(doc, ret);
        }
        return ret;
      },
    },
  });
  fullSchema.virtual('id').get(function() {
    return this._id.toString();
  })
  fullSchema.virtual('id').set(function(v: string) {
    this._id = new ObjectId(v);
  })
  fullSchema.path('createdBy').get(function(value: mongoose.Types.ObjectId | undefined | null) {
    return value?.toString();
  })
  fullSchema.path('updatedBy').get(function(value: mongoose.Types.ObjectId | undefined | null) {
    return value?.toString();
  })

  return fullSchema;
}

/**
 * Base document interface that all models should extend
 */
export interface BaseDocument extends mongoose.Document {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}


const baseSchema = z.object({
  id: z.string().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
})

const baseMongooseZodSchema = z.object({
  createdBy: zId('User').optional(),
  updatedBy: zId('User').optional(),
})


const  productSchema = z.object({
  name: z.string(),
  price: z.number(),
}).merge(baseSchema);



const orderSchema = z.object({
  name: z.string(),
  products: z.array(z.string())
}).merge(baseSchema);

const orderSchemaMongoose = orderSchema.extend({
  products: z.array(zId('Product')),
}).merge(baseMongooseZodSchema);

const productSchemaMongoose = productSchema.merge(baseMongooseZodSchema);

type IOrder = z.infer<typeof orderSchema>;
type IProduct = z.infer<typeof productSchema>;

const mongooseProductSchema = createMongoSchema(productSchemaMongoose);
export const ProductModel = mongoose.model<IProduct>('Product', mongooseProductSchema); 


const mongooseOrderSchema = createMongoSchema(orderSchemaMongoose)
mongooseOrderSchema.path('products').get(function(value: mongoose.Types.ObjectId[]) {
  return value.map((p: mongoose.Types.ObjectId) => p.toString());
});

export const OrderModel = mongoose.model<IOrder>('Order', mongooseOrderSchema); 

const product = new ProductModel({
  name: 'test',
  price: 100,
  createdBy: '66b602b7626b2b6b2b6b2b6b',
});
console.log(product.id);
console.log(typeof product.id);

const savedProduct = await product.save();

const orderData = {
  name: 'test',
  products: [product.id],
  createdBy: '66b602b7626b2b6b2b6b2b6b',
}

// const validatedOrder = prepSchema.safeParse(orderData);
// console.log(validatedOrder);

const order = new OrderModel(orderData);
const savedOrder = await order.save();



console.log("savedProduct", savedProduct);
console.log("savedProduct.id", savedProduct.id);
console.log("savedProduct.toObject()", savedProduct.toObject());

console.log("savedOrder", savedOrder);
console.log("savedOrder.toObject()", savedOrder.toObject());
console.log("savedOrder.products", savedOrder.products)
console.log("typeof savedOrder.id", typeof savedOrder.id);
console.log("savedOrder.id", savedOrder.id);
console.log("createdBy", savedOrder.createdBy);
console.log("savedOrder.toObject()", savedOrder.toObject());
const myOrder = savedOrder.toObject();
console.log("myOrder", myOrder);


// const authorSchema = new Schema({
//   _id: { type: 'UUID', default: randomUUID() },
//   name: String
// });

// const Author = mongoose.model('Author', authorSchema);

// const bookSchema = new Schema({
//   authorId: { type: Schema.Types.UUID, ref: 'Author' }
// });
// const Book = mongoose.model('Book', bookSchema);

// const author = new Author({ name: 'Martin Fowler' });
// console.log("new author", author)
// author.save();
// console.log("saved author", author)
// console.log("author object", author.toObject())
// console.log("author as json", author.toJSON())
// console.log(typeof author._id); // 'string'
// console.log(typeof author.id); // 'string'
// console.log(author._id); // 'string'
// console.log(author.id)
// console.log(author.toObject()._id instanceof mongoose.mongo.BSON.Binary); // true

// const book = new Book({ authorId: '09190f70-3d30-11e5-8814-0f4df9a59c41' });
// console.log(book)
// console.log("done")

savedOrder.products = ['66b602b7626b2b6b2b6b2b6b', '76b602b7626b2b6b2b6b2b6b']
const savedOrder2 = await savedOrder.save();
console.log("savedOrder2", savedOrder2);

await connection.disconnect();