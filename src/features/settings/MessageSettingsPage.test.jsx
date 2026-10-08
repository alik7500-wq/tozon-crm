import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MessageSettingsPage } from "./MessageSettingsPage";
import { api } from "../../api/client";
vi.mock("../../api/client", () => ({ api: { get: vi.fn(), put: vi.fn() } }));
const rule = {
  event_type: "PAYMENT_REMINDER",
  group_name: "Задолженность",
  name: "До дня оплаты",
  template_code: "PAYMENT_REMINDER",
  enabled: true,
  mode: "INHERIT",
  offset_days: 3,
  repeat_days: 7,
  version: 1,
};
const template = {
  id: 1,
  code: "PAYMENT_REMINDER",
  name: "Напоминание",
  text: "Здравствуйте, {{client_name}}",
  is_active: true,
  updated_at: "2026-10-08T00:00:00Z",
  variables: ["client_name"],
};
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  api.get.mockResolvedValue({
    data: {
      rules: [rule],
      templates: [template],
      system: { automaticEnabled: true, batchLimit: 1 },
    },
  });
});
it("loads persisted settings and toggles using version guard without sending SMS", async () => {
  api.put.mockResolvedValue({ data: { ...rule, enabled: false, version: 2 } });
  render(
    <MemoryRouter>
      <MessageSettingsPage />
    </MemoryRouter>,
  );
  const toggle = await screen.findByRole("switch", { name: "До дня оплаты" });
  fireEvent.click(toggle);
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith(
      "/sms/settings/rules/PAYMENT_REMINDER",
      expect.objectContaining({
        enabled: false,
        version: 1,
        offset_days: 3,
        mode: "INHERIT",
      }),
    ),
  );
  expect(api.put.mock.calls.every(([url]) => !url.includes("/send"))).toBe(
    true,
  );
});
it("edits stored template, preserves placeholders and reports server conflicts", async () => {
  api.put.mockRejectedValue(
    new Error("Шаблон уже изменён. Обновите страницу."),
  );
  render(
    <MemoryRouter>
      <MessageSettingsPage />
    </MemoryRouter>,
  );
  await screen.findByRole("switch");
  fireEvent.click(screen.getByText("Шаблоны сообщений"));
  fireEvent.click(screen.getByText("Изменить"));
  fireEvent.change(screen.getByRole("textbox", { name: "Текст сообщения" }), {
    target: { value: "Добрый день, {{client_name}}!" },
  });
  fireEvent.click(screen.getByText("Сохранить шаблон"));
  await screen.findByRole("alert");
  expect(api.put).toHaveBeenCalledWith(
    "/sms/settings/templates/1",
    expect.objectContaining({
      text: "Добрый день, {{client_name}}!",
      updated_at: template.updated_at,
    }),
  );
  expect(screen.getByRole("textbox", { name: "Текст сообщения" }).value).toBe(
    "Добрый день, {{client_name}}!",
  );
});
