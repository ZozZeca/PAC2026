// Testes da proteção das páginas: sem login, ninguém vê o sistema.

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import PrivateRoute from '../components/PrivateRoute';
import Layout from '../components/Layout';

jest.mock('../api/client', () => ({ get: jest.fn(), post: jest.fn() }));

function desenharTela() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<p>Tela de login</p>} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout><p>Conteúdo protegido</p></Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

test('sem login, manda para a tela de login', () => {
  desenharTela();
  expect(screen.getByText('Tela de login')).toBeInTheDocument();
  expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
});

test('com login, mostra a página e o menu com o nome do usuário', () => {
  localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Márcia' }));
  desenharTela();
  expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
  expect(screen.getByText('Márcia')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Clientes' })).toBeInTheDocument();
});

test('o botão Sair apaga o login e volta para a tela de login', async () => {
  localStorage.setItem('token', 'token-de-teste');
  localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Márcia' }));
  const usuario = userEvent.setup();
  desenharTela();

  await usuario.click(screen.getByRole('button', { name: 'Sair' }));

  expect(screen.getByText('Tela de login')).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
});
