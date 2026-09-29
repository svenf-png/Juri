import { useId, type CSSProperties, type Ref } from 'react';
import { cx } from '../cx';
import styles from './Field.module.css';

/**
 * Beschriftetes Eingabefeld (Erstellen.dc.html: Fläche, Radius 20, Beschriftung in Versalien).
 * Fehler stehen als Text im Feld und sind dem Eingabefeld zugeordnet (aria-describedby).
 */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
  multiline = false,
  rows,
  inputRef,
  className,
  inputStyle,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | undefined;
  multiline?: boolean;
  rows?: number;
  inputRef?: Ref<HTMLInputElement & HTMLTextAreaElement>;
  className?: string | undefined;
  inputStyle?: CSSProperties;
  autoFocus?: boolean;
  maxLength?: number;
  autoCapitalize?: string;
  enterKeyHint?: 'done' | 'next' | 'go' | 'search';
}) {
  const errorId = useId();
  const common = {
    className: styles.input,
    value,
    placeholder,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
    autoComplete: 'off',
    spellCheck: false,
    ...rest,
  };
  const change = (e: { target: { value: string } }) => {
    onChange(e.target.value);
  };
  return (
    <label className={cx(styles.field, error && styles.invalid, className)}>
      <span className={styles.label}>{label}</span>
      {multiline ? (
        <textarea
          {...common}
          rows={rows ?? 3}
          ref={inputRef}
          onChange={change}
          style={{ resize: 'none', lineHeight: 1.4, padding: 2, ...inputStyle }}
        />
      ) : (
        <input {...common} ref={inputRef} onChange={change} style={inputStyle} />
      )}
      {error ? (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
