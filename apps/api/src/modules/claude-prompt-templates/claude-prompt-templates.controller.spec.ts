import { ClaudePromptTemplatesController } from './claude-prompt-templates.controller';
import { ClaudePromptTemplatesService } from './claude-prompt-templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/claude-prompt-template.dto';

interface MockClaudePromptTemplatesService {
  findAll: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
}

function mockService(): MockClaudePromptTemplatesService {
  return {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
}

function makeController(service: MockClaudePromptTemplatesService) {
  return new ClaudePromptTemplatesController(service as unknown as ClaudePromptTemplatesService);
}

describe('ClaudePromptTemplatesController', () => {
  let controller: ClaudePromptTemplatesController;
  let service: MockClaudePromptTemplatesService;

  beforeEach(() => {
    service = mockService();
    controller = makeController(service);
  });

  describe('findAll', () => {
    it('should call service.findAll and return its result', async () => {
      const expected = [{ id: 1, name: 'template1' }];
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result as unknown).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with the id and return its result', async () => {
      const expected = { id: 1, name: 'template1' };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result as unknown).toEqual(expected);
    });
  });

  describe('create', () => {
    it('should call service.create with the dto and return its result', async () => {
      const dto: CreateTemplateDto = { name: 'new template', content: 'do something' };
      const expected = { id: 2, ...dto };
      service.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result as unknown).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call service.update with the id and dto and return its result', async () => {
      const dto: UpdateTemplateDto = { name: 'updated template' };
      const expected = { id: 1, name: 'updated template' };
      service.update.mockResolvedValue(expected);

      const result = await controller.update(1, dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result as unknown).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with the id and return its result', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toBeUndefined();
    });
  });
});
