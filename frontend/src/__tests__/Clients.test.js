// Testes da tela de clientes.

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Clients from '../pages/Clients';
import api from '../api/client';

jest.mock('../api/client', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));

beforeEach(() => {
  jest.resetAllMocks();
  // ao abrir a tela, a API devolve dois clientes
  api.get.mockResolvedValue({ data: [
    { id: 1, name: 'Ana Souza', phone: '47 99999-1111', email: 'ana@teste.com' },
    { id: 2, name: 'Bruno Lima', phone: '47 99999-2222', email: 'bruno@teste.com' }
  ] });
});

test('mostra os clientes que vieram da API', async () => {
  render(<Clients />);
  expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
  expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
});

test('cadastra um cliente novo', async () => {
  api.post.mockResolvedValueOnce({ data: { id: 3 } });
  const usuario = userEvent.setup();
  render(<Clients />);
  await screen.findByText('Ana Souza');

  await usuario.type(screen.getByLabelText('Nome'), 'Carla Dias');
  await usuario.type(screen.getByLabelText('Telefone'), '47 98888-0000');
  await usuario.click(screen.getByRole('button', { name: 'Cadastrar cliente' }));

  expect(api.post).toHaveBeenCalledWith('/clients', expect.objectContaining({ name: 'Carla Dias', phone: '47 98888-0000' }));
  // depois de salvar, o formulário fica vazio de novo
  expect(screen.getByLabelText('Nome')).toHaveValue('');
});

test('editar preenche o formulário e salva com PUT', async () => {
  api.put.mockResolvedValueOnce({ data: {} });
  const usuario = userEvent.setup();
  render(<Clients />);
  await screen.findByText('Ana Souza');

  await usuario.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
  expect(screen.getByText('Editar cliente')).toBeInTheDocument();
  expect(screen.getByLabelText('Nome')).toHaveValue('Ana Souza');

  await usuario.clear(screen.getByLabelText('Nome'));
  await usuario.type(screen.getByLabelText('Nome'), 'Ana Souza Silva');
  await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }));

  expect(api.put).toHaveBeenCalledWith('/clients/1', expect.objectContaining({ name: 'Ana Souza Silva' }));
});

test('remover pede confirmação e chama a API', async () => {
  api.delete.mockResolvedValueOnce({});
  window.confirm = jest.fn(() => true); // simula clicar em "OK" na pergunta
  const usuario = userEvent.setup();
  render(<Clients />);
  await screen.findByText('Ana Souza');

  await usuario.click(screen.getAllByRole('button', { name: 'Remover' })[1]);

  expect(window.confirm).toHaveBeenCalled();
  expect(api.delete).toHaveBeenCalledWith('/clients/2');
});

test('a busca manda o texto digitado para a API', async () => {
  const usuario = userEvent.setup();
  render(<Clients />);
  await screen.findByText('Ana Souza');

  await usuario.type(screen.getByPlaceholderText('Buscar por nome, telefone ou email'), 'Ana');
  await usuario.click(screen.getByRole('button', { name: 'Buscar' }));

  expect(api.get).toHaveBeenLastCalledWith('/clients', { params: { search: 'Ana' } });
});

test('se a API recusar, mostra a mensagem de erro', async () => {
  api.post.mockRejectedValueOnce({ response: { data: { message: 'Nome é obrigatório.' } } });
  const usuario = userEvent.setup();
  render(<Clients />);
  await screen.findByText('Ana Souza');

  await usuario.type(screen.getByLabelText('Nome'), 'X');
  await usuario.click(screen.getByRole('button', { name: 'Cadastrar cliente' }));

  expect(await screen.findByText('Nome é obrigatório.')).toBeInTheDocument();
});
