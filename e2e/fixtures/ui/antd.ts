/**
 * Ant Design–oriented Playwright helpers (B2B / ISC apps).
 *
 * VI: Import từ domain specs / implement skill — không gắn cứng 1 dự án.
 * EN: Shared selectors for Ant Design tables, modals, selects, search, forms.
 *
 * @example
 * import { antd } from "../fixtures/ui/antd";
 * await antd.searchDebounced(page, "00280129");
 * await expect(antd.tableRows(page)).toHaveCount(1);
 * await antd.expectMessageSuccess(page);
 */

import { expect, type Locator, type Page } from "@playwright/test";

export const antd = {
  /** Data rows in the primary table (excludes measure/expanded rows). */
  tableRows(page: Page): Locator {
    return page.locator(".ant-table-tbody tr.ant-table-row");
  },

  tableRowByText(page: Page, text: string | RegExp): Locator {
    return antd.tableRows(page).filter({ hasText: text });
  },

  /** Active modal / dialog (Ant Design 5+). */
  modal(page: Page): Locator {
    return page.locator(".ant-modal-wrap:not(.ant-modal-wrap-hidden) .ant-modal").last();
  },

  modalOk(page: Page): Locator {
    return antd.modal(page).locator(".ant-modal-footer .ant-btn-primary");
  },

  modalCancel(page: Page): Locator {
    return antd.modal(page).locator(".ant-modal-footer .ant-btn-default").first();
  },

  /** Confirm modal (Popconfirm / Modal.confirm). */
  confirmOk(page: Page): Locator {
    return page.locator(".ant-modal-confirm-btns .ant-btn-primary");
  },

  confirmCancel(page: Page): Locator {
    return page.locator(".ant-modal-confirm-btns .ant-btn-default");
  },

  /** Open Ant Design Drawer (right/left panel). */
  drawer(page: Page): Locator {
    return page.locator(".ant-drawer-open .ant-drawer-content-wrapper, .ant-drawer-content-wrapper-open").last();
  },

  drawerClose(page: Page): Locator {
    return antd.drawer(page).locator(".ant-drawer-close").first();
  },

  /**
   * Form item by label text (Ant Form.Item).
   * Prefer for fill/select inside create-edit drawers/modals.
   */
  formItem(page: Page, label: string | RegExp, root?: Locator): Locator {
    const scope = root ?? page.locator("body");
    return scope.locator(".ant-form-item").filter({ hasText: label }).first();
  },

  /** Input / textarea inside a labeled Form.Item. */
  formInput(page: Page, label: string | RegExp, root?: Locator): Locator {
    return antd
      .formItem(page, label, root)
      .locator("input:not([type=hidden]), textarea, .ant-input")
      .first();
  },

  async fillFormField(
    page: Page,
    label: string | RegExp,
    value: string,
    opts?: { root?: Locator; clear?: boolean },
  ): Promise<void> {
    const input = antd.formInput(page, label, opts?.root);
    if (opts?.clear !== false) await input.fill("");
    await input.fill(value);
  },

  /**
   * Upload via Ant Upload — sets files on the hidden input[type=file].
   * `files` = absolute paths or Playwright file payloads.
   */
  async uploadFiles(
    page: Page,
    files: string | string[] | { name: string; mimeType: string; buffer: Buffer }[],
    opts?: { root?: Locator; input?: Locator },
  ): Promise<void> {
    const root = opts?.root ?? page.locator("body");
    const input =
      opts?.input ??
      root.locator(".ant-upload input[type=file], input[type=file]").first();
    await input.setInputFiles(files as never);
  },

  /**
   * Fill search input (placeholder or role) then wait for debounce.
   * Default 350ms covers common B2BSearch 300ms debounce.
   */
  async searchDebounced(
    page: Page,
    value: string,
    opts?: { placeholder?: string | RegExp; debounceMs?: number },
  ): Promise<void> {
    const debounceMs = opts?.debounceMs ?? 350;
    const placeholder = opts?.placeholder ?? /mã|tên|search|tìm/i;
    const input = page.getByPlaceholder(placeholder).first();
    await input.fill(value);
    await page.waitForTimeout(debounceMs);
  },

  /** Open Ant Select by trigger locator, then pick option by name. */
  async selectOption(
    page: Page,
    trigger: Locator,
    optionName: string | RegExp,
  ): Promise<void> {
    await trigger.click();
    await page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)").last().waitFor();
    await page.getByRole("option", { name: optionName }).click();
  },

  /** Select inside a labeled Form.Item. */
  async selectFormOption(
    page: Page,
    label: string | RegExp,
    optionName: string | RegExp,
    opts?: { root?: Locator },
  ): Promise<void> {
    const trigger = antd
      .formItem(page, label, opts?.root)
      .locator(".ant-select-selector, .ant-select")
      .first();
    await antd.selectOption(page, trigger, optionName);
  },

  paginationItem(page: Page, n: number): Locator {
    return page.locator(`.ant-pagination-item-${n}`);
  },

  paginationActive(page: Page): Locator {
    return page.locator(".ant-pagination-item-active");
  },

  /** Switch / toggle by nearby text or locator. */
  switch(page: Page, name?: string | RegExp): Locator {
    if (name) return page.getByRole("switch", { name });
    return page.locator(".ant-switch").first();
  },

  messageSuccess(page: Page): Locator {
    return page.locator(".ant-message-success, .ant-notification-notice-success");
  },

  messageError(page: Page): Locator {
    return page.locator(".ant-message-error, .ant-notification-notice-error");
  },

  messageInfo(page: Page): Locator {
    return page.locator(".ant-message-info, .ant-notification-notice-info");
  },

  /** Assert success toast/notification is visible (optional text match). */
  async expectMessageSuccess(
    page: Page,
    text?: string | RegExp,
    opts?: { timeout?: number },
  ): Promise<void> {
    const loc = antd.messageSuccess(page);
    await expect(loc.first()).toBeVisible({ timeout: opts?.timeout ?? 10_000 });
    if (text) await expect(loc.first()).toContainText(text);
  },

  /** Assert error toast/notification is visible (optional text match). */
  async expectMessageError(
    page: Page,
    text?: string | RegExp,
    opts?: { timeout?: number },
  ): Promise<void> {
    const loc = antd.messageError(page);
    await expect(loc.first()).toBeVisible({ timeout: opts?.timeout ?? 10_000 });
    if (text) await expect(loc.first()).toContainText(text);
  },
};

export default antd;
