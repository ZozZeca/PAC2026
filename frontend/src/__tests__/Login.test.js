// Testes da tela de login.
// A Testing Library desenha a tela "de mentira" e age como um usuário:
// digita nos campos, clica nos botões e confere o que aparece.

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Login from '../pages/Login';
import api from '../api/client';

// Troca a API de verdade (axios) por uma de mentira: nada vai para o backend.
jest.mock('../api/client', () => ({ get: jest.fn(), post: jest.fn() }));

function desenharTela() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<p>Página inicial</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

beforeEach(() => {
  api.post.mockReset();
});

test('mostra os campos de email e senha', () => {
  desenharTela();
  expect(screen.getByLabelText('Email')).toBeInTheDocument();
  expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
});

test('login certo salva o token e vai para a página inicial', async () => {
  api.post.mockResolvedValueOnce({
    data: { token: 'token-de-teste', user: { id: 1, name: 'Márcia' } }
  });
  const usuario = userEvent.setup();
  desenharTela();

  await usuario.type(screen.getByLabelText('Email'), 'marcia@teste.com');
  await usuario.type(screen.getByLabelText('Senha'), 'qualquer');
  await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

  // mandou email e senha para a rota de login da API
  expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'marcia@teste.com', password: 'qualquer' });
  // guardou o token no navegador
  expect(localStorage.getItem('token')).toBe('token-de-teste');
  // e foi para a página inicial
  expect(await screen.findByText('Página inicial')).toBeInTheDocument();
});

test('login errado mostra a mensagem de erro da API', async () => {
  api.post.mockRejectedValueOnce({ response: { data: { message: 'Credenciais inválidas.' } } });
  const usuario = userEvent.setup();
  desenharTela();

  await usuario.type(screen.getByLabelText('Email'), 'marcia@teste.com');
  await usuario.type(screen.getByLabelText('Senha'), 'errada');
  await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

  expect(await screen.findByText('Credenciais inválidas.')).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
});
