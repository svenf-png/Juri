import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { InstanceBanner } from '@/ui/components/InstanceBanner';
import { UpdatePrompt } from '@/ui/components/UpdatePrompt';
import { createRouter } from './router';

export function App() {
  const [router] = useState(createRouter);
  const isTest = __JURI_INSTANCE__ === 'test';
  return (
    <>
      {isTest ? <InstanceBanner /> : null}
      <div className={isTest ? 'after-banner' : undefined}>
        <RouterProvider router={router} />
      </div>
      <UpdatePrompt router={router} />
    </>
  );
}
