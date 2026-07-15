import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  const healthResponse = {
    status: 'ok' as const,
    service: 'pid-core-api',
    database: {
      status: 'up' as const,
      latencyMs: 1,
    },
    timestamp: '2026-07-15T12:00:00.000Z',
  };

  const healthServiceMock = {
    check: jest.fn(),
  };

  beforeEach(async () => {
    healthServiceMock.check.mockResolvedValue(healthResponse);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: healthServiceMock,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the API and database status', async () => {
    await expect(controller.check()).resolves.toEqual(healthResponse);

    expect(healthServiceMock.check).toHaveBeenCalledTimes(1);
  });
});
