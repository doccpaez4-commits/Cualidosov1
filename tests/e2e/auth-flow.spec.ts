import { test, expect } from '@playwright/test';

test.describe('Flujos de Usuario y Límites de Proyecto', () => {
  
  test('Debería redireccionar al Login si no hay sesión', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h1')).toContainText('Desbloquear Cualidoso');
  });

  test('Muestra error correcto si credenciales son inválidas', async ({ page }) => {
    await page.goto('/login');
    // Clic en la tab de inicio de sesión si por defecto está en registro
    const switchBtn = page.getByText('¿Ya tienes cuenta? Inicia sesión');
    if (await switchBtn.isVisible()) {
      await switchBtn.click();
    }

    await page.getByPlaceholder('Correo electrónico').fill('inexistente@test.com');
    await page.getByPlaceholder('Contraseña').fill('123456');
    await page.getByRole('button', { name: 'Desbloquear' }).click();

    await expect(page.locator('text=Invalid login credentials')).toBeVisible({ timeout: 10000 });
  });
});
