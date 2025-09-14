import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const RealTimeLogger = () => {
  const [logs, setLogs] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('activity');
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || !profile) return;

    // Fetch initial logs
    fetchActivityLogs();
    fetchSystemLogs();

    // Set up real-time subscriptions
    const activitySubscription = supabase
      .channel('activity_logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_logs',
          filter: `tenant_id=eq.${profile.tenant_id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLogs(prev => [payload.new, ...prev].slice(0, 100)); // Keep last 100 logs
          }
        }
      )
      .subscribe();

    const systemSubscription = supabase
      .channel('system_logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_logs',
          filter: `tenant_id=eq.${profile.tenant_id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSystemLogs(prev => [payload.new, ...prev].slice(0, 100));
          }
        }
      )
      .subscribe();

    return () => {
      activitySubscription.unsubscribe();
      systemSubscription.unsubscribe();
    };
  }, [user, profile]);

  const fetchActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching activity logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error in fetchActivityLogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching system logs:', error);
        return;
      }

      setSystemLogs(data || []);
    } catch (error) {
      console.error('Error in fetchSystemLogs:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActivityIcon = (activityType) => {
    const icons = {
      login: '🔑',
      logout: '🚪',
      create: '➕',
      update: '✏️',
      delete: '🗑️',
      view: '👁️',
      export: '📤'
    };
    return icons[activityType] || '📝';
  };

  const getLogLevelColor = (level) => {
    const colors = {
      info: '#2563eb',
      warning: '#d97706',
      error: '#dc2626',
      debug: '#6b7280'
    };
    return colors[level] || '#6b7280';
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading logs...</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e1e5e9' }}>
      <h3 style={{ marginBottom: '20px', color: '#333' }}>Real-Time Logs</h3>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #e1e5e9' }}>
        <button
          onClick={() => setActiveTab('activity')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'activity' ? '#007bff' : 'transparent',
            color: activeTab === 'activity' ? 'white' : '#666',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            marginRight: '10px'
          }}
        >
          Activity Logs ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('system')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'system' ? '#007bff' : 'transparent',
            color: activeTab === 'system' ? 'white' : '#666',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0'
          }}
        >
          System Logs ({systemLogs.length})
        </button>
      </div>

      {/* Logs Content */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {activeTab === 'activity' ? (
          <div>
            {logs.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                No activity logs yet
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e1e5e9',
                    fontSize: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ marginRight: '8px', fontSize: '16px' }}>
                      {getActivityIcon(log.activity_type)}
                    </span>
                    <strong style={{ color: '#333', marginRight: '8px' }}>
                      {log.activity_type.toUpperCase()}
                    </strong>
                    <span style={{ color: '#666', fontSize: '12px' }}>
                      {formatTimestamp(log.created_at)}
                    </span>
                  </div>
                  <div style={{ color: '#555', marginBottom: '4px' }}>
                    {log.description}
                  </div>
                  {log.profiles && (
                    <div style={{ color: '#888', fontSize: '12px' }}>
                      by {log.profiles.full_name} ({log.profiles.email})
                    </div>
                  )}
                  {log.resource_type && (
                    <div style={{ color: '#888', fontSize: '12px' }}>
                      Resource: {log.resource_type}
                      {log.resource_id && ` (ID: ${log.resource_id})`}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            {systemLogs.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                No system logs yet
              </p>
            ) : (
              systemLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e1e5e9',
                    borderLeft: `4px solid ${getLogLevelColor(log.log_level)}`,
                    fontSize: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ 
                      color: getLogLevelColor(log.log_level), 
                      marginRight: '8px',
                      textTransform: 'uppercase',
                      fontSize: '12px'
                    }}>
                      {log.log_level}
                    </strong>
                    <span style={{ color: '#666', fontSize: '12px' }}>
                      {formatTimestamp(log.created_at)}
                    </span>
                  </div>
                  <div style={{ color: '#555', marginBottom: '4px' }}>
                    {log.message}
                  </div>
                  {log.source && (
                    <div style={{ color: '#888', fontSize: '12px' }}>
                      Source: {log.source}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeLogger;
