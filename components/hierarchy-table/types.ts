import { HierarchyItem } from '@/lib/config';

export interface TreeNode extends HierarchyItem {
  children?: TreeNode[];
  level: number;
  isExpanded?: boolean;
}

export interface ColumnConfig {
  id: string;
  header: string;
  accessorKey?: string;
  renderer?: 'link' | 'badge' | 'text' | 'custom';
  colorMap?: Record<string, string>;
  linkBuilder?: (item: HierarchyItem) => string;
  cell?: (props: { getValue: () => any; row: any; column: any }) => React.ReactNode;
  minWidth?: number;
  maxWidth?: number;
  /**
   * Initial/default width for the column.
   * This works with TanStack Table's column sizing and prevents columns from defaulting to maxWidth.
   */
  size?: number;
}

export interface HierarchyTableProps {
  data: HierarchyItem[];
  columns: ColumnConfig[];
  defaultExpanded?: boolean;
   /**
   * Optional controlled expanded state (by key). When provided, HierarchyTable will
   * use this state instead of its internal state.
   */
  expanded?: Record<string, boolean>;
  /**
   * Optional callback for controlled expanded state changes.
   */
  onExpandedChange?: (expanded: Record<string, boolean>) => void;
  onRowClick?: (item: HierarchyItem) => void;
  className?: string;
  /**
   * Whether to show the built-in global search input.
   * For the Epics Hierarchy page we disable it and use the ReportCard filters instead.
   */
  showControls?: boolean;
}


