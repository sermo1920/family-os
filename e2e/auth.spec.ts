import { test, expect } from "@playwright/test";

// Ces tests couvrent le vrai périmètre du contrôle d'accès (proxy.ts +
// Supabase Auth) sans dépendre d'un compte de test préconfirmé par e-mail :
// créer un compte Supabase confirmé nécessiterait une clé d'administration
// (secret key) qu'on ne veut pas manipuler dans une suite de tests locale.
// Un test couvrant signup → planning → liste de courses avec un vrai compte
// est un bon candidat pour plus tard, une fois un utilisateur de test dédié
// mis en place via cette clé.

test("un visiteur non connecté est redirigé vers /sign-in", async ({
  page,
}) => {
  await page.goto("/household");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("le formulaire d'inscription refuse un mot de passe trop court", async ({
  page,
}) => {
  await page.goto("/sign-up");

  await page.getByLabel("Ton prénom").fill("Test");
  await page.getByLabel("E-mail").fill("test@example.com");
  const password = page.getByLabel("Mot de passe");
  await password.fill("short");

  await page.getByRole("button", { name: "Créer mon compte" }).click();

  // Validation HTML5 (minLength=8) : le formulaire ne doit jamais être
  // soumis, on reste sur /sign-up.
  await expect(page).toHaveURL(/\/sign-up$/);
  await expect(password).toHaveJSProperty("validity.valid", false);
});

test("le formulaire de connexion affiche une erreur pour des identifiants invalides", async ({
  page,
}) => {
  await page.goto("/sign-in");

  await page.getByLabel("E-mail").fill("nobody-e2e@example.com");
  await page.getByLabel("Mot de passe").fill("wrong-password-123");
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(page.getByText(/invalid|incorrect|identifiants/i)).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
});
