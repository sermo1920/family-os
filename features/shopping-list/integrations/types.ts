/**
 * Extension point for exporting an internal shopping list to an external
 * service (FamilyWall, etc.). Intentionally NO implementation yet: FamilyWall
 * has no public API documented for this, and the app must never pretend a
 * list was synchronized. The internal list (ShoppingList/ShoppingListItem)
 * stays the source of truth; an exporter only pushes a snapshot of it.
 *
 * To add one: implement ShoppingListExporter in its own file (credentials read
 * server-side from env vars, never NEXT_PUBLIC_), register it in
 * `shoppingListExporters`, and only then surface it in the UI.
 */

export interface ExportableItem {
  name: string;
  quantity: number;
  /** Short unit label ("g", "ml", "pce", "paq"). */
  unit: string;
  category: string;
  isChecked: boolean;
}

export interface ExportResult {
  ok: boolean;
  /** Items actually accepted by the external service. */
  exportedCount: number;
  error?: string;
}

export interface ShoppingListExporter {
  id: string;
  label: string;
  /** True only when the required server-side credentials are present. */
  isConfigured(): boolean;
  exportList(input: {
    householdId: string;
    listName: string;
    items: ExportableItem[];
  }): Promise<ExportResult>;
}

export const shoppingListExporters: ShoppingListExporter[] = [];
