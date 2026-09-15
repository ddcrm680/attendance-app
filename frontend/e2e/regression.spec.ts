import { expect, test, type Page } from "@playwright/test";

const accounts = {
  employee: { email: "meera.sales@example.com", password: "password123" },
  cameraEmployee: { email: "rohan.wfh@example.com", password: "password123" },
  mobileEmployee: { email: "kabir.ops@example.com", password: "password123" },
  admin: { email: "hr@example.com", password: "password123" },
};

async function signIn(page: Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(account.email);
  await page.getByPlaceholder("********").fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.afterEach(async ({ page }) => {
  const cameraDialog = page.getByLabel(/selfie camera$/);
  if (await cameraDialog.isVisible().catch(() => false)) {
    await cameraDialog.getByRole("button", { name: "Cancel" }).click();
  }

  const logout = page.getByRole("button", { name: "Log out" });
  if (!(await logout.isVisible().catch(() => false))) return;

  await logout.click();
  await expect(page).toHaveURL(/\/login$/);
});

test("employee login reaches the attendance dashboard with safe punch controls", async ({ page }) => {
  await signIn(page, accounts.employee);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Daily attendance" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Check in" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Check out" })).toBeDisabled();

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Daily attendance" })).toBeVisible();
});

test("invalid login displays the existing authentication error", async ({ page }) => {
  await signIn(page, { email: "invalid-user@example.com", password: "not-the-demo-password" });

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("form .app-feedback-error")).toHaveText("Invalid credentials");
});

test("admin reaches Employees and can use the non-destructive search", async ({ page }) => {
  await signIn(page, accounts.admin);

  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("link", { name: "Employees" }).click();
  await expect(page).toHaveURL(/\/admin\/employees$/);
  await expect(page.getByRole("heading", { name: "Employees" })).toBeVisible();

  const search = page.getByPlaceholder("Search name, code, or email");
  const rohan = page.getByRole("cell", { name: "Rohan Iyer", exact: true });
  await expect(rohan).toBeVisible();
  const searchResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.endsWith("/admin/employees")
      && url.searchParams.get("search") === "Alice Verma"
      && response.ok();
  });
  await search.fill("Alice Verma");
  await searchResponse;
  await expect(page.getByRole("cell", { name: "Alice Verma" })).toBeVisible();
  await expect(rohan).toHaveCount(0);
});

test("unavailable camera is shown without submitting a check-in", async ({ page }) => {
  const checkInRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/attendance/check-in")) checkInRequests.push(request.url());
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
  });

  await signIn(page, accounts.cameraEmployee);
  await page.getByRole("button", { name: "Check in" }).click();

  const cameraDialog = page.getByLabel("Punch in selfie camera");
  await expect(cameraDialog).toBeVisible();
  await expect(cameraDialog.getByRole("alert")).toHaveText(
    "Camera is unavailable on this browser. Attendance cannot be marked without a selfie.",
  );
  await expect(cameraDialog.getByRole("button", { name: "Take selfie" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Confirm selfie" })).toHaveCount(0);
  expect(checkInRequests).toEqual([]);
});

test.describe("mobile employee experience", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps attendance actions and bottom navigation available", async ({ page }) => {
    await signIn(page, accounts.mobileEmployee);

    await expect(page.getByRole("heading", { name: "Daily attendance" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Check in" })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Attendance" })).toBeVisible();
  });
});
