import dotenv from 'dotenv';
import path from 'path';

// Force NODE_ENV before anything else so env.ts picks the right overrides
process.env['NODE_ENV'] = 'test';

// Load base defaults (.env) then test-specific overrides (.env.test)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });
