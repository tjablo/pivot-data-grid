import { useCallback, useState } from 'react';

export function useControllableState<T>(
  controlledValue: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void,
): [T, (value: T) => void] {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;

  const setValue = useCallback(
    (nextValue: T) => {
      if (controlledValue === undefined) setInternalValue(nextValue);
      onChange?.(nextValue);
    },
    [controlledValue, onChange],
  );

  return [value, setValue];
}
