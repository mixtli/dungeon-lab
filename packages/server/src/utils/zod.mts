import { z } from 'zod';

import { extendZod } from "@zodyac/zod-mongoose";
extendZod(z);

export { z }
