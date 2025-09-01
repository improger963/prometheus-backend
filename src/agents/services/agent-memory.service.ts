import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AgentMemory,
  MemoryStep,
  CompressedMemory,
} from '../entities/agent-memory.entity';

@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);
  private readonly MAX_CONTEXT_LENGTH = 50; // Maximum steps before compression
  private readonly FIRST_STEPS_KEEP = 2; // Keep first N steps
  private readonly LAST_STEPS_KEEP = 3; // Keep last N steps

  constructor(
    @InjectRepository(AgentMemory)
    private memoryRepository: Repository<AgentMemory>,
  ) {}

  async initializeMemory(
    agentId: string,
    taskId: string,
    globalGoal: string,
  ): Promise<AgentMemory> {
    const existingMemory = await this.memoryRepository.findOne({
      where: { agentId, taskId },
    });

    if (existingMemory) {
      this.logger.log(
        `Restoring existing memory for agent ${agentId}, task ${taskId}`,
      );
      return existingMemory;
    }

    const newMemory = this.memoryRepository.create({
      agentId,
      taskId,
      globalGoal,
      contextHistory: [],
      totalTokenCount: 0,
      isCompressed: false,
      compressionRatio: 0.0,
    });

    const savedMemory = await this.memoryRepository.save(newMemory);
    this.logger.log(
      `Initialized new memory for agent ${agentId}, task ${taskId}`,
    );
    return savedMemory;
  }

  async appendToHistory(
    memoryId: string,
    step: Omit<MemoryStep, 'timestamp'>,
  ): Promise<AgentMemory> {
    const memory = await this.memoryRepository.findOne({
      where: { id: memoryId },
    });

    if (!memory) {
      throw new NotFoundException(`Memory with ID "${memoryId}" not found.`);
    }

    const timestampedStep: MemoryStep = {
      ...step,
      timestamp: new Date(),
    };

    memory.contextHistory.push(timestampedStep);
    memory.totalTokenCount += step.tokenCount || 0;
    memory.updatedAt = new Date();

    // Auto-compress if history gets too long
    if (memory.contextHistory.length > this.MAX_CONTEXT_LENGTH) {
      await this.compressMemory(memoryId);
      const updatedMemory = await this.memoryRepository.findOne({ 
        where: { id: memoryId } 
      });
      
      if (!updatedMemory) {
        throw new NotFoundException(`Memory with ID "${memoryId}" not found after compression.`);
      }
      
      return updatedMemory;
    }

    return this.memoryRepository.save(memory);
  }

  async compressMemory(memoryId: string): Promise<AgentMemory> {
    const memory = await this.memoryRepository.findOne({
      where: { id: memoryId },
    });

    if (!memory) {
      throw new NotFoundException(`Memory with ID "${memoryId}" not found.`);
    }

    const compressed = this.smartCompression(memory.contextHistory);
    
    memory.firstSteps = compressed.firstSteps;
    memory.lastSteps = compressed.lastSteps;
    memory.compressionRatio = compressed.compressionRatio;
    memory.isCompressed = true;
    
    // Keep only compressed context
    memory.contextHistory = [
      ...compressed.firstSteps,
      ...compressed.lastSteps,
    ];

    const savedMemory = await this.memoryRepository.save(memory);
    
    this.logger.log(
      `Memory compression completed. Compression ratio: ${compressed.compressionRatio}x`,
    );

    return savedMemory;
  }

  async getOptimizedContext(memoryId: string): Promise<string> {
    const memory = await this.memoryRepository.findOne({
      where: { id: memoryId },
    });

    if (!memory) {
      throw new NotFoundException(`Memory with ID "${memoryId}" not found.`);
    }

    let context = `Global Goal: ${memory.globalGoal}\n\n`;

    if (memory.isCompressed) {
      context += "===== INITIAL STEPS =====\n";
      memory.firstSteps?.forEach((step, index) => {
        context += `Step ${index + 1}: ${step.action} -> ${step.result}\n`;
      });

      if (memory.compressionRatio > 1) {
        const skippedSteps = Math.floor(
          (memory.compressionRatio - 1) * memory.contextHistory.length,
        );
        context += `\n[... skipped ${skippedSteps} intermediate steps ...]\n\n`;
      }

      context += "===== RECENT STEPS =====\n";
      memory.lastSteps?.forEach((step, index) => {
        const stepNumber = (memory.firstSteps?.length || 0) + index + 1;
        context += `Step ${stepNumber}: ${step.action} -> ${step.result}\n`;
      });
    } else {
      context += "===== ACTION HISTORY =====\n";
      memory.contextHistory.forEach((step, index) => {
        context += `Step ${index + 1}: ${step.action} -> ${step.result}\n`;
      });
    }

    return context;
  }

  async getMemoryByAgentAndTask(
    agentId: string,
    taskId: string,
  ): Promise<AgentMemory | null> {
    return this.memoryRepository.findOne({
      where: { agentId, taskId },
    });
  }

  async clearMemory(memoryId: string): Promise<void> {
    await this.memoryRepository.delete(memoryId);
  }

  private smartCompression(history: MemoryStep[]): CompressedMemory {
    const totalSteps = history.length;
    
    if (totalSteps <= this.FIRST_STEPS_KEEP + this.LAST_STEPS_KEEP) {
      // No compression needed
      return {
        globalGoal: "",
        firstSteps: history,
        lastSteps: [],
        compressionRatio: 1.0,
        totalOriginalSteps: totalSteps,
      };
    }

    // Extract first and last steps
    const firstSteps = history.slice(0, this.FIRST_STEPS_KEEP);
    const lastSteps = history.slice(-this.LAST_STEPS_KEEP);
    
    const compressionRatio = totalSteps / (firstSteps.length + lastSteps.length);

    return {
      globalGoal: "",
      firstSteps,
      lastSteps,
      compressionRatio: Math.round(compressionRatio * 100) / 100,
      totalOriginalSteps: totalSteps,
    };
  }

  async getMemoryStats(agentId: string): Promise<{
    totalMemories: number;
    compressedMemories: number;
    totalTokens: number;
    avgCompressionRatio: number;
  }> {
    const memories = await this.memoryRepository.find({
      where: { agentId },
    });

    const totalMemories = memories.length;
    const compressedMemories = memories.filter((m) => m.isCompressed).length;
    const totalTokens = memories.reduce((sum, m) => sum + m.totalTokenCount, 0);
    const avgCompressionRatio =
      memories.reduce((sum, m) => sum + m.compressionRatio, 0) / totalMemories || 0;

    return {
      totalMemories,
      compressedMemories,
      totalTokens,
      avgCompressionRatio: Math.round(avgCompressionRatio * 100) / 100,
    };
  }
}