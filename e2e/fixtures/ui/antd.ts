/**
 * Ant Design–oriented Playwright helpers (B2B / ISC apps).
 *
 * VI: Import từ domain specs / implement skill — không gắn cứng 1 dự án.
 * EN: Shared selectors for Ant Design tables, modals, selects, search.
 *
 * @example
 * import { antd } from "../fixtures/ui/antd";
 * await antd.searchDebounced(page, "00280129");
 * await expect(antd.tableRows(page)).toHaveCount(1);
 */

import type { Locator, Page } from "@playwright/test";

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

  /** Open Ant Select by label or placeholder-ish click on selector. */
  async selectOption(
    page: Page,
    trigger: Locator,
    optionName: string | RegExp,
  ): Promise<void> {
    await trigger.click();
    await page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)").last().waitFor();
    await page.getByRole("option", { name: optionName }).click();
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
};

export default antd;
