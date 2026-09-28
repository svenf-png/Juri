import { describe, expect, it } from 'vitest';
import { routes } from './router';

describe('routes', () => {
  it('bietet den Geräte-Check nur in der Testinstanz', () => {
    const Dummy = () => null;
    const paths = (instance: 'app' | 'test') => routes(instance, Dummy).map((r) => r.path);
    expect(paths('app')).not.toContain('/geraetecheck');
    expect(paths('test')).toContain('/geraetecheck');
    expect(paths('app')).toEqual(['/', '/styleguide', '*']);
  });

  it('enthält den Geräte-Check im Build der echten App nicht', () => {
    expect(routes('test').map((r) => r.path)).not.toContain('/geraetecheck');
  });
});
