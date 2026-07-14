import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return the API status', () => {
    const response = controller.check();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('pid-core-api');
    expect(response.timestamp).toBeDefined();
  });
});
