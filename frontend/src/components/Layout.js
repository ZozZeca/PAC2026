import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Márcia Atelier</h1>
        <p className="subtitle">Bolos & Macarons</p>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/clientes">Clientes</NavLink>
          <NavLink to="/pedidos">Pedidos</NavLink>
          <NavLink to="/produtos">Produtos & Receitas</NavLink>
          <NavLink to="/producao">Produção Diária</NavLink>
        </nav>
        <div className="sidebar-footer">
          <span>{user?.name}</span>
          <button onClick={handleLogout}>Sair</button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
