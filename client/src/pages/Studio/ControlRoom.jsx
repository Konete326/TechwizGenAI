import { useState, useEffect } from 'react';

export default function ControlRoom({ clientId = 'cl_12345', targetUrl = 'http://localhost:3000' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blockedPaths, setBlockedPaths] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientId || !targetUrl) return;

    const fetchDomData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/sync-dom?clientId=${encodeURIComponent(clientId)}&url=${encodeURIComponent(targetUrl)}`);
        if (!res.ok) throw new Error('Failed to fetch DOM data');
        const json = await res.json();
        setData(json);

        const guardRes = await fetch(`/api/v1/get-guardrails?clientId=${encodeURIComponent(clientId)}`);
        if (guardRes.ok) {
          const guardJson = await guardRes.json();
          setBlockedPaths(guardJson.blockedPaths || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDomData();
  }, [clientId, targetUrl]);

  const handleToggleBlock = async (path) => {
    const isBlocked = blockedPaths.includes(path);
    const newBlocked = isBlocked 
      ? blockedPaths.filter(p => p !== path) 
      : [...blockedPaths, path];
    
    setBlockedPaths(newBlocked);
    setSaving(true);
    
    try {
      await fetch('/api/v1/update-guardrails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, blockedPaths: newBlocked })
      });
    } catch (err) {
      console.error('Failed to update guardrails', err);
      setBlockedPaths(blockedPaths); 
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading Control Room...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  if (!data) return <div>No DOM data received yet. SDK might not have synced.</div>;

  return (
    <div className="control-room" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Nisa Control Room</h2>
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e5e7eb', borderRadius: '8px' }}>
        <p style={{ margin: '5px 0' }}><strong>Client ID:</strong> {clientId}</p>
        <p style={{ margin: '5px 0' }}><strong>Target URL:</strong> {targetUrl}</p>
        <p style={{ margin: '5px 0' }}><strong>Last Synced:</strong> {new Date(data.timestamp).toLocaleString()}</p>
        {saving && <span style={{ color: '#2563eb', fontSize: '0.85em', fontWeight: 'bold' }}>Saving guardrails...</span>}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#374151', color: 'white', textAlign: 'left' }}>
            <th style={{ padding: '12px', border: '1px solid #4b5563', textAlign: 'center' }}>Block Nisa Access</th>
            <th style={{ padding: '12px', border: '1px solid #4b5563' }}>Type</th>
            <th style={{ padding: '12px', border: '1px solid #4b5563' }}>Text / Context</th>
            <th style={{ padding: '12px', border: '1px solid #4b5563' }}>CSS Path (Target)</th>
          </tr>
        </thead>
        <tbody>
          {data.semanticMap.map((element, idx) => {
            const isBlocked = blockedPaths.includes(element.path);
            return (
              <tr key={idx} style={{ backgroundColor: isBlocked ? '#fee2e2' : (idx % 2 === 0 ? '#ffffff' : '#f9fafb') }}>
                <td style={{ padding: '10px', border: '1px solid #d1d5db', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={isBlocked} 
                    onChange={() => handleToggleBlock(element.path)}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                </td>
                <td style={{ padding: '10px', border: '1px solid #d1d5db', fontWeight: 'bold', color: isBlocked ? '#991b1b' : 'inherit' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    backgroundColor: element.type === 'button' ? '#dbeafe' : '#f3f4f6', 
                    borderRadius: '4px' 
                  }}>
                    {element.type}
                  </span>
                </td>
                <td style={{ padding: '10px', border: '1px solid #d1d5db', textDecoration: isBlocked ? 'line-through' : 'none' }}>
                  {element.text || <em style={{color: '#9ca3af'}}>Empty/Icon</em>}
                </td>
                <td style={{ padding: '10px', border: '1px solid #d1d5db', fontFamily: 'monospace', color: isBlocked ? '#991b1b' : '#b91c1c' }}>
                  {element.path}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
