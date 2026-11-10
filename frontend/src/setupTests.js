// Roda antes de todos os testes do frontend.
// Adiciona verificações como toBeInTheDocument() ("está aparecendo na tela?").
import '@testing-library/jest-dom';

// Cada teste começa com o "navegador" limpo (sem login salvo).
beforeEach(() => {
  localStorage.clear();
});
