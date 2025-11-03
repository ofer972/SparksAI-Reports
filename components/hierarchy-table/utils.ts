import { HierarchyItem } from '@/lib/config';
import { TreeNode } from './types';

/**
 * Convert flat array with parent references to a tree structure
 */
export function buildTree(items: HierarchyItem[]): TreeNode[] {
  const itemMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('Building tree from items:', items);
  }

  // First pass: create all nodes
  items.forEach(item => {
    itemMap.set(item.key, {
      ...item,
      children: [],
      level: 0,
      isExpanded: false,
    });
  });

  // Second pass: build parent-child relationships
  items.forEach(item => {
    const node = itemMap.get(item.key)!;
    
    if (item.parent && itemMap.has(item.parent)) {
      const parent = itemMap.get(item.parent)!;
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(node);
      node.level = parent.level + 1;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Added child ${item.key} to parent ${item.parent}`);
      }
    } else {
      roots.push(node);
      if (process.env.NODE_ENV === 'development') {
        console.log(`Added root item: ${item.key}, parent was: ${item.parent}`);
      }
    }
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('Tree roots:', roots);
    console.log('Roots with children:', roots.filter(r => r.children && r.children.length > 0));
  }

  // Sort children by key for consistent display
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a, b) => a.key.localeCompare(b.key));
        sortChildren(node.children);
      }
    });
  };

  sortChildren(roots);
  return roots;
}

/**
 * Flatten tree structure for table display (maintaining hierarchy with indentation)
 */
export function flattenTree(
  nodes: TreeNode[],
  expandedKeys: Set<string> = new Set(),
  result: TreeNode[] = []
): TreeNode[] {
  nodes.forEach(node => {
    result.push(node);
    
    if (node.children && node.children.length > 0) {
      const isExpanded = expandedKeys.has(node.key);
      if (isExpanded) {
        flattenTree(node.children, expandedKeys, result);
      }
    }
  });

  return result;
}

/**
 * Extract all unique column keys from items
 */
export function getColumnKeys(items: HierarchyItem[]): string[] {
  const keys = new Set<string>();
  items.forEach(item => {
    Object.keys(item).forEach(key => {
      if (key !== 'key' && key !== 'parent') {
        keys.add(key);
      }
    });
  });
  return Array.from(keys).sort();
}

/**
 * Get status color mapping
 */
export function getStatusColor(status: string): string {
  const statusLower = (status || '').toLowerCase();
  
  const colorMap: Record<string, string> = {
    'done': 'bg-green-100 text-green-800 border-green-200',
    'closed': 'bg-gray-100 text-gray-800 border-gray-200',
    'cancelled': 'bg-red-100 text-red-800 border-red-200',
    'in progress': 'bg-blue-100 text-blue-800 border-blue-200',
    'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
    'in_progress': 'bg-blue-100 text-blue-800 border-blue-200',
    'to do': 'bg-blue-100 text-blue-800 border-blue-200',
    'todo': 'bg-blue-100 text-blue-800 border-blue-200',
    'open': 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return colorMap[statusLower] || 'bg-gray-100 text-gray-800 border-gray-200';
}

/**
 * Get status category color mapping (specific colors for Done, To Do, In Progress)
 */
export function getStatusCategoryColor(statusCategory: string): string {
  const categoryLower = (statusCategory || '').toLowerCase();
  
  if (categoryLower === 'done') {
    return 'bg-green-100 text-green-800 border-green-200';
  } else if (categoryLower === 'in progress' || categoryLower === 'in-progress' || categoryLower === 'in_progress') {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  } else if (categoryLower === 'to do' || categoryLower === 'todo') {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }
  
  return 'bg-gray-100 text-gray-800 border-gray-200';
}

/**
 * Get progress color based on percentage
 */
export function getProgressColor(progress: number | string | null | undefined): string {
  const progressNum = typeof progress === 'number' ? progress : (typeof progress === 'string' ? parseFloat(progress) : 0);
  
  if (progressNum === 100) {
    return 'text-green-600 font-semibold';
  }
  
  return 'text-gray-700';
}

/**
 * Get type color mapping
 */
export function getTypeColor(type: string): string {
  const typeLower = (type || '').toLowerCase();
  
  const colorMap: Record<string, string> = {
    'epic': 'bg-purple-100 text-purple-800 border-purple-200',
    'story': 'bg-blue-100 text-blue-800 border-blue-200',
    'task': 'bg-green-100 text-green-800 border-green-200',
    'bug': 'bg-red-100 text-red-800 border-red-200',
  };

  return colorMap[typeLower] || 'bg-gray-100 text-gray-800 border-gray-200';
}

