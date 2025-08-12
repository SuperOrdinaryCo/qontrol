// Re-export everything from core and express packages

export * from '@bulldash/core';
export * from '@bulldash/express';

// Convenience function for quick setup
import { BullDash, Config } from '@bulldash/core';
import { createBullDashRouter, BullDashExpressOptions } from '@bulldash/express';
import express from 'express';

export function createBullDashApp(config: Config, expressOptions?: BullDashExpressOptions) {
  const bullDash = new BullDash(config);
  const router = createBullDashRouter(bullDash, expressOptions);

  return {
    bullDash,
    router,
    // Convenience method to create a standalone server
    createServer: (port = 3000) => {
      const app = express();
      app.use('/', router);
      return app.listen(port, () => {
        console.log(`BullDash server running on port ${port}`);
      });
    }
  };
}
