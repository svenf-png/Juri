import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cx } from '../cx';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'ink' | 'soft' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'lg' | 'md' | 'sm';

interface StyleProps {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  block?: boolean | undefined;
}

function classes({ variant = 'primary', size = 'lg', block = false }: StyleProps, extra?: string) {
  return cx(styles.button, styles[variant], styles[size], block && styles.block, extra);
}

export function Button({
  variant,
  size,
  block,
  className,
  type = 'button',
  ...rest
}: StyleProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={classes({ variant, size, block }, className)} {...rest} />;
}

/** Knopf-Optik für Navigation innerhalb der App. */
export function ButtonLink({ variant, size, block, className, ...rest }: StyleProps & LinkProps) {
  return <Link className={classes({ variant, size, block }, className)} {...rest} />;
}

/** Knopf-Optik für Adressen außerhalb des Routers, z. B. die andere Instanz. */
export function ButtonAnchor({
  variant,
  size,
  block,
  className,
  ...rest
}: StyleProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={classes({ variant, size, block }, className)} {...rest} />;
}
