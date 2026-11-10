// Testes da tela de Produção Diária.

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Production from '../pages/Production';
import api from '../api/client';

jest.mock('../api/client', () => ({ get: jest.fn() }));

beforeEach(() => {
  jest.resetAllMocks();
});

test('mostra o que produzir e destaca o ingrediente que falta', async () => {
  api.get.mockResolvedValue({ data: {
    production_date: '2026-11-05',
    items: [
      { product_id: 1, product_name: 'Bolo de Morango', unit: 'unidade', total_quantity: 3, delivery_date: '2026-11-07' }
    ],
    ingredients: [
      { ingredient_id: 10, name: 'Morango', unit: 'kg', quantity_needed: 1.5, stock_quantity: 1, shortage: 0.5 },
      { ingredient_id: 11, name: 'Creme de leite', unit: 'L', quantity_needed: 0.9, stock_quantity: 2, shortage: 0 }
    ]
  } });

  render(<Production />);

  // a data aparece no formato brasileiro
  expect(await screen.findByText('Itens a produzir em 05/11/2026')).toBeInTheDocument();
  expect(screen.getByText('Bolo de Morango')).toBeInTheDocument();
  expect(screen.getByText('07/11/2026')).toBeInTheDocument();

  // o morango falta (0,5 kg) e a linha fica destacada
  expect(screen.getByText('0.5 kg')).toBeInTheDocument();
  expect(screen.getByText('Morango').closest('tr')).toHaveClass('row-warning');
  // o creme não falta
  expect(screen.getByText('Creme de leite').closest('tr')).not.toHaveClass('row-warning');
});

test('dia sem pedidos mostra que não há produção', async () => {
  api.get.mockResolvedValue({ data: { production_date: '2026-11-05', items: [], ingredients: [] } });
  render(<Production />);
  expect(await screen.findByText('Nenhuma produção necessária nesta data.')).toBeInTheDocument();
  expect(screen.getByText('Nenhum ingrediente necessário nesta data.')).toBeInTheDocument();
});

test('trocar a data busca a produção do novo dia', async () => {
  api.get.mockResolvedValue({ data: { production_date: '2026-11-05', items: [], ingredients: [] } });
  render(<Production />);
  await screen.findByText('Nenhuma produção necessária nesta data.');

  // act espera a tela terminar de atualizar depois da troca de data
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Data de produção'), { target: { value: '2026-11-20' } });
  });

  expect(api.get).toHaveBeenLastCalledWith('/production', { params: { date: '2026-11-20' } });
});

test('se a API falhar, mostra a mensagem de erro', async () => {
  api.get.mockRejectedValue({ response: { data: { message: 'Data inválida.' } } });
  render(<Production />);
  expect(await screen.findByText('Data inválida.')).toBeInTheDocument();
});
