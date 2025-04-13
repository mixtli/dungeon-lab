# Technical Patterns

## Mongo structure

We use Mongoose to interface with MongoDB. In order to make validation and various runtime checks available we define the schemas using zod.
The schemas are defined in the shared package (shared/src/schemas).
Some of the classes are generic and have a data attribute which may have its own schema defined by a plugin. For example, the VTTDocument class has a generic data attribute and which schema is used depends on the documentType and plugin. For example, the dnd-5e-2024 plugin defines documents of type 'characterClass', 'species', 'background', etc. The schema for the data attribute in these cases is usually stored in the plugin's shared folder.

# Validation and Typing

There is a lot of data in this application and we need to be very careful about maintaining type safety, at run time as well as build time. For that reason, we make extensive use of the zod npm package.

Any time we need a type that meets any of the following conditions, we should consider using zod:

1.  We need runtime validation
2.  The type crosses package boundaries.
3.  We are generating or consuming data to be used by an API.
4.  Form validation
5.  Data transformations to validiate incoming, outgoing, and intermediate types.
6.  Anywhere else zod may be useful

# Server Patterns

## Vertical slice architecture

We generally want to use a vertical folder structure based on feature. For example, all code related to VTTDocument management would go in the features/documents folder of the server. This would include models, routers, controllers, and service classes.
