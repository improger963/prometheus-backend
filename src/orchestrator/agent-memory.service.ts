import { Injectable } from '@nestjs/common';

// Интерфейс, описывающий один "ход" в диалоге
interface Turn {
  type: 'success' | 'error';
  command: string;
  args: string[];
  output: string;
}

// Этот класс будет управлять памятью для ОДНОЙ сессии выполнения задачи
class AgentMemory {
  private turns: Turn[] = [];
  private readonly initialContext: string;

  constructor(initialContext: string) {
    this.initialContext = initialContext;
  }

  addTurn(turn: Turn) {
    this.turns.push(turn);
  }

  // Главный метод, который формирует оптимизированный контекст
  getContext(): string {
    const turnCount = this.turns.length;
    if (turnCount === 0) {
      return this.initialContext;
    }

    // Если история короткая, показываем всё
    if (turnCount <= 5) {
      // 5 - настраиваемый параметр "размера окна"
      return `${this.initialContext}\n\n${this.formatTurns(this.turns)}`;
    }

    // Логика "Скользящего Окна"
    const firstTurns = this.turns.slice(0, 2); // Всегда помним первые 2 шага
    const lastTurns = this.turns.slice(-3); // Всегда помним последние 3 шага
    const omittedCount = turnCount - (firstTurns.length + lastTurns.length);

    const context = `
${this.initialContext}

${this.formatTurns(firstTurns)}

... (${omittedCount} промежуточных шагов опущено для краткости) ...

${this.formatTurns(lastTurns)}
    `;
    return context.trim();
  }

  private formatTurns(turns: Turn[]): string {
    return turns
      .map((turn) => {
        const resultType = turn.type === 'success' ? 'УСПЕХ' : 'ОШИБКА';
        const outputLabel = turn.type === 'success' ? 'Вывод' : 'Вывод ошибки';
        const truncatedOutput =
          turn.output.length > 500
            ? turn.output.substring(0, 500) + '\n... (вывод обрезан)'
            : turn.output;
        return `ПРЕДЫДУЩЕЕ ДЕЙСТВИЕ (${resultType}):\n- Команда: "${turn.command} ${turn.args.join(' ')}"\n- ${outputLabel}:\n\`\`\`\n${truncatedOutput || '(пустой вывод)'}\n\`\`\``;
      })
      .join('\n\n');
  }
}

// Это сервис-фабрика, который будет создавать экземпляры AgentMemory
@Injectable()
export class AgentMemoryService {
  createMemoryInstance(initialContext: string): AgentMemory {
    return new AgentMemory(initialContext);
  }
}
