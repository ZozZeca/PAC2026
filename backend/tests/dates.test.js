// Testes das funções de data usadas no cálculo da produção.
// Elas são a base de tudo: se "somar 1 dia" errar, a produção sai no dia errado.

const { addDays, toDateString } = require('../src/utils/production');

describe('addDays', () => {
  test('soma 1 dia dentro do mesmo mês', () => {
    expect(addDays('2026-11-05', 1)).toBe('2026-11-06');
  });

  test('vira o mês corretamente', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });

  test('vira o ano corretamente', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  test('soma 2 dias (produto com 2 dias de antecedência)', () => {
    expect(addDays('2026-11-05', 2)).toBe('2026-11-07');
  });

  test('aceita dias negativos (volta no tempo)', () => {
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });
});

describe('toDateString', () => {
  test('formata a data como ano-mês-dia, com zeros à esquerda', () => {
    // Atenção: no JavaScript o mês começa em 0. Então 0 = janeiro.
    const data = new Date(2026, 0, 5); // 5 de janeiro de 2026
    expect(toDateString(data)).toBe('2026-01-05');
  });
});
