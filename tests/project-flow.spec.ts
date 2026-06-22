import { expect, test, type Page } from "@playwright/test";

async function seedOnboarding(page: Page, withStyleProfile = false) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "flowstream.onboarding",
      JSON.stringify({
        businessType: "sonstiges",
        businessName: "Teststudio",
        tags: ["Studio", "Outdoor", "Business", "Detail", "Team", "Projekt"],
        completed: true,
        styleProfile: undefined
      })
    );
  });
  if (withStyleProfile) {
    await page.addInitScript(() => {
      const current = JSON.parse(window.localStorage.getItem("flowstream.onboarding") ?? "{}");
      current.styleProfile = {
        tone: "direkt",
        sentenceStyle: "kurze Sätze",
        address: "Du-Anrede",
        emojiDensity: "sparsam",
        opener: "mit klarer Aussage",
        closer: "gelegentlich mit Frage",
        traits: "direkt, bodenständig, persönlich",
        promptAddition: "Schreibe direkt, bodenständig und persönlich. Nutze kurze Sätze und Du-Anrede."
      };
      window.localStorage.setItem("flowstream.onboarding", JSON.stringify(current));
    });
  }
}

test("Login zeigt ohne Supabase-Konfiguration den Demo-Modus", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("button", { name: "Anmelden" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Konto erstellen" })).toBeDisabled();
});

test("gespeicherte Projekte werden beim Öffnen nicht überschrieben", async ({ page }) => {
  await page.goto("/projects");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "weddingflow.projects.v1",
      JSON.stringify([
        {
          id: "wf-test",
          coupleName: "Testpaar",
          weddingDate: "2026-06-14",
          location: "Koblach",
          style: "Modern",
          specialNotes: "",
          tone: "Warm",
          language: "DE",
          imageCount: 100,
          uploadedImageCount: 0,
          internalNotes: "",
          stage: "brief",
          favoriteCount: 0,
          tagCount: 0,
          createdAt: "2026-06-14T12:00:00.000Z"
        }
      ])
    );
  });

  await page.reload();
  await expect(page.getByText("Testpaar")).toBeVisible();

  const projects = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("weddingflow.projects.v1") ?? "[]")
  );
  expect(projects).toHaveLength(1);
  expect(projects[0].coupleName).toBe("Testpaar");
});

test("Startseite verkauft Postradamus mit Testphase", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Instagram, das einfach läuft. Vollautomatisch." })).toBeVisible();
  await expect(page.getByRole("link", { name: "14 Tage gratis testen" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Alle Preise ansehen" })).toBeVisible();
});

test("ein neues Projekt wird über das Formular angelegt", async ({ page }) => {
  await seedOnboarding(page);
  await page.goto("/projects/new");
  await page.getByRole("button", { name: "Mit Angaben starten" }).click();
  await page.getByLabel("Projektname").fill("Anna & Paul");
  await page.getByLabel("Datum").fill("2026-09-12");
  await page.getByLabel("Ort").fill("Feldkirch");
  await page.getByText("Weitere Angaben").click();
  await page.getByLabel("Geplante Bilder").fill("950");
  await page.getByRole("button", { name: "Weiter", exact: true }).click();

  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.getByRole("heading", { name: "Anna & Paul" })).toBeVisible();

  const storedProject = await page.evaluate(() => {
    const projects = JSON.parse(window.localStorage.getItem("weddingflow.projects.v1") ?? "[]");
    return projects.find((project: { coupleName: string }) => project.coupleName === "Anna & Paul");
  });
  expect(storedProject).toMatchObject({
    location: "Feldkirch",
    imageCount: 950,
    uploadedImageCount: 0,
    stage: "brief"
  });
});

test("ein Fotoprojekt kann ohne Paarangaben direkt gestartet werden", async ({ page }) => {
  await seedOnboarding(page);
  await page.goto("/projects/new");
  await page.getByRole("button", { name: "Nur Fotos hochladen" }).click();

  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.getByRole("heading", { name: /Fotoprojekt vom/ })).toBeVisible();
  await expect(page.getByText("Noch keine Angaben")).toBeVisible();
  await expect(page.getByText("Bilder auswählen")).toBeVisible();
  await page.getByRole("button", { name: "Authentisch" }).click();
  await expect(page.getByText("Wähle deinen Lieblingsstil.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Postingplan" })).toBeVisible();
  await expect(page.getByText("Wie oft soll gepostet werden?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Jetzt posten!" })).toBeVisible();
});

test("JPG-Upload, Favorit und Tags bleiben nach Reload erhalten", async ({ page }) => {
  await seedOnboarding(page);
  const runtimeErrors: Error[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error));

  await page.goto("/projects/wf-001");
  const imageBase64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 80;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Testbild konnte nicht erzeugt werden.");
    context.fillStyle = "#d9b99b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#0b1020";
    context.fillRect(20, 20, 80, 40);
    return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
  });
  const testImage = {
    name: "testbild.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(imageBase64, "base64")
  };
  await page.locator('input[type="file"]').setInputFiles(testImage);

  await expect(page.locator(".image-card")).toHaveCount(1);
  await expect(page.getByText("1 Bilder")).toBeVisible();
  expect(runtimeErrors).toEqual([]);

  const storedImageStats = await page.evaluate(
    () =>
      new Promise<{ count: number; hasOriginal: boolean }>((resolve, reject) => {
        const request = indexedDB.open("weddingflow");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("project-images", "readonly");
          const store = transaction.objectStore("project-images");
          const countRequest = store.count();
          const allRequest = store.getAll();
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            const images = allRequest.result as Array<{ original?: Blob }>;
            resolve({
              count: countRequest.result,
              hasOriginal: images.some((image) => image.original instanceof Blob && image.original.size > 0)
            });
            database.close();
          };
        };
      })
  );
  expect(storedImageStats).toMatchObject({ count: 1, hasOriginal: true });
  expect(await page.evaluate(() => window.localStorage.getItem("weddingflow.project-images.v1"))).toBeNull();

  await page.getByRole("button", { name: "Favorit", exact: true }).click();
  await page.getByRole("button", { name: "Detail" }).click();
  await expect(page.getByRole("button", { name: "✓ Favorit", exact: true })).toHaveClass(/is-active/);
  await expect(page.getByRole("button", { name: "Detail" })).toHaveClass(/is-active/);

  await page.reload();
  await expect(page.locator(".image-card")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "✓ Favorit", exact: true })).toHaveClass(/is-active/);
  await expect(page.getByRole("button", { name: "Detail" })).toHaveClass(/is-active/);

  await page.goto("/projects");
  await expect(page.getByText("1 Bild")).toBeVisible();
});

test("Demo-Content wird erzeugt und der Postingplan wird angezeigt", async ({ page }) => {
  await seedOnboarding(page);
  // Create a project first
  await page.goto("/projects/new");
  await page.getByRole("button", { name: "Nur Fotos hochladen" }).click();
  await expect(page).toHaveURL(/\/projects\/wf-[a-f0-9-]+/);

  // Extract project ID from URL
  const projectUrl = page.url();
  const projectId = projectUrl.split("/").pop()!;

  // Generate demo content by choosing a style.
  await page.getByRole("button", { name: "Authentisch" }).click();
  await expect(page.getByRole("heading", { name: "Postingplan" })).toBeVisible();
  await expect(page.getByText("Wie oft soll gepostet werden?")).toBeVisible();
  await expect(page.getByText("Jeder Post bleibt bearbeitbar.")).toBeVisible();

  const storedOutputs = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("weddingflow.project-outputs.v1") ?? "[]")
  );
  expect(storedOutputs).toHaveLength(1);
  expect(storedOutputs[0]).toMatchObject({
    projectId,
    type: "instagram_caption",
    generator: "demo"
  });

  // Verify the posting preview stays available.
  await expect(page.getByRole("heading", { name: "Postingplan" })).toBeVisible();

  // Verify the saved content persists
  await page.goto(`/projects/${projectId}`);
  await expect(page.getByRole("heading", { name: "Postingplan" })).toBeVisible();
});

test("Caption wird nur einmal erzeugt und reagiert auf Stilwechsel", async ({ page }) => {
  await seedOnboarding(page, true);

  const analyzeRequests: string[] = [];
  const retoneRequests: string[] = [];
  let legacyVisionRequests = 0;
  await page.route("**/api/generate-vision", async (route) => {
    legacyVisionRequests++;
    await route.fulfill({ json: { content: "Diese veraltete Caption darf nie erscheinen." } });
  });
  await page.route("**/api/analyze-post", async (route) => {
    const body = route.request().postData() ?? "";
    analyzeRequests.push(body);
    const isFunny = body.includes('"tone":"lustig"');
    const requestNumber = analyzeRequests.length;
    await route.fulfill({
      json: {
        caption: isFunny ? "Lustige Test-Caption 😄" : `Authentische Test-Caption ${requestNumber}`,
        hashtags: "#eins #zwei #drei #vier #fuenf #sechs #sieben #acht",
        summary: "Testmotiv",
        generator: "openai-vision"
      }
    });
  });
  await page.route("**/api/retone", async (route) => {
    const body = route.request().postData() ?? "";
    retoneRequests.push(body);
    await route.fulfill({
      json: {
        caption: "Lustige Test-Caption 😄",
        hashtags: "#eins #zwei #drei #vier #fuenf #sechs #sieben #acht"
      }
    });
  });

  await page.goto("/projects/new");
  await page.getByRole("button", { name: "Nur Fotos hochladen" }).click();

  const imageBase64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 80;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Testbild konnte nicht erzeugt werden.");
    context.fillStyle = "#d9b99b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
  });
  await page.locator('input[type="file"]').setInputFiles(
    Array.from({ length: 7 }, (_, index) => ({
      name: `caption-test-${index + 1}.jpg`,
      mimeType: "image/jpeg",
      buffer: Buffer.from(imageBase64, "base64")
    }))
  );

  await page.getByRole("button", { name: "Authentisch" }).click();
  await expect(page.getByText("Authentische Test-Caption 1").first()).toBeVisible();
  await expect.poll(() => analyzeRequests.length).toBeGreaterThanOrEqual(3);
  expect(analyzeRequests.some((body) =>
    body.includes("VERBINDLICHER") ||
    body.includes("direkt, bodenständig und persönlich")
  )).toBe(true);
  expect(analyzeRequests.some((body) =>
    body.includes("previousCaptions") &&
    body.includes("Authentische Test-Caption")
  )).toBe(true);
  expect(analyzeRequests.some((body) => body.includes('"includeCta":true'))).toBe(true);
  expect(legacyVisionRequests).toBe(0);

  await page.getByRole("button", { name: "Lustig" }).first().click();
  await expect(page.getByText("Lustige Test-Caption 😄").first()).toBeVisible();
  expect(retoneRequests.some((body) => body.includes('"tone":"lustig"'))).toBe(true);
  expect(legacyVisionRequests).toBe(0);
});
