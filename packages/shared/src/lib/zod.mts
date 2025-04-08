import 'zod-openapi/extend';
import { z } from 'zod';
import { extendZod } from '@zodyac/zod-mongoose';


// Extend Zod with Mongoose capabilities once
extendZod(z);

// Export the extended Zod instance
export { z }; 