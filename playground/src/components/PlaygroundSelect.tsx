import * as Select from '@radix-ui/react-select';

import { Check, ChevronDown } from '../icons';
import type { PlaygroundOption } from '../types';

interface PlaygroundSelectProps<TValue extends string> {
  label: string;
  value: TValue;
  options: Array<PlaygroundOption<TValue>>;
  onValueChange: (value: TValue) => void;
}

export function PlaygroundSelect<TValue extends string>({ label, value, options, onValueChange }: PlaygroundSelectProps<TValue>) {
  return (
    <div className="playground-select-field">
      <span>{label}</span>
      <Select.Root value={value} onValueChange={(nextValue) => onValueChange(nextValue as TValue)}>
        <Select.Trigger className="playground-select-trigger" aria-label={label}>
          <Select.Value />
          <Select.Icon className="playground-select-icon">
            <ChevronDown aria-hidden />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="playground-select-content" position="popper" sideOffset={8}>
            <Select.Viewport className="playground-select-viewport">
              {options.map((option) => (
                <Select.Item className="playground-select-item" key={option.value} value={option.value}>
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="playground-select-indicator">
                    <Check aria-hidden />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
