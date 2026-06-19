import axios from 'axios';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('axios', () => {
  const mockApi = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };

  return {
    __esModule: true,
    default: {
      create: () => mockApi,
    },
  };
});

const mockApi = axios.create();

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.get.mockImplementation((url) => {
    if (url === '/dashboard/resumen') {
      return Promise.resolve({
        data: {
          total_pacientes: 0,
          total_medicos: 0,
          total_citas: 0,
          citas_por_estado: [],
        },
      });
    }

    return Promise.resolve({ data: [] });
  });
});

test('renderiza el dashboard y permite abrir pacientes', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /dashboard general/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /pacientes/i }));

  expect(screen.getByRole('heading', { name: /gestion de pacientes/i })).toBeInTheDocument();

  await waitFor(() => {
    expect(mockApi.get).toHaveBeenCalledWith('/dashboard/resumen');
    expect(mockApi.get).toHaveBeenCalledWith('/pacientes');
    expect(mockApi.get).toHaveBeenCalledWith('/medicos');
    expect(mockApi.get).toHaveBeenCalledWith('/citas');
  });
});
