'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ApiService } from '@/lib/api';

interface TeamGroupFilterProps {
  value: string | null; // team name or null
  onChange: (value: string | null, type: 'group' | 'team', name: string) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
}

export default function TeamGroupFilter({
  value,
  onChange,
  placeholder = 'Select team',
  className = '',
  allowClear = true,
}: TeamGroupFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const apiService = new ApiService();

  useEffect(() => {
    setIsMounted(true);
    // Fetch teams
    const fetchTeams = async () => {
      try {
        const response = await apiService.getTeams();
        if (response.teams) {
          setTeams(response.teams);
        }
      } catch (err) {
        console.error('Error fetching teams:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
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

  const getDisplayText = () => {
    if (!value) return placeholder;
    return value;
  };

  const handleToggle = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonRect(rect);
    }
    setIsOpen(!isOpen);
  };

  const getDropdownPosition = () => {
    if (!buttonRect) return { top: '0px', bottom: 'auto' };

    const dropdownMaxHeight = 300;
    const spacing = 4;
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

  const handleSelect = (teamName: string) => {
    onChange(teamName, 'team', teamName);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, 'team', '');
    setIsOpen(false);
  };

  const position = getDropdownPosition();

  const dropdownContent = (
    <>
      <div
        className="fixed inset-0 z-[9998]"
        onClick={() => setIsOpen(false)}
        style={{ cursor: 'default' }}
      />
      <div
        ref={dropdownRef}
        className="fixed bg-white border border-gray-300 rounded shadow-lg z-[9999]"
        style={{
          ...position,
          left: buttonRect ? `${buttonRect.left}px` : '0px',
          minWidth: buttonRect ? `${buttonRect.width}px` : '140px',
          maxWidth: '400px',
          maxHeight: '300px',
          overflowX: 'auto',
          overflowY: 'auto',
        }}
      >
        {loading ? (
          <div className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">Loading...</div>
        ) : teams.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">No teams available</div>
        ) : (
          <>
            {allowClear && value && (
              <div
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer border-b whitespace-nowrap"
                onClick={handleClear}
              >
                Clear selection
              </div>
            )}
            {teams.map(team => (
              <div
                key={team}
                className={`px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer whitespace-nowrap ${
                  value === team ? 'bg-blue-100 font-semibold' : ''
                }`}
                onClick={() => handleSelect(team)}
              >
                👥 {team}
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`px-2 py-1 border border-gray-300 rounded text-xs bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px] text-left flex items-center justify-between ${className}`}
        disabled={loading}
      >
        <span className="truncate">{loading ? 'Loading...' : getDisplayText()}</span>
        <span className="ml-2 flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isMounted && isOpen && typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
}
