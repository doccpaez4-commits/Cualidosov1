import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Page from '@/app/page';
import { db } from '@/lib/db';

// Mock de Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock de Supabase
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      onAuthStateChange: (cb: any) => {
        cb('SIGNED_IN', { user: { id: 'test-user', email: 'test@example.com' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } } }),
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'test-user' } } } }),
    },
    storage: {
      from: () => ({
        list: () => Promise.resolve({ data: [], error: null }),
      }),
    },
  }),
}));

describe('Flujo de Eliminación de Proyectos (Integración)', () => {
  beforeEach(async () => {
    await db.projects.clear();
    // Insertar un proyecto de prueba
    await db.projects.add({
      id: 1,
      name: 'Proyecto de Prueba',
      lente: 'breilh',
      updatedAt: new Date(),
      createdAt: new Date(),
    });
  });

  it('debería mostrar el botón de confirmar en lugar de un alert nativo al intentar eliminar', async () => {
    render(<Page />);

    // Esperar a que el proyecto se cargue en la lista
    const projectTitle = await waitFor(() => screen.getByText('Proyecto de Prueba'));
    expect(projectTitle).toBeInTheDocument();

    // Buscar el botón de eliminar (basura)
    const trashBtn = screen.getByTitle('Eliminar proyecto');
    
    // Al hacer clic, NO debería llamar a window.confirm (que causaba parpadeo)
    // En su lugar, debería aparecer el texto "¿Seguro?" y los botones de confirmación
    fireEvent.click(trashBtn);

    const confirmMsg = screen.getByText('¿Seguro?');
    expect(confirmMsg).toBeInTheDocument();
    
    const deleteBtn = screen.getByText('Eliminar');
    const cancelBtn = screen.getByText('No');
    expect(deleteBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();

    // Si cancelamos, vuelve al estado inicial
    fireEvent.click(cancelBtn);
    expect(screen.queryByText('¿Seguro?')).not.toBeInTheDocument();
    expect(screen.getByTitle('Eliminar proyecto')).toBeInTheDocument();
  });

  it('debería ejecutar la eliminación correctamente al confirmar', async () => {
    render(<Page />);

    const trashBtn = await waitFor(() => screen.getByTitle('Eliminar proyecto'));
    fireEvent.click(trashBtn);

    const deleteBtn = screen.getByText('Eliminar');
    
    // Al confirmar la eliminación
    fireEvent.click(deleteBtn);

    // El proyecto debería desaparecer de la lista
    await waitFor(() => {
      expect(screen.queryByText('Proyecto de Prueba')).not.toBeInTheDocument();
    });

    // Verificar en la DB
    const projectInDb = await db.projects.get(1);
    expect(projectInDb).toBeUndefined();
  });
});
