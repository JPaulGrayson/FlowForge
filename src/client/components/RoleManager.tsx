// RoleManager.tsx - Sidebar to add/edit roles (human/system/AI)
import React, { useState } from 'react';
import { Role, RoleType, ROLE_COLORS } from '../types/process';

interface RoleManagerProps {
  roles: Role[];
  onRolesChange: (roles: Role[]) => void;
  selectedRoleId?: string | null;
  onSelectRole?: (roleId: string | null) => void;
}

const ROLE_TYPE_OPTIONS: { value: RoleType; label: string; icon: string }[] = [
  { value: 'human', label: 'Human', icon: '👤' },
  { value: 'system', label: 'System', icon: '⚙️' },
  { value: 'ai', label: 'AI', icon: '🤖' },
];

const generateId = () => `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const RoleManager: React.FC<RoleManagerProps> = ({
  roles,
  onRolesChange,
  selectedRoleId,
  onSelectRole,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<Partial<Role>>({
    name: '',
    type: 'human',
  });

  const handleAddRole = () => {
    if (!newRole.name?.trim()) return;

    const role: Role = {
      id: generateId(),
      name: newRole.name.trim(),
      type: newRole.type || 'human',
      color: ROLE_COLORS[newRole.type || 'human'],
    };

    onRolesChange([...roles, role]);
    setNewRole({ name: '', type: 'human' });
    setIsAdding(false);
  };

  const handleUpdateRole = (roleId: string, updates: Partial<Role>) => {
    const updatedRoles = roles.map(role =>
      role.id === roleId
        ? {
            ...role,
            ...updates,
            color: updates.type ? ROLE_COLORS[updates.type] : role.color,
          }
        : role
    );
    onRolesChange(updatedRoles);
  };

  const handleDeleteRole = (roleId: string) => {
    onRolesChange(roles.filter(r => r.id !== roleId));
    if (selectedRoleId === roleId) {
      onSelectRole?.(null);
    }
  };

  const handleMoveRole = (roleId: string, direction: 'up' | 'down') => {
    const index = roles.findIndex(r => r.id === roleId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= roles.length) return;

    const newRoles = [...roles];
    [newRoles[index], newRoles[newIndex]] = [newRoles[newIndex], newRoles[index]];
    onRolesChange(newRoles);
  };

  return (
    <div className="role-manager">
      <div className="role-manager-header">
        <h3>Roles / Swimlanes</h3>
        <button
          className="add-role-btn"
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Role
        </button>
      </div>

      <div className="role-list">
        {roles.map((role, index) => (
          <div
            key={role.id}
            className={`role-item ${selectedRoleId === role.id ? 'selected' : ''}`}
            onClick={() => onSelectRole?.(role.id)}
          >
            {editingId === role.id ? (
              <div className="role-edit-form">
                <input
                  type="text"
                  value={role.name}
                  onChange={e => handleUpdateRole(role.id, { name: e.target.value })}
                  autoFocus
                  className="role-name-input"
                />
                <select
                  value={role.type}
                  onChange={e => handleUpdateRole(role.id, { type: e.target.value as RoleType })}
                  className="role-type-select"
                >
                  {ROLE_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  className="role-action-btn save"
                  onClick={() => setEditingId(null)}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="role-info">
                  <span
                    className="role-indicator"
                    style={{ backgroundColor: role.color }}
                  />
                  <span className="role-name">{role.name}</span>
                  <span className="role-type-badge" style={{ color: role.color }}>
                    {ROLE_TYPE_OPTIONS.find(o => o.value === role.type)?.icon}
                  </span>
                </div>
                <div className="role-actions">
                  <button
                    className="role-action-btn"
                    onClick={e => { e.stopPropagation(); handleMoveRole(role.id, 'up'); }}
                    disabled={index === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="role-action-btn"
                    onClick={e => { e.stopPropagation(); handleMoveRole(role.id, 'down'); }}
                    disabled={index === roles.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="role-action-btn"
                    onClick={e => { e.stopPropagation(); setEditingId(role.id); }}
                    title="Edit"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className="role-action-btn delete"
                    onClick={e => { e.stopPropagation(); handleDeleteRole(role.id); }}
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {roles.length === 0 && !isAdding && (
          <div className="role-empty-state">
            No roles defined. Add a role to create swimlanes.
          </div>
        )}

        {isAdding && (
          <div className="role-add-form">
            <input
              type="text"
              placeholder="Role name (e.g., Customer)"
              value={newRole.name || ''}
              onChange={e => setNewRole({ ...newRole, name: e.target.value })}
              autoFocus
              className="role-name-input"
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddRole();
                if (e.key === 'Escape') setIsAdding(false);
              }}
            />
            <select
              value={newRole.type || 'human'}
              onChange={e => setNewRole({ ...newRole, type: e.target.value as RoleType })}
              className="role-type-select"
            >
              {ROLE_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
            <div className="role-form-actions">
              <button className="role-action-btn save" onClick={handleAddRole}>
                Add
              </button>
              <button className="role-action-btn" onClick={() => setIsAdding(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="role-legend">
        <h4>Legend</h4>
        <div className="legend-items">
          {ROLE_TYPE_OPTIONS.map(opt => (
            <div key={opt.value} className="legend-item">
              <span className="legend-color" style={{ backgroundColor: ROLE_COLORS[opt.value] }} />
              <span className="legend-icon">{opt.icon}</span>
              <span className="legend-label">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoleManager;
