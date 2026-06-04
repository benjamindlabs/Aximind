'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  Building2,
  Users,
  CreditCard,
  Loader2,
  Upload,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Settings as SettingsIcon,
  XCircle,
  Key
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'profile' | 'workspace' | 'team' | 'billing'

type ToastProps = {
  type: 'success' | 'error'
  message: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>('profile')
  const [toasts, setToasts] = React.useState<(ToastProps & { id: string })[]>([])

  const showToast = React.useCallback((type: 'success' | 'error', message: string) => {
    const id = Math.random().toString(36).substring(7)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm min-w-[320px] max-w-[420px]',
              'animate-[slideIn_0.3s_ease-out]',
              toast.type === 'success'
                ? 'bg-emerald-950/85 border-emerald-500/30 text-emerald-200'
                : 'bg-red-950/85 border-red-500/30 text-red-200'
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400 shrink-0" />
            )}
            <p className="text-sm font-medium flex-1">{toast.message}</p>
          </div>
        ))}
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-indigo-500" />
          Settings
        </h1>
        <p className="text-zinc-400 mt-1">Manage your account settings and workspace preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="w-full md:w-60 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap shrink-0",
              activeTab === 'profile' 
                ? "bg-indigo-500/10 text-indigo-400" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            )}
          >
            <User className="h-4 w-4" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap shrink-0",
              activeTab === 'workspace' 
                ? "bg-indigo-500/10 text-indigo-400" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            )}
          >
            <Building2 className="h-4 w-4" />
            Workspace
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap shrink-0",
              activeTab === 'team' 
                ? "bg-indigo-500/10 text-indigo-400" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            )}
          >
            <Users className="h-4 w-4" />
            Team Members
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap shrink-0",
              activeTab === 'billing' 
                ? "bg-indigo-500/10 text-indigo-400" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            )}
          >
            <CreditCard className="h-4 w-4" />
            Billing
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl min-h-[500px]">
            {activeTab === 'profile' && <ProfileTab showToast={showToast} />}
            {activeTab === 'workspace' && <WorkspaceTab showToast={showToast} />}
            {activeTab === 'team' && <TeamTab showToast={showToast} />}
            {activeTab === 'billing' && <BillingTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------
// PROFILE TAB
// ----------------------------------------------------
function ProfileTab({ showToast }: { showToast: (t: 'success'|'error', m: string) => void }) {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [profile, setProfile] = React.useState<any>(null)
  
  // Password modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false)
  const [passwordForm, setPasswordForm] = React.useState({ new: '', confirm: '' })

  const supabase = createClient()

  React.useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setProfile(d)
      })
      .catch(e => showToast('error', e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('success', 'Profile updated successfully')
    } catch (e: any) {
      showToast('error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${profile.id}-${Math.random()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)
        
      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Please create the "avatars" bucket in Supabase storage first.')
        }
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
        
      setProfile({ ...profile, avatar_url: publicUrl })
      showToast('success', 'Avatar uploaded. Remember to save changes.')
    } catch (e: any) {
      showToast('error', e.message)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.new !== passwordForm.confirm) {
      return showToast('error', 'Passwords do not match')
    }
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new
      })
      if (error) throw error
      showToast('success', 'Password updated successfully')
      setIsPasswordModalOpen(false)
      setPasswordForm({ new: '', confirm: '' })
    } catch (e: any) {
      showToast('error', e.message)
    }
  }

  if (loading) return <TabLoader />

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Profile Settings</h2>
        <p className="text-sm text-zinc-400 mt-1">Manage your personal information and avatar.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Full Name</label>
            <input 
              type="text" 
              value={profile?.full_name || ''}
              onChange={e => setProfile({...profile, full_name: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
              placeholder="e.g. Jane Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email Address</label>
            <input 
              type="email" 
              value={profile?.email || ''}
              disabled
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-500 cursor-not-allowed"
            />
            <p className="text-xs text-zinc-500 mt-1.5">Email cannot be changed directly.</p>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <button 
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
            >
              <Key className="h-4 w-4" /> Change Password
            </button>
          </div>
        </div>

        <div className="md:w-64 flex flex-col items-center justify-start gap-4 border-t md:border-t-0 md:border-l border-zinc-800 pt-8 md:pt-0 md:pl-8">
          <div className="h-28 w-28 rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700 relative group flex items-center justify-center text-3xl font-bold text-zinc-500 shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              profile?.full_name?.charAt(0) || <User className="h-10 w-10 opacity-50" />
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleAvatarUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              title="Upload new avatar"
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-300">Profile Picture</p>
            <p className="text-xs text-zinc-500 mt-1">Click image to upload.<br/>Square image recommended.</p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-zinc-800 flex justify-end">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </button>
      </div>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Change Password</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">New Password</label>
                <input 
                  type="password" 
                  value={passwordForm.new}
                  onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Confirm Password</label>
                <input 
                  type="password" 
                  value={passwordForm.confirm}
                  onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------
// WORKSPACE TAB
// ----------------------------------------------------
function WorkspaceTab({ showToast }: { showToast: (t: 'success'|'error', m: string) => void }) {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [workspace, setWorkspace] = React.useState<any>(null)
  
  const supabase = createClient()

  React.useEffect(() => {
    fetch('/api/workspace/settings')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setWorkspace(d)
      })
      .catch(e => showToast('error', e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (workspace.userRole !== 'owner' && workspace.userRole !== 'admin') {
      return showToast('error', 'Only owners or admins can update workspace settings')
    }

    setSaving(true)
    try {
      const res = await fetch('/api/workspace/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workspace)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('success', 'Workspace updated successfully')
    } catch (e: any) {
      showToast('error', e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <TabLoader />

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Workspace Settings</h2>
        <p className="text-sm text-zinc-400 mt-1">Manage your company's workspace details.</p>
      </div>

      <div className="max-w-xl space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Workspace Name</label>
          <input 
            type="text" 
            value={workspace?.name || ''}
            onChange={e => setWorkspace({...workspace, name: e.target.value})}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Workspace URL Slug</label>
          <div className="flex items-center">
            <span className="bg-zinc-800 border border-r-0 border-zinc-700 text-zinc-400 px-4 py-2.5 rounded-l-lg text-sm">
              aximind.com/
            </span>
            <input 
              type="text" 
              value={workspace?.slug || ''}
              onChange={e => setWorkspace({...workspace, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-r-lg px-4 py-2.5 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
        
        <div className="pt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Workspace ID</label>
            <div className="text-sm font-mono text-zinc-400 bg-zinc-950/50 px-3 py-2 rounded border border-zinc-800/50 truncate">
              {workspace?.id}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Created</label>
            <div className="text-sm text-zinc-400 px-3 py-2">
              {new Date(workspace?.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-zinc-800 flex justify-end">
        <button 
          onClick={handleSave}
          disabled={saving || (workspace?.userRole !== 'owner' && workspace?.userRole !== 'admin')}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Workspace
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------
// TEAM TAB
// ----------------------------------------------------
function TeamTab({ showToast }: { showToast: (t: 'success'|'error', m: string) => void }) {
  const [loading, setLoading] = React.useState(true)
  const [members, setMembers] = React.useState<any[]>([])
  
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRole, setInviteRole] = React.useState('member')
  const [inviting, setInviting] = React.useState(false)

  const fetchMembers = React.useCallback(async () => {
    try {
      const res = await fetch('/api/workspace/members')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMembers(data)
    } catch (e: any) {
      showToast('error', e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      const res = await fetch('/api/workspace/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('success', 'Invitation sent successfully')
      setIsInviteModalOpen(false)
      setInviteEmail('')
      fetchMembers()
    } catch (e: any) {
      showToast('error', e.message)
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/workspace/members/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('success', 'Role updated')
      fetchMembers()
    } catch (e: any) {
      showToast('error', e.message)
    }
  }

  const handleRemove = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the workspace?')) return
    try {
      const res = await fetch(`/api/workspace/members/${userId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('success', 'Member removed')
      fetchMembers()
    } catch (e: any) {
      showToast('error', e.message)
    }
  }

  if (loading) return <TabLoader />

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-white">Team Members</h2>
          <p className="text-sm text-zinc-400 mt-1">Manage who has access to this workspace.</p>
        </div>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Invite Member
        </button>
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[500px]">
            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-medium">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          member.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-200">{member.name}</p>
                        <p className="text-xs text-zinc-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 text-xs">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleRemove(member.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Invite Team Member</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  placeholder="colleague@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Assign Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={inviting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------
// BILLING TAB (Placeholder)
// ----------------------------------------------------
function BillingTab() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Billing & Subscription</h2>
        <p className="text-sm text-zinc-400 mt-1">Manage your plan, usage, and payment methods.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-200">Current Plan</h3>
            <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-full border border-zinc-700">Free Tier</span>
          </div>
          <p className="text-sm text-zinc-400 mb-6">You are currently on the Free plan, which includes up to 5 team members and basic AI features.</p>
          <button className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
            Upgrade to Pro
          </button>
        </div>

        <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-zinc-200 mb-4">Usage This Month</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-zinc-400">AI Tokens</span>
                <span className="text-zinc-300">45k / 100k</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-zinc-400">Team Members</span>
                <span className="text-zinc-300">2 / 5</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '40%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-zinc-200 mb-4">Payment Methods</h3>
        <div className="flex items-center gap-4 p-4 border border-zinc-800 rounded-lg bg-zinc-900/50">
          <div className="h-10 w-16 bg-zinc-800 rounded flex items-center justify-center shrink-0">
            <CreditCard className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300">No payment method added</p>
            <p className="text-xs text-zinc-500 mt-0.5">Add a card to upgrade your plan.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function TabLoader() {
  return (
    <div className="h-[400px] flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
    </div>
  )
}
