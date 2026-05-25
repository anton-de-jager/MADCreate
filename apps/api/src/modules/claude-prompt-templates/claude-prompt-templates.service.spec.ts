import { NotFoundException } from '@nestjs/common';
import { ClaudePromptTemplatesService } from './claude-prompt-templates.service';
import { createMockPrisma, type PrismaService } from '../../test/mock-helpers';

function makeService() {
  const prisma = createMockPrisma();
  const svc = new ClaudePromptTemplatesService(prisma as unknown as PrismaService);
  return { svc, prisma };
}

const fakeTemplate = {
  id: 1,
  name: 'Welcome Email',
  description: 'Template for welcome emails',
  content: 'Hello {{name}}, welcome!',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('ClaudePromptTemplatesService', () => {
  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------
  describe('findAll', () => {
    it('returns all templates ordered by name', async () => {
      const { svc, prisma } = makeService();
      prisma.claudePromptTemplate.findMany.mockResolvedValue([fakeTemplate]);

      const result = await svc.findAll();

      expect(result).toEqual([fakeTemplate]);
      expect(prisma.claudePromptTemplate.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('returns empty array when no templates exist', async () => {
      const { svc, prisma } = makeService();
      prisma.claudePromptTemplate.findMany.mockResolvedValue([]);

      const result = await svc.findAll();

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // findOne
  // -----------------------------------------------------------------------
  describe('findOne', () => {
    it('returns the template when found', async () => {
      const { svc, prisma } = makeService();
      prisma.claudePromptTemplate.findUnique.mockResolvedValue(fakeTemplate);

      const result = await svc.findOne(1);

      expect(result).toEqual(fakeTemplate);
      expect(prisma.claudePromptTemplate.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws NotFoundException when template does not exist', async () => {
      const { svc, prisma } = makeService();
      prisma.claudePromptTemplate.findUnique.mockResolvedValue(null);

      await expect(svc.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('creates a template with all fields', async () => {
      const { svc, prisma } = makeService();
      const dto = { name: 'New', description: 'Desc', content: 'Body' };
      prisma.claudePromptTemplate.create.mockResolvedValue({ id: 2, ...dto });

      const result = await svc.create(dto);

      expect(result.id).toBe(2);
      expect(prisma.claudePromptTemplate.create).toHaveBeenCalledWith({
        data: { name: 'New', description: 'Desc', content: 'Body' },
      });
    });

    it('sets description to null when omitted', async () => {
      const { svc, prisma } = makeService();
      const dto = { name: 'Minimal', content: 'Body' };
      prisma.claudePromptTemplate.create.mockResolvedValue({ id: 3, ...dto, description: null });

      await svc.create(dto);

      expect(prisma.claudePromptTemplate.create).toHaveBeenCalledWith({
        data: { name: 'Minimal', description: null, content: 'Body' },
      });
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update', () => {
    it('updates only provided fields', async () => {
      const { svc, prisma } = makeService();
      prisma.claudePromptTemplate.findUnique.mockResolvedValue(fakeTemplate);
      prisma.claudePromptTemplate.update.mockResolvedValue({ ...fakeTemplate, name: 'Renamed' });

      const result = await svc.update(1, { name: 'Renamed' });

      expect(result.name).toBe('Renamed');
      expect(prisma.claudePromptTemplate.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Renamed' },
      });
    });

    it('updates all fields when all are provided', async () => {
      const { svc, prisma } = makeService();
      prisma.claudePromptTemplate.findUnique.mockResolvedValue(fakeTemplate);
      const dto = { name: 'Updated', description: 'New desc', content: 'New body' };
      prisma.claudePromptTemplate.update.mockResolvedValue({ ...fakeTemplate, ...dto });

      await svc.update(1, dto);

      expect(prisma.claudePromptTemplate.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
    });

    it('throws NotFoundException when template does not exist', async () => {
      const { svc, prisma } = makeService();
      prisma.claudePromptTemplate.findUnique.mockResolvedValue(null);

      await expect(svc.update(999, { name: 'X' })).rejects.toThrow(NotFoundException);
      expect(prisma.claudePromptTemplate.update).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------
  describe('remove', () => {
    it('deletes the template when found', async () => {
      const { svc, prisma } = makeService();
      prisma.claudePromptTemplate.findUnique.mockResolvedValue(fakeTemplate);
      prisma.claudePromptTemplate.delete.mockResolvedValue(fakeTemplate);

      await svc.remove(1);

      expect(prisma.claudePromptTemplate.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws NotFoundException when template does not exist', async () => {
      const { svc, prisma } = makeService();
      prisma.claudePromptTemplate.findUnique.mockResolvedValue(null);

      await expect(svc.remove(999)).rejects.toThrow(NotFoundException);
      expect(prisma.claudePromptTemplate.delete).not.toHaveBeenCalled();
    });
  });
});
