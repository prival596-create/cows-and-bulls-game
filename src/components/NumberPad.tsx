import { Delete } from 'lucide-react';

interface NumberPadProps {
  slots: (string | null)[];
  cursor: number;
  onInput: (digit: string) => void;
  onDelete: () => void;
  onSelectSlot: (index: number) => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  submitLabel?: string;
}

export default function NumberPad({
  slots,
  cursor,
  onInput,
  onDelete,
  onSelectSlot,
  onSubmit,
  submitDisabled,
  submitLabel = 'Проверить',
}: NumberPadProps) {
  const digits = slots.length;
  const usedDigits = new Set(slots.filter((digit): digit is string => digit !== null));
  const isFull = usedDigits.size >= digits;
  const isEmpty = usedDigits.size === 0;

  return (
    <div className="space-y-3 select-none">
      <div
        className="flex items-center justify-center gap-1 sm:gap-1.5 min-h-[2.5rem] sm:min-h-[3.25rem]"
        role="group"
        aria-label={`Введено ${usedDigits.size} из ${digits}. Активная клетка ${cursor + 1}`}
      >
        {slots.map((digit, index) => {
          const isActive = index === cursor;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelectSlot(index)}
              aria-label={
                digit
                  ? `Клетка ${index + 1}: ${digit}. Нажмите, чтобы изменить`
                  : `Клетка ${index + 1}, пусто. Нажмите, чтобы начать с неё`
              }
              aria-pressed={isActive}
              className={`flex-1 min-w-0 max-w-[2.75rem] h-10 sm:h-[3.25rem] rounded-xl flex items-center justify-center text-base sm:text-xl font-bold transition-all duration-150 touch-manipulation ${
                digit
                  ? 'bg-gradient-to-br from-cyan-300 to-blue-600 text-white shadow-[0_0_14px_rgba(0,214,255,0.65)]'
                  : 'digit-slot-empty border-2 border-dashed'
              } ${isActive ? 'digit-slot-active' : ''}`}
            >
              {digit ?? ''}
            </button>
          );
        })}
      </div>

      {isEmpty && (
        <p className="text-center text-[11px] neon-muted leading-tight">
          Можно начать с любой клетки — нажмите на неё, и цифры пойдут по порядку.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => {
          const disabled = usedDigits.has(d) || isFull;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onInput(d)}
              disabled={disabled}
              aria-label={`Цифра ${d}`}
              className={`h-12 sm:h-12 rounded-2xl text-lg sm:text-lg font-bold transition-all duration-150 active:scale-95 touch-manipulation ${
                disabled
                  ? 'neon-key-muted'
                  : 'neon-key hover:border-cyan-200'
              }`}
            >
              {d}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onDelete}
          disabled={usedDigits.size === 0}
          aria-label="Удалить цифру"
          className={`h-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-150 active:scale-95 touch-manipulation ${
            usedDigits.size === 0
              ? 'neon-key-muted'
              : 'neon-key hover:border-rose-300 text-rose-100'
          }`}
        >
          <Delete className="w-6 h-6" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onInput('0')}
          disabled={usedDigits.has('0') || isFull}
          aria-label="Цифра 0"
          className={`h-12 sm:h-12 rounded-2xl text-lg sm:text-lg font-bold transition-all duration-150 active:scale-95 touch-manipulation ${
            usedDigits.has('0') || isFull
              ? 'neon-key-muted'
              : 'neon-key hover:border-cyan-200'
          }`}
        >
          0
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled}
          className={`h-12 sm:h-12 rounded-2xl text-sm sm:text-sm font-bold transition-all duration-150 active:scale-95 touch-manipulation ${
            submitDisabled
              ? 'neon-key-muted'
              : 'neon-button hover:brightness-110'
          }`}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
