import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../src/config/app';
import { logger } from '../src/config/logger';
import { getTraceId, getContext } from '../src/config/requestContext';
import { CronManager } from '../src/jobs/CronManager';

// Add test endpoints to the app dynamically
(app as any).get('/api/v1/test-context-leak', async (req: any, res: any) => {
  const initialTraceId = getTraceId();
  const initialRequestId = getContext()?.requestId;
  await new Promise((resolve) => setTimeout(resolve, 50));
  res.json({
    initialTraceId,
    currentTraceId: getTraceId(),
    initialRequestId,
    currentRequestId: getContext()?.requestId,
  });
});

(app as any).get('/api/v1/test-context-auth', async (req: any, res: any) => {
  // Simulate authentication middleware setUserId behavior
  const { setUserId } = require('../src/config/requestContext');
  setUserId('auth-user-999');

  const spy = jest.spyOn(logger, 'info');
  logger.info('Test log inside authed route');
  const loggedObject = spy.mock.calls[spy.mock.calls.length - 1][0];
  spy.mockRestore();

  res.json({
    userId: getContext()?.userId,
    logTraceId: (loggedObject as any)?.traceId,
    logUserId: (loggedObject as any)?.userId,
  });
});

(app as any).get('/api/v1/test-context-error', (req: any, res: any) => {
  throw new Error('Expected test crash');
});

describe('Request Trace ID (Correlation ID) & AsyncLocalStorage Context', () => {
  it('should generate a traceId and requestId when none are supplied and set X-Trace-Id header', async () => {
    const res = await request(app)
      .get('/api/v1/auth/csrf-token')
      .expect(200);

    expect(res.headers['x-trace-id']).toBeDefined();
    expect(res.body.traceId).toBe(res.headers['x-trace-id']);
  });

  it('should reuse traceId supplied via X-Trace-Id header', async () => {
    const inputTraceId = uuidv4();
    const res = await request(app)
      .get('/api/v1/auth/csrf-token')
      .set('X-Trace-Id', inputTraceId)
      .expect(200);

    expect(res.headers['x-trace-id']).toBe(inputTraceId);
    expect(res.body.traceId).toBe(inputTraceId);
  });

  it('should parse W3C traceparent header if X-Trace-Id is absent', async () => {
    const w3cTraceId = '4bf92f3577b34da6a3ce929d0e0e4736';
    const traceparent = `00-${w3cTraceId}-00f067aa0ba902b7-01`;

    const res = await request(app)
      .get('/api/v1/auth/csrf-token')
      .set('traceparent', traceparent)
      .expect(200);

    expect(res.headers['x-trace-id']).toBe(w3cTraceId);
    expect(res.body.traceId).toBe(w3cTraceId);
  });

  it('should ignore malformed W3C traceparent header and generate a new UUID', async () => {
    const malformed = '00-malformedtraceid-too-short-01';

    const res = await request(app)
      .get('/api/v1/auth/csrf-token')
      .set('traceparent', malformed)
      .expect(200);

    expect(res.headers['x-trace-id']).toBeDefined();
    expect(res.headers['x-trace-id']).not.toBe('malformedtraceid');
    expect(res.body.traceId).toBe(res.headers['x-trace-id']);
  });

  it('should isolate concurrent requests and not bleed traceContext variables', async () => {
    const [resA, resB] = await Promise.all([
      request(app).get('/api/v1/test-context-leak').set('X-Trace-Id', 'trace-A'),
      request(app).get('/api/v1/test-context-leak').set('X-Trace-Id', 'trace-B'),
    ]);

    expect(resA.body.initialTraceId).toBe('trace-A');
    expect(resA.body.currentTraceId).toBe('trace-A');
    expect(resA.body.initialRequestId).toBe('trace-A');
    expect(resA.body.currentRequestId).toBe('trace-A');

    expect(resB.body.initialTraceId).toBe('trace-B');
    expect(resB.body.currentTraceId).toBe('trace-B');
    expect(resB.body.initialRequestId).toBe('trace-B');
    expect(resB.body.currentRequestId).toBe('trace-B');
  });

  it('should bind the userId in context and logs after authenticate is triggered', async () => {
    const inputTraceId = uuidv4();
    const res = await request(app)
      .get('/api/v1/test-context-auth')
      .set('X-Trace-Id', inputTraceId)
      .expect(200);

    expect(res.body.userId).toBe('auth-user-999');
    expect(res.body.logTraceId).toBe(inputTraceId);
    expect(res.body.logUserId).toBe('auth-user-999');
  });

  it('should include the traceId in standard error responses', async () => {
    const inputTraceId = uuidv4();
    const res = await request(app)
      .get('/api/v1/test-context-error')
      .set('X-Trace-Id', inputTraceId)
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INTERNAL_ERROR');
    expect(res.body.traceId).toBe(inputTraceId);
  });

  it('should wrap background jobs executed by CronManager in runWithContext', async () => {
    const cronManager = CronManager.getInstance();
    let jobTraceId: string | undefined;
    let jobRequestId: string | undefined;

    cronManager.register('expire_tenders', '* * * * *', () => {
      jobTraceId = getTraceId();
      jobRequestId = getContext()?.requestId;
    });

    // Manually run the registered cron job task callback
    const task: any = (cronManager as any).tasks.get('expire_tenders');
    expect(task).toBeDefined();

    // Trigger the callback function
    const cronCallback = task._executor ?? task.task;
    if (typeof cronCallback === 'function') {
      await cronCallback();
    } else {
      // Direct call fallback for node-cron task structure
      const callbacks = (task as any)._callbacks ?? [];
      for (const cb of callbacks) {
        await cb();
      }
    }

    expect(jobTraceId).toBeDefined();
    expect(jobRequestId).toBeDefined();
    expect(jobTraceId).toBe(jobRequestId);
  });
});
