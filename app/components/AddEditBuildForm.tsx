'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import type { Build, Selector, SelectorType } from '@/domain/models';
import { validateBuild, ValidationError } from '@/domain/validation';
import { generateBuildId } from '@/domain/utils';

interface AddEditBuildFormProps {
  build?: Build;
  onSave: (build: Partial<Build>) => Promise<void>;
  onCancel: () => void;
}

export function AddEditBuildForm({ build, onSave, onCancel }: AddEditBuildFormProps) {
  const isEditMode = !!build;

  const [formData, setFormData] = useState({
    name: build?.name || '',
    organization: build?.organization || '',
    repository: build?.repository || '',
    personalAccessToken: build?.personalAccessToken || '',
    cacheExpirationMinutes: build?.cacheExpirationMinutes || 30,
  });

  const [selectors, setSelectors] = useState<Selector[]>(
    build?.selectors || [{ type: 'branch', pattern: '' }]
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddSelector = () => {
    setSelectors([...selectors, { type: 'branch', pattern: '' }]);
  };

  const handleRemoveSelector = (index: number) => {
    if (selectors.length > 1) {
      setSelectors(selectors.filter((_, i) => i !== index));
    }
  };

  const handleSelectorChange = (index: number, field: keyof Selector, value: string) => {
    const newSelectors = [...selectors];
    if (field === 'type') {
      newSelectors[index] = { ...newSelectors[index]!, type: value as SelectorType };
    } else {
      newSelectors[index] = { ...newSelectors[index]!, pattern: value };
    }
    setSelectors(newSelectors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const buildData: Partial<Build> = {
        id: build?.id || generateBuildId(),
        name: formData.name.trim(),
        organization: formData.organization.trim(),
        repository: formData.repository.trim(),
        selectors: selectors.map((s) => ({
          type: s.type,
          pattern: s.pattern.trim(),
        })),
        personalAccessToken: formData.personalAccessToken.trim(),
        cacheExpirationMinutes: formData.cacheExpirationMinutes,
        createdAt: build?.createdAt || new Date(),
        updatedAt: new Date(),
        // tenantId is handled by the backend based on authenticated user
      };

      // Validate using domain validation
      validateBuild(buildData);

      await onSave(buildData);
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to save build. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? 'Edit Build' : 'Add New Build'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{errors.general}</p>
            </div>
          )}

          {/* Build Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Build Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="My CI Pipeline"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              A descriptive name for this build (max 100 characters)
            </p>
          </div>

          {/* Organization */}
          <div>
            <label htmlFor="organization" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Organization <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="organization"
              value={formData.organization}
              onChange={(e) => handleInputChange('organization', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="my-org"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              GitHub organization or username
            </p>
          </div>

          {/* Repository Name */}
          <div>
            <label htmlFor="repository" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Repository Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="repository"
              value={formData.repository}
              onChange={(e) => handleInputChange('repository', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="my-repo"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              GitHub repository name
            </p>
          </div>

          {/* Selectors */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selectors <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {selectors.map((selector, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <select
                    value={selector.type}
                    onChange={(e) => handleSelectorChange(index, 'type', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="tag">Tag</option>
                    <option value="branch">Branch</option>
                    <option value="workflow">Workflow</option>
                  </select>
                  <input
                    type="text"
                    value={selector.pattern}
                    onChange={(e) => handleSelectorChange(index, 'pattern', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., main, v*, CI-Workflow"
                    required
                  />
                  {selectors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSelector(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove selector"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddSelector}
              className="mt-3 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Another Selector
            </button>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Use selectors to filter workflows. Patterns support free text (e.g., "main", "v*", "CI-Workflow")
            </p>
          </div>

          {/* Personal Access Token */}
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Personal Access Token (PAT) <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="token"
              value={formData.personalAccessToken}
              onChange={(e) => handleInputChange('personalAccessToken', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              GitHub Personal Access Token with <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">repo</code> and{' '}
              <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">workflow</code> permissions
            </p>
          </div>

          {/* Cache Expiration */}
          <div>
            <label htmlFor="cacheExpiration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cache Expiration (minutes) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="cacheExpiration"
              value={formData.cacheExpirationMinutes}
              onChange={(e) => handleInputChange('cacheExpirationMinutes', parseInt(e.target.value))}
              min={1}
              max={1440}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              How long to cache GitHub API responses (1-1440 minutes, i.e., 1 minute to 1 day)
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {isEditMode ? 'Update Build' : 'Add Build'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

