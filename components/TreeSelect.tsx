'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getGroupsHierarchy, getAllTeams, type Group, type Team } from '@/lib/teams-service';

interface TreeNode {
  id: string;
  type: 'group' | 'team';
  name: string;
  data: Group | Team;
  children: TreeNode[];
}

interface TreeSelectProps {
  selectedValue: string | null; // Can be "group:ID" or "team:ID" or team name
  onSelect: (value: string | null, label: string, type: 'group' | 'team') => void;
  placeholder?: string;
}

export default function TreeSelect({ selectedValue, onSelect, placeholder = 'Select team or group' }: TreeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMounted(true);
    // Fetch groups and teams
    const fetchData = async () => {
      try {
        const [groupsData, teamsData] = await Promise.all([
          getGroupsHierarchy(),
          getAllTeams(),
        ]);
        setGroups(groupsData);
        setTeams(teamsData);

        // Debug: Log the structure to understand what we're getting
        if (process.env.NODE_ENV === 'development') {
          console.log('[TreeSelect] Groups:', groupsData);
          console.log('[TreeSelect] Teams sample:', teamsData.slice(0, 2));
          if (teamsData.length > 0) {
            console.log('[TreeSelect] First team structure:', teamsData[0]);
            console.log('[TreeSelect] First team group_key:', (teamsData[0] as any).group_key);
            console.log('[TreeSelect] First team group_keys:', (teamsData[0] as any).group_keys);
          }
        }
      } catch (err) {
        console.error('Error fetching groups/teams:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Prevent body scroll and handle escape key when dropdown is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };

      document.addEventListener('keydown', handleEscape);

      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  const tree = useMemo(() => {
    const groupMap = new Map<number, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Create group nodes
    groups.forEach(group => {
      const node: TreeNode = {
        id: `group:${group.id}`,
        type: 'group',
        name: group.name,
        data: group,
        children: [],
      };
      groupMap.set(group.id, node);
    });

    // Build group hierarchy
    groups.forEach(group => {
      const node = groupMap.get(group.id);
      if (!node) return;

      if (group.parent_id !== null && group.parent_id !== undefined) {
        const parent = groupMap.get(group.parent_id);
        if (parent) {
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Add teams to their groups or as unassigned
    // Following SparksAI-UI pattern exactly - handle both group_keys (array) and group_key (singular)
    teams.forEach(team => {
      // Check if team has group_keys array (many-to-many like SparksAI-UI) or group_key (one-to-one)
      // The API might return either format, so we check both
      const teamData = team as any;
      let groupKeys: number[] = [];

      // First check for group_keys array (SparksAI-UI format)
      if (teamData.group_keys && Array.isArray(teamData.group_keys) && teamData.group_keys.length > 0) {
        groupKeys = teamData.group_keys.filter((key: any) => key != null).map((key: any) => Number(key));
      }
      // Then check for group_key singular (Reports format)
      else if (team.group_key !== null && team.group_key !== undefined && team.group_key !== 0) {
        groupKeys = [Number(team.group_key)];
      }

      if (groupKeys.length > 0) {
        // Add this team to each of its groups (following SparksAI-UI pattern exactly)
        groupKeys.forEach((groupKey: number) => {
          const teamNode: TreeNode = {
            id: `team:${team.team_key}`,
            type: 'team',
            name: team.team_name,
            data: team,
            children: [],
          };

          const group = groupMap.get(groupKey);
          if (group) {
            group.children.push(teamNode);
            // Debug logging
            if (process.env.NODE_ENV === 'development') {
              console.log(`[TreeSelect] Added team "${team.team_name}" to group "${group.name}" (key: ${groupKey})`);
            }
          } else {
            // Group doesn't exist in map, add to roots
            if (process.env.NODE_ENV === 'development') {
              console.warn(`[TreeSelect] Team "${team.team_name}" has group_key ${groupKey} but group not found in map. Available group IDs:`, Array.from(groupMap.keys()));
            }
            rootNodes.push(teamNode);
          }
        });
      } else {
        // Team has no groups, add to unassigned section at root
        const teamNode: TreeNode = {
          id: `team:${team.team_key}`,
          type: 'team',
          name: team.team_name,
          data: team,
          children: [],
        };
        rootNodes.push(teamNode);
        if (process.env.NODE_ENV === 'development') {
          console.log(`[TreeSelect] Team "${team.team_name}" has no group_key, adding to root`);
        }
      }
    });

    return rootNodes;
  }, [groups, teams]);

  const toggleGroupExpansion = (groupId: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleSelect = (node: TreeNode) => {
    if (node.type === 'group') {
      const group = node.data as Group;
      onSelect(`group:${group.id}`, group.name, 'group');
    } else {
      const team = node.data as Team;
      onSelect(`team:${team.team_key}`, team.team_name, 'team');
    }
    setIsOpen(false);
  };

  const getSelectedLabel = (): string => {
    if (!selectedValue) return placeholder;

    // Handle both formats: "group:ID"/"team:ID" or just team name (for backward compatibility)
    if (selectedValue.includes(':')) {
      const [type, idStr] = selectedValue.split(':');
      const id = parseInt(idStr, 10);

      if (type === 'group') {
        const group = groups.find(g => g.id === id);
        return group ? `📁 ${group.name}` : placeholder;
      } else {
        const team = teams.find(t => t.team_key === id);
        return team ? `👥 ${team.team_name}` : placeholder;
      }
    } else {
      // Backward compatibility: treat as team name
      const team = teams.find(t => t.team_name === selectedValue);
      return team ? `👥 ${team.team_name}` : `👥 ${selectedValue}`;
    }
  };

  const handleToggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
    setIsOpen(!isOpen);
  };

  // Calculate if dropdown should open above or below
  const getDropdownPosition = () => {
    if (!buttonRect) return { top: '0px', bottom: 'auto' };

    const dropdownMaxHeight = 384;
    const spacing = 8;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    if (spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow) {
      return {
        bottom: `${viewportHeight - buttonRect.top + spacing}px`,
        top: 'auto',
      };
    }

    return {
      top: `${buttonRect.bottom + spacing}px`,
      bottom: 'auto',
    };
  };

  const renderDropdownContent = () => {
    if (!isOpen || !buttonRect || !isMounted) return null;

    const position = getDropdownPosition();

    const dropdownContent = (
      <>
        <div
          className="fixed inset-0 z-[10000]"
          style={{ pointerEvents: 'auto', cursor: 'default' }}
          onClick={() => setIsOpen(false)}
        />
        <div
          ref={dropdownRef}
          className="fixed z-[10001] bg-white border border-gray-300 rounded-lg shadow-2xl max-h-96"
          style={{
            ...position,
            left: `${buttonRect.left}px`,
            minWidth: `${buttonRect.width}px`,
            maxWidth: '400px',
            pointerEvents: 'auto',
            overflowX: 'auto',
            overflowY: 'auto',
          }}
        >
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : tree.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No groups or teams available</div>
          ) : (
            <>
              <div
                className={`px-3 py-2 hover:bg-gray-50 cursor-pointer ${
                  !selectedValue ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  onSelect(null, placeholder, 'team');
                  setIsOpen(false);
                }}
              >
                <span className={`text-sm ${!selectedValue ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
                  All Teams
                </span>
              </div>
              <div className="border-t border-gray-200"></div>
              {tree.map(node => renderNode(node, 0))}
            </>
          )}
        </div>
      </>
    );

    return createPortal(dropdownContent, document.body);
  };

  const renderNode = (node: TreeNode, depth: number = 0): JSX.Element => {
    if (node.type === 'group') {
      const group = node.data as Group;
      const isExpanded = expandedGroups.has(group.id);
      const hasChildren = node.children.length > 0;
      const isSelected = selectedValue === node.id;

      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer whitespace-nowrap ${
              isSelected ? 'bg-blue-50' : ''
            }`}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) {
                  toggleGroupExpansion(group.id, e);
                }
              }}
              className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${
                hasChildren ? '' : 'invisible'
              }`}
            >
              {hasChildren && (
                <svg
                  className={`w-3 h-3 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>

            <div
              onClick={() => handleSelect(node)}
              className="flex items-center gap-2 flex-1"
            >
              <span className="flex-shrink-0">📁</span>
              <span className={`text-sm flex-shrink-0 ${isSelected ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
                {group.name}
              </span>
            </div>
          </div>

          {isExpanded && hasChildren && (
            <div>
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      const team = node.data as Team;
      const isSelected = selectedValue === node.id || selectedValue === team.team_name;

      return (
        <div
          key={node.id}
          className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer whitespace-nowrap ${
            isSelected ? 'bg-blue-50' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 28}px` }}
          onClick={() => handleSelect(node)}
        >
          <span className="flex-shrink-0">👥</span>
          <span className={`text-sm flex-shrink-0 ${isSelected ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
            {team.team_name}
          </span>
        </div>
      );
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggleOpen}
        className="w-full px-4 py-1 bg-white border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center justify-between hover:border-gray-400 transition-colors"
      >
        <span className="text-sm text-gray-700 truncate">{getSelectedLabel()}</span>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {renderDropdownContent()}
    </div>
  );
}







