import { Injectable } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  HealthCheck,
  HealthCheckResult,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Database health check
      () => this.db.pingCheck('database', { connection: this.dataSource }),
      
      // Memory usage check (heap should be less than 150MB)
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      
      // RSS memory check (should be less than 300MB)
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      
      // Storage check (should have at least 50% free disk space)
      () => this.disk.checkStorage('storage', {
        path: '/',
        thresholdPercent: 0.5,
      }),
    ]);
  }

  @HealthCheck()
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      // Check if database is responsive
      () => this.db.pingCheck('database', { 
        connection: this.dataSource,
        timeout: 3000,
      }),
    ]);
  }

  @HealthCheck()
  async liveness(): Promise<HealthCheckResult> {
    return this.health.check([
      // Basic ping check to ensure service is running
      () => Promise.resolve({
        service: {
          status: 'up',
          info: {
            message: 'Service is running',
            timestamp: new Date().toISOString(),
          },
        },
      }),
    ]);
  }

  /**
   * Get detailed system information
   */
  async getSystemInfo() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        human: this.formatUptime(uptime),
      },
      memory: {
        rss: this.formatBytes(memoryUsage.rss),
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        external: this.formatBytes(memoryUsage.external),
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      database: {
        isConnected: this.dataSource.isInitialized,
        driver: this.dataSource.options.type,
      },
    };
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    
    return result.trim() || '< 1m';
  }
}