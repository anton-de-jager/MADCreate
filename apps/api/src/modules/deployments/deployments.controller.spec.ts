import { Reflector } from '@nestjs/core';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import type { JwtPayload } from '@madcreate/shared';

// ---------------------------------------------------------------------------
// Mock DeploymentsService interface
// ---------------------------------------------------------------------------

interface MockDeploymentsService {
  list: jest.Mock;
  get: jest.Mock;
  trigger: jest.Mock;
  cancel: jest.Mock;
  onChange: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockDeploymentsService(): MockDeploymentsService {
  return {
    list: jest.fn(),
    get: jest.fn(),
    trigger: jest.fn(),
    cancel: jest.fn(),
    onChange: jest.fn(),
  };
}

const jwtUser: JwtPayload = {
  sub: 'user-1',
  email: 'alice@example.com',
  wsid: 'ws-1',
  role: 'WORKSPACE_OWNER',
  superAdmin: false,
};

function makeController() {
  const svc = mockDeploymentsService();
  const ctrl = new DeploymentsController(svc as unknown as DeploymentsService);
  return { ctrl, svc };
}

// ---------------------------------------------------------------------------
// Decorator / metadata helpers
// ---------------------------------------------------------------------------

const reflector = new Reflector();

function getMethodMeta(key: string, method: Function) {
  return reflector.get(key, method);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeploymentsController', () => {
  // =========================================================================
  // Delegation tests
  // =========================================================================

  describe('list', () => {
    it('delegates to deployments.list with userId and tenantId', async () => {
      const { ctrl, svc } = makeController();
      const expected = [{ id: 'dep-1' }, { id: 'dep-2' }];
      svc.list.mockResolvedValue(expected);

      const result = await ctrl.list(jwtUser, 'tenant-1');

      expect(svc.list).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toBe(expected);
    });
  });

  describe('get', () => {
    it('delegates to deployments.get with userId and id', async () => {
      const { ctrl, svc } = makeController();
      const expected = { id: 'dep-1', status: 'PENDING' };
      svc.get.mockResolvedValue(expected);

      const result = await ctrl.get(jwtUser, 'dep-1');

      expect(svc.get).toHaveBeenCalledWith('user-1', 'dep-1');
      expect(result).toBe(expected);
    });
  });

  describe('trigger', () => {
    it('delegates to deployments.trigger with userId, tenantId, and dto', async () => {
      const { ctrl, svc } = makeController();
      const dto = { target: 'NETLIFY', siteId: 'site-1', config: { branch: 'main' } } as any;
      const expected = { id: 'dep-new', status: 'PENDING' };
      svc.trigger.mockResolvedValue(expected);

      const result = await ctrl.trigger(jwtUser, 'tenant-1', dto);

      expect(svc.trigger).toHaveBeenCalledWith('user-1', 'tenant-1', dto);
      expect(result).toBe(expected);
    });

    it('works without optional fields in dto', async () => {
      const { ctrl, svc } = makeController();
      const dto = { target: 'SFTP' } as any;
      const expected = { id: 'dep-2', status: 'PENDING' };
      svc.trigger.mockResolvedValue(expected);

      const result = await ctrl.trigger(jwtUser, 'tenant-2', dto);

      expect(svc.trigger).toHaveBeenCalledWith('user-1', 'tenant-2', dto);
      expect(result).toBe(expected);
    });
  });

  describe('cancel', () => {
    it('delegates to deployments.cancel with userId and id', async () => {
      const { ctrl, svc } = makeController();
      const expected = { id: 'dep-1', status: 'CANCELLED' };
      svc.cancel.mockResolvedValue(expected);

      const result = await ctrl.cancel(jwtUser, 'dep-1');

      expect(svc.cancel).toHaveBeenCalledWith('user-1', 'dep-1');
      expect(result).toBe(expected);
    });
  });

  describe('events', () => {
    it('returns an Observable that subscribes to onChange', () => {
      const { ctrl, svc } = makeController();
      const unsubFn = jest.fn();
      svc.onChange.mockReturnValue(unsubFn);

      const obs = ctrl.events();

      expect(obs).toBeDefined();
      expect(typeof obs.subscribe).toBe('function');
    });

    it('emits data when onChange listener is called', (done) => {
      const { ctrl, svc } = makeController();
      let capturedListener: () => void;
      svc.onChange.mockImplementation((listener: () => void) => {
        capturedListener = listener;
        return () => {};
      });

      const obs = ctrl.events();
      const sub = obs.subscribe({
        next: (event) => {
          expect(event.data).toBeDefined();
          expect(event.data.ts).toBeDefined();
          sub.unsubscribe();
          done();
        },
      });

      // Trigger the captured listener
      capturedListener!();
    });

    it('cleans up on unsubscribe', () => {
      const { ctrl, svc } = makeController();
      const unsubFn = jest.fn();
      svc.onChange.mockReturnValue(unsubFn);

      const obs = ctrl.events();
      const sub = obs.subscribe({ next: () => {} });

      sub.unsubscribe();

      expect(unsubFn).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Decorator metadata tests
  // =========================================================================

  describe('decorator metadata', () => {
    const proto = DeploymentsController.prototype;

    describe('HTTP method decorators', () => {
      it('list uses @Get()', () => {
        const method = Reflect.getMetadata('method', proto.list);
        const path = Reflect.getMetadata('path', proto.list);
        // GET = 0 in RequestMethod enum
        expect(method).toBe(0);
        expect(path).toBe('/');
      });

      it('get uses @Get(:id)', () => {
        const method = Reflect.getMetadata('method', proto.get);
        const path = Reflect.getMetadata('path', proto.get);
        expect(method).toBe(0);
        expect(path).toBe(':id');
      });

      it('trigger uses @Post()', () => {
        const method = Reflect.getMetadata('method', proto.trigger);
        const path = Reflect.getMetadata('path', proto.trigger);
        // POST = 1 in RequestMethod enum
        expect(method).toBe(1);
        expect(path).toBe('/');
      });

      it('cancel uses @Post(:id/cancel)', () => {
        const method = Reflect.getMetadata('method', proto.cancel);
        const path = Reflect.getMetadata('path', proto.cancel);
        expect(method).toBe(1);
        expect(path).toBe(':id/cancel');
      });

      it('events uses @Sse(events)', () => {
        const path = Reflect.getMetadata('path', proto.events);
        expect(path).toBe('events');
      });
    });

    describe('controller-level decorators', () => {
      it('has @Controller(deployments) path', () => {
        const path = Reflect.getMetadata('path', DeploymentsController);
        expect(path).toBe('deployments');
      });
    });
  });
});
