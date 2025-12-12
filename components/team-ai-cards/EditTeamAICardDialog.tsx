'use client';

import { useState, useEffect, useMemo } from 'react';
import { TeamAICard } from '@/lib/config';

interface EditTeamAICardDialogProps {
  card: TeamAICard;
  onSave: (updatedCard: TeamAICard) => Promise<void>;
  onClose: () => void;
}

// Initialize formData with all possible fields, using card values or defaults
const initializeFormData = (cardData: TeamAICard): TeamAICard => {
  return {
    id: cardData.id ?? 0,
    date: cardData.date ?? '',
    team_name: cardData.team_name ?? '',
    group_name: cardData.group_name ?? null,
    card_name: cardData.card_name ?? '',
    card_type: cardData.card_type ?? '',
    priority: cardData.priority ?? '',
    source: cardData.source ?? '',
    source_job_id: cardData.source_job_id ?? null,
    description: cardData.description ?? '',
    full_information: cardData.full_information ?? '',
    information_json: cardData.information_json ?? null,
    pi: cardData.pi ?? null,
    created_at: cardData.created_at,
    updated_at: cardData.updated_at,
  };
};

export default function EditTeamAICardDialog({
  card,
  onSave,
  onClose,
}: EditTeamAICardDialogProps) {
  const initialFormData = useMemo(() => initializeFormData(card), [card]);
  const [formData, setFormData] = useState<TeamAICard>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(initializeFormData(card));
  }, [card]);

  const handleChange = (field: keyof TeamAICard, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Format JSON for display/editing
  const formatJson = (jsonString: string | null | undefined): string => {
    if (!jsonString) return '';
    try {
      const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(jsonString);
    }
  };

  // Parse JSON when saving
  const parseJson = (jsonString: string): string | null => {
    if (!jsonString || !jsonString.trim()) return null;
    try {
      // Validate it's valid JSON
      JSON.parse(jsonString);
      return jsonString;
    } catch {
      // If it's not valid JSON, return as-is (might be partial edit)
      return jsonString;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Create update object with only editable fields
      const updates: Partial<TeamAICard> = {};
      allFields.forEach(field => {
        if (!readOnlyFields.includes(field)) {
          let value: any = formData[field as keyof TeamAICard];
          // Parse JSON field if it's information_json
          if (field === 'information_json' && typeof value === 'string') {
            value = parseJson(value);
          }
          // Only include the field if it has a meaningful value
          // Skip empty strings, null, and undefined (unless it's a field that explicitly allows null)
          const nullableFields = ['group_name', 'source_job_id', 'information_json', 'pi'];
          if (value !== undefined) {
            // For nullable fields, include null if explicitly set
            if (nullableFields.includes(field)) {
              updates[field as keyof TeamAICard] = value;
            }
            // For other fields, only include if not empty string
            else if (value !== null && value !== '') {
              updates[field as keyof TeamAICard] = value;
            }
          }
        }
      });

      // Create updated card with all fields for the callback
      const updatedCard: TeamAICard = {
        ...card,
        ...updates,
      };

      await onSave(updatedCard);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Fields that are read-only (display only)
  const readOnlyFields = ['id', 'created_at', 'updated_at'];

  // Define all possible fields from the TeamAICard interface to ensure all fields are shown
  const allPossibleFields: (keyof TeamAICard)[] = [
    'id',
    'date',
    'team_name',
    'group_name',
    'card_name',
    'card_type',
    'priority',
    'source',
    'source_job_id',
    'description',
    'full_information',
    'information_json',
    'pi',
    'created_at',
    'updated_at',
  ];

  // Use all possible fields, but merge with actual card data
  const allFields = allPossibleFields;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="border-b border-gray-200 bg-blue-50 px-4 py-2 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Edit Team AI Card</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-4 py-3">
            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2">
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            <div className="mb-3 text-xs text-gray-500">
              Showing {allFields.length} fields
            </div>

            {/* Short fields - label and input on same row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              {allFields.map((field) => {
                const fieldValue = formData[field] ?? card[field] ?? null;
                const isTextArea = field === 'description' || field === 'full_information' || field === 'information_json';
                const isShortField = ['id', 'date', 'team_name', 'group_name', 'card_name', 'card_type', 'priority', 'source', 'source_job_id'].includes(field);
                const isDate = field === 'date' || field === 'created_at' || field === 'updated_at';
                const isNumber = typeof fieldValue === 'number' && field !== 'id';
                const isReadOnly = readOnlyFields.includes(field);

                // Skip textarea fields and non-short fields here
                if (isTextArea || !isShortField) {
                  return null;
                }

                // Format display value
                const displayValue = fieldValue !== null && fieldValue !== undefined ? String(fieldValue) : '';

                return (
                  <div key={field} className="flex items-center gap-2">
                    <label
                      htmlFor={field}
                      className="text-xs font-medium text-gray-700 whitespace-nowrap min-w-[100px]"
                    >
                      {field.toUpperCase().replace(/_/g, ' ')}:
                      {isReadOnly && <span className="ml-1 text-[10px] text-gray-500">(ro)</span>}
                    </label>
                    {isDate ? (
                      <input
                        id={field}
                        type={field === 'date' ? 'date' : 'datetime-local'}
                        value={fieldValue ? (field === 'date' ? String(fieldValue).split('T')[0] : String(fieldValue).slice(0, 16)) : ''}
                        onChange={(e) => handleChange(field as keyof TeamAICard, e.target.value)}
                        disabled={isReadOnly}
                        className={`flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                      />
                    ) : isNumber ? (
                      <input
                        id={field}
                        type="number"
                        value={fieldValue !== null && fieldValue !== undefined ? Number(fieldValue) : ''}
                        onChange={(e) => handleChange(field as keyof TeamAICard, e.target.value ? Number(e.target.value) : null)}
                        disabled={isReadOnly}
                        className={`flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                      />
                    ) : (
                      <input
                        id={field}
                        type="text"
                        value={displayValue}
                        onChange={(e) => handleChange(field as keyof TeamAICard, e.target.value)}
                        disabled={isReadOnly}
                        className={`flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Long text fields - full width textareas */}
            <div className="grid grid-cols-1 gap-3">
              {allFields.map((field) => {
                const fieldValue = formData[field] ?? card[field] ?? null;
                const isTextArea = field === 'description' || field === 'full_information' || field === 'information_json';
                const isShortField = ['id', 'date', 'team_name', 'group_name', 'card_name', 'card_type', 'priority', 'source', 'source_job_id'].includes(field);
                const isDate = field === 'date' || field === 'created_at' || field === 'updated_at';
                const isReadOnly = readOnlyFields.includes(field);
                const isJsonField = field === 'information_json';

                // Only show textarea fields and other non-short fields here
                if (isShortField && !isTextArea) {
                  return null;
                }

                // Format JSON for display
                const displayValue = isJsonField
                  ? formatJson(fieldValue as string | null | undefined)
                  : (fieldValue !== null && fieldValue !== undefined ? String(fieldValue) : '');

                // Handle other fields that aren't short fields or textareas (like pi, created_at, updated_at)
                if (!isTextArea) {
                  return (
                    <div key={field}>
                      <label
                        htmlFor={field}
                        className="block text-xs font-medium text-gray-700 mb-1"
                      >
                        {field.toUpperCase().replace(/_/g, ' ')}
                        {isReadOnly && <span className="ml-2 text-[10px] text-gray-500">(read-only)</span>}
                      </label>
                      {isDate ? (
                        <input
                          id={field}
                          type={field === 'date' ? 'date' : 'datetime-local'}
                          value={fieldValue ? (field === 'date' ? String(fieldValue).split('T')[0] : String(fieldValue).slice(0, 16)) : ''}
                          onChange={(e) => handleChange(field as keyof TeamAICard, e.target.value)}
                          disabled={isReadOnly}
                          className={`w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        />
                      ) : (
                        <input
                          id={field}
                          type="text"
                          value={displayValue}
                          onChange={(e) => handleChange(field as keyof TeamAICard, e.target.value)}
                          disabled={isReadOnly}
                          className={`w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        />
                      )}
                    </div>
                  );
                }

                // Textarea fields - double the height
                return (
                  <div key={field}>
                    <label
                      htmlFor={field}
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      {field.toUpperCase().replace(/_/g, ' ')}
                      {isReadOnly && <span className="ml-2 text-[10px] text-gray-500">(read-only)</span>}
                    </label>
                    <textarea
                      id={field}
                      value={displayValue}
                      onChange={(e) => handleChange(field as keyof TeamAICard, e.target.value)}
                      disabled={isReadOnly}
                      rows={isJsonField ? 20 : 8}
                      className={`w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y ${
                        isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                      } ${isJsonField ? 'font-mono' : ''}`}
                      placeholder={isJsonField ? 'Enter valid JSON...' : ''}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-200 px-4 py-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

