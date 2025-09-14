import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const NotesManager = () => {
  const { user, profile } = useAuth();
  const [notes, setNotes] = useState([]);
  const [noteStats, setNoteStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    is_favorite: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      fetchNotes();
      fetchNoteStats();
    }
  }, [user]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching notes:', error);
        setError('Failed to load notes');
      } else {
        setNotes(data || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchNoteStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_note_stats', {
        user_id_param: user.id
      });

      if (error) {
        console.error('Error fetching note stats:', error);
      } else {
        setNoteStats(data);
      }
    } catch (error) {
      console.error('Error fetching note stats:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const noteData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        is_favorite: formData.is_favorite,
        user_id: user.id
      };

      if (editingNote) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', editingNote.id)
          .eq('user_id', user.id);

        if (error) {
          setError('Failed to update note: ' + error.message);
        } else {
          setSuccess('Note updated successfully!');
          resetForm();
          await fetchNotes();
          await fetchNoteStats();
        }
      } else {
        // Create new note
        const { error } = await supabase
          .from('notes')
          .insert([noteData]);

        if (error) {
          if (error.message.includes('Standard users can only create up to 3 notes')) {
            setError('You have reached the limit of 3 notes for standard users. Upgrade to premium for unlimited notes.');
          } else {
            setError('Failed to create note: ' + error.message);
          }
        } else {
          setSuccess('Note created successfully!');
          resetForm();
          await fetchNotes();
          await fetchNoteStats();
        }
      }
    } catch (error) {
      console.error('Error saving note:', error);
      setError('Failed to save note');
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content || '',
      tags: note.tags ? note.tags.join(', ') : '',
      is_favorite: note.is_favorite
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('soft_delete_note', {
        note_id_param: noteId
      });

      if (error) {
        setError('Failed to delete note: ' + error.message);
      } else {
        setSuccess('Note deleted successfully!');
        await fetchNotes();
        await fetchNoteStats();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      setError('Failed to delete note');
    }
  };

  const toggleFavorite = async (noteId, currentFavorite) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_favorite: !currentFavorite })
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) {
        setError('Failed to update favorite status');
      } else {
        await fetchNotes();
        await fetchNoteStats();
      }
    } catch (error) {
      console.error('Error updating favorite:', error);
      setError('Failed to update favorite status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      tags: '',
      is_favorite: false
    });
    setEditingNote(null);
    setShowCreateForm(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubscriptionBadge = () => {
    if (!noteStats) return null;
    
    const isPremium = noteStats.subscription_type === 'premium';
    return (
      <span style={{
        background: isPremium ? '#28a745' : '#ffc107',
        color: isPremium ? 'white' : '#212529',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {isPremium ? 'Premium' : 'Standard'}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Loading notes...</h3>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header with Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>My Notes</h2>
          {noteStats && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
              {getSubscriptionBadge()}
              <span style={{ color: '#666', fontSize: '14px' }}>
                {noteStats.total_notes} of {noteStats.max_notes === -1 ? '∞' : noteStats.max_notes} notes
              </span>
              {noteStats.favorite_notes > 0 && (
                <span style={{ color: '#666', fontSize: '14px' }}>
                  {noteStats.favorite_notes} favorites
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={noteStats && !noteStats.can_create_more}
          style={{
            padding: '10px 20px',
            background: noteStats && !noteStats.can_create_more ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: noteStats && !noteStats.can_create_more ? 'not-allowed' : 'pointer'
          }}
        >
          {noteStats && !noteStats.can_create_more ? 'Limit Reached' : 'Create Note'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '12px', 
          borderRadius: '4px', 
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          background: '#d4edda', 
          color: '#155724', 
          padding: '12px', 
          borderRadius: '4px', 
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          {success}
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #e1e5e9',
          marginBottom: '20px'
        }}>
          <h3>{editingNote ? 'Edit Note' : 'Create New Note'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Content
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                rows="6"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Tags (comma separated)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="work, personal, ideas"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  name="is_favorite"
                  checked={formData.is_favorite}
                  onChange={handleInputChange}
                />
                Mark as favorite
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {editingNote ? 'Update Note' : 'Create Note'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <h3>No notes yet</h3>
          <p>Create your first note to get started!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e1e5e9',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <h4 style={{ margin: '0', color: '#333' }}>{note.title}</h4>
                <button
                  onClick={() => toggleFavorite(note.id, note.is_favorite)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: note.is_favorite ? '#ffc107' : '#ccc'
                  }}
                >
                  ★
                </button>
              </div>

              {note.content && (
                <p style={{ color: '#666', marginBottom: '15px', lineHeight: '1.5' }}>
                  {note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content}
                </p>
              )}

              {note.tags && note.tags.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  {note.tags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        background: '#e9ecef',
                        color: '#495057',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        marginRight: '5px'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ fontSize: '12px', color: '#999', marginBottom: '15px' }}>
                Updated: {formatDate(note.updated_at)}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleEdit(note)}
                  style={{
                    padding: '6px 12px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(note.id)}
                  style={{
                    padding: '6px 12px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upgrade Notice for Standard Users */}
      {noteStats && noteStats.subscription_type === 'standard' && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '30px',
          textAlign: 'center'
        }}>
          <h4 style={{ color: '#856404', marginBottom: '10px' }}>Upgrade to Premium</h4>
          <p style={{ color: '#856404', marginBottom: '15px' }}>
            Get unlimited notes, advanced features, and more with our premium plan!
          </p>
          <button
            style={{
              padding: '10px 20px',
              background: '#ffc107',
              color: '#212529',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
};

export default NotesManager;
