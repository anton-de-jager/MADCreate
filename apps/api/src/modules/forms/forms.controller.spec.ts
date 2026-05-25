import type { Request } from 'express';
import type { JwtPayload } from '@madcreate/shared';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { SubmitFormDto } from './dto/submit-form.dto';

// ---------------------------------------------------------------------------
// Mock FormsService interface
// ---------------------------------------------------------------------------

interface MockFormsService {
  submit: jest.Mock;
  listSubmissions: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFormsService(): MockFormsService {
  return {
    submit: jest.fn(),
    listSubmissions: jest.fn(),
  };
}

function makeController() {
  const service = mockFormsService();
  const ctrl = new FormsController(service as unknown as FormsService);
  return { ctrl, service };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FormsController', () => {
  // =========================================================================
  // submit
  // =========================================================================

  describe('submit', () => {
    it('delegates to service.submit() with tenantId, dto, and request', async () => {
      const { ctrl, service } = makeController();
      const dto: SubmitFormDto = { formKey: 'contact', data: { name: 'John' }, name: 'John', email: 'john@example.com' } as SubmitFormDto;
      const tenantId = 'tenant-1';
      const req = {} as Request;
      const expected = { id: 'sub-1', tenantId };
      service.submit.mockResolvedValue(expected);

      const result = await ctrl.submit(dto, tenantId, req);

      expect(service.submit).toHaveBeenCalledWith(tenantId, dto, req);
      expect(result as unknown).toBe(expected);
    });
  });

  // =========================================================================
  // list
  // =========================================================================

  describe('list', () => {
    it('delegates to service.listSubmissions() with user sub and tenantId', async () => {
      const { ctrl, service } = makeController();
      const user: JwtPayload = { sub: 'user-1', email: 'user@example.com' };
      const tenantId = 'tenant-1';
      const expected = [{ id: 'sub-1', data: {} }];
      service.listSubmissions.mockResolvedValue(expected);

      const result = await ctrl.list(user, tenantId);

      expect(service.listSubmissions).toHaveBeenCalledWith('user-1', tenantId);
      expect(result as unknown).toBe(expected);
    });
  });
});
