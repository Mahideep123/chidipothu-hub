import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProperties, deleteProperty, getLocations } from '../api';
import { Search, Edit2, Trash2, Plus, Filter, Share2, Download, Printer, FileSpreadsheet } from 'lucide-react';
import { PhotoGrid } from '../components/Gallery';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const TYPE_BADGE = {
  'House':              { bg: '#dbeafe', color: '#1e40af' },
  'Shop':               { bg: '#fef3c7', color: '#92400e' },
  'Agriculture Land':   { bg: '#d1fae5', color: '#065f46' },
  'Site':               { bg: '#e9d5ff', color: '#6b21a8' },
  'Commercial Godown':  { bg: '#bfdbfe', color: '#1d4ed8' },
};

const TYPES = ['All Types', 'House', 'Shop', 'Agriculture Land', 'Site', 'Commercial Godown'];

export default function Properties() {
  const navigate = useNavigate();
  const [props, setProps]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState('table');
  const [search, setSearch]     = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterVillage, setFilterVillage] = useState('');
  const [states, setStates]     = useState([]);
  const [villages, setVillages] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // load dropdown options
  useEffect(() => {
    getLocations()
      .then(r => {
        const data = r.data || [];
        setStates([...new Set(data.map(d => d.state).filter(Boolean))]);
        setVillages([...new Set(data.map(d => d.village).filter(Boolean))]);
      })
      .catch(() => {});
  }, []);

  const fetchProps = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)                               params.search        = search;
      if (filterType && filterType !== 'All Types') params.property_type = filterType;
      if (filterState && filterState !== 'All States')   params.state = filterState;
      if (filterVillage && filterVillage !== 'All Villages') params.village = filterVillage;
      const r = await getProperties(params);
      setProps(r.data);
    } catch { toast.error('Failed to load properties'); }
    finally { setLoading(false); }
  }, [search, filterType, filterState, filterVillage]);

  useEffect(() => { fetchProps(); }, [fetchProps]);

  const handleShare = async (p) => {
    let pName = p.property_name || 'Unnamed Property';
    let text = `*Property details*\n` +
      `Property Name: ${pName}\n` +
      `Property Type: ${p.property_type || 'N/A'}\n` +
      `Owner Name: ${p.owner_name || 'N/A'}\n` +
      `Plot No. / Flat No.: ${p.plot_no || 'N/A'}\n` +
      `Door No: ${p.door_no || 'N/A'}\n` +
      `Document Number: ${p.document_number || 'N/A'}\n` +
      `Survey Number: ${p.survey_number || 'N/A'}\n` +
      `LPM Number: ${p.lpm_number || 'N/A'}\n` +
      `Patta Number: ${p.patta_number || 'N/A'}\n` +
      `Khata Number: ${p.khata_number || 'N/A'}\n` +
      `Assessment / Property Tax No.: ${p.assessment_number || 'N/A'}\n` +
      `Mother Document Number: ${p.mother_document || 'N/A'}\n` +
      `Document Location: ${p.document_location || 'N/A'}\n` +
      `Extent: ${p.extent_value ? `${p.extent_value} ${p.extent_unit}` : 'N/A'}\n` +
      (p.property_type === 'Agriculture Land' ? `Land As Per 1B: ${p.land_as_per_1b || 'N/A'}\n` : '') +
      `Location: ${[p.village, p.mandal, p.district, p.state].filter(Boolean).join(', ') || 'N/A'}`;

    if (p.remarks) text += `\nRemarks: ${p.remarks}`;

    if (p.file_attachments && p.file_attachments.length > 0) {
      text += `\n\n*Attachments:* ${p.file_attachments.length} file(s) available`;
    }
    const filesArray = [];

    let baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    if (baseUrl.includes('localhost') && window.location.hostname !== 'localhost') {
      baseUrl = baseUrl.replace('localhost', window.location.hostname);
    }

    const getCloudinaryDownloadUrl = (f) => {
      if (!f.url || !f.url.includes('cloudinary.com')) return f.url;
      if (f.url.includes('/upload/')) {
        return f.url.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(f.name || 'document')}/`);
      }
      if (f.url.includes('/raw/upload/')) {
        return f.url.replace('/raw/upload/', `/raw/upload/fl_attachment:${encodeURIComponent(f.name || 'document')}/`);
      }
      return f.url;
    };

    if (p.file_attachments && p.file_attachments.length > 0) {
      const toastId = toast.loading(`Fetching ${p.file_attachments.length} document(s)...`);
      for (const f of p.file_attachments) {
        try {
          let downloadUrl = f.url;
          if (f.public_id) {
            const encodedId = encodeURIComponent(f.public_id);
            const encodedName = encodeURIComponent(f.name || 'document');
            if (f.public_id.includes('/')) {
              const secureBase = baseUrl.startsWith('http://') && !baseUrl.includes('localhost') 
                ? baseUrl.replace('http://', 'https://') 
                : baseUrl;
              downloadUrl = `${secureBase}/api/proxy-file/${encodedId}?resource_type=${f.type === 'image' ? 'image' : 'raw'}&filename=${encodedName}`;
            } else {
              downloadUrl = `${baseUrl}/api/files/${encodedId}`;
            }
          }

          try {
            const res = await fetch(downloadUrl, { mode: 'cors', credentials: 'omit' });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const blob = await res.blob();
            const cleanName = (f.name || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
            filesArray.push(new File([blob], cleanName, { type: f.type === 'image' ? 'image/jpeg' : 'application/pdf' }));
          } catch (fetchErr) {
            const directUrl = getCloudinaryDownloadUrl(f);
            await fetch(directUrl, { mode: 'no-cors' });
            toast.error(`Could not fetch ${f.name} for sharing`, { id: toastId });
          }
          await new Promise(r => setTimeout(r, 200));
        } catch (e) { 
          console.error('[Share] Fatal error:', e);
        }
      }
      toast.success('Done!', { id: toastId });
    }

    if (navigator.share) {
      try { 
        if (filesArray.length > 0 && navigator.canShare && navigator.canShare({ files: filesArray })) {
          await navigator.share({ title: 'Property Details', text, files: filesArray });
        } else {
          if (filesArray.length > 0) toast.error('This browser does not support sharing files. Sharing text only.');
          await navigator.share({ title: 'Property Details', text });
        }
      } catch(err) { 
        if (err.name !== 'AbortError') toast.error('Sharing failed: ' + err.message);
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Property details copied to clipboard!');
    }
  };

  const handleDownloadDocs = async (p) => {
    toast.loading('Starting downloads...');
    
    let pName = p.property_name || 'Unnamed Property';
    let text = `*Property details*\n` +
      `Property Name: ${pName}\n` +
      `Property Type: ${p.property_type || 'N/A'}\n` +
      `Owner Name: ${p.owner_name || 'N/A'}\n` +
      `Plot No. / Flat No.: ${p.plot_no || 'N/A'}\n` +
      `Door No: ${p.door_no || 'N/A'}\n` +
      `Document Number: ${p.document_number || 'N/A'}\n` +
      `Survey Number: ${p.survey_number || 'N/A'}\n` +
      `LPM Number: ${p.lpm_number || 'N/A'}\n` +
      `Patta Number: ${p.patta_number || 'N/A'}\n` +
      `Khata Number: ${p.khata_number || 'N/A'}\n` +
      `Assessment / Property Tax No.: ${p.assessment_number || 'N/A'}\n` +
      `Mother Document Number: ${p.mother_document || 'N/A'}\n` +
      `Document Location: ${p.document_location || 'N/A'}\n` +
      `Extent: ${p.extent_value ? `${p.extent_value} ${p.extent_unit}` : 'N/A'}\n` +
      (p.property_type === 'Agriculture Land' ? `Land As Per 1B: ${p.land_as_per_1b || 'N/A'}\n` : '') +
      `Location: ${[p.village, p.mandal, p.district, p.state].filter(Boolean).join(', ') || 'N/A'}`;

    if (p.remarks) text += `\nRemarks: ${p.remarks}`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const txtUrl = URL.createObjectURL(blob);
    const txtLink = document.createElement('a');
    txtLink.href = txtUrl;
    txtLink.download = `${pName.replace(/[^a-zA-Z0-9]/g, '_')}_details.txt`;
    document.body.appendChild(txtLink);
    txtLink.click();
    document.body.removeChild(txtLink);
    URL.revokeObjectURL(txtUrl);

    let baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    if (baseUrl.includes('localhost') && window.location.hostname !== 'localhost') {
      baseUrl = baseUrl.replace('localhost', window.location.hostname);
    }

    if (p.file_attachments && p.file_attachments.length > 0) {
      const toastId = toast.loading('Preparing downloads...');
      for (const f of p.file_attachments) {
        try {
          let downloadUrl = f.url;
          if (f.public_id && f.public_id.includes('/')) {
             const encodedId = encodeURIComponent(f.public_id);
             const encodedName = encodeURIComponent(f.name || 'document');
             const secureBase = baseUrl.startsWith('http://') && !baseUrl.includes('localhost') 
               ? baseUrl.replace('http://', 'https://') 
               : baseUrl;
             downloadUrl = `${secureBase}/api/proxy-file/${encodedId}?resource_type=${f.type === 'image' ? 'image' : 'raw'}&filename=${encodedName}`;
          }

          const res = await fetch(downloadUrl, { mode: 'cors', credentials: 'omit' });
          if (!res.ok) throw new Error(`Status ${res.status}`);
          const blob = await res.blob();
          
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = f.name || 'document';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);

          await new Promise(r => setTimeout(r, 600));
        } catch (err) {
          const link = document.createElement('a');
          link.href = f.url;
          link.target = '_blank';
          link.download = f.name || 'document';
          link.click();
        }
      }
      toast.success('Downloads started!', { id: toastId });
    }
    toast.dismiss();
    toast.success('Downloads started!');
  };

  const handleDelete = async (id) => {
    try {
      await deleteProperty(id);
      toast.success('Property deleted');
      setDeleteId(null);
      fetchProps();
    } catch { toast.error('Delete failed'); }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(new Set(props.map(p => p.id)));
    else setSelectedIds(new Set());
  };

  const handleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleExportCSV = () => {
    const selectedProps = props.filter(p => selectedIds.has(p.id));
    if (selectedProps.length === 0) return;
    
    const exportData = selectedProps.map(p => ({
      'Property Name': p.property_name || '-',
      'Type': p.property_type || '-',
      'Owner': p.owner_name || '-',
      'Plot No. / Flat No.': p.plot_no || '-',
      'Door No.': p.door_no || '-',
      'Khata No.': p.khata_number || '-',
      'Document No.': p.document_number || '-',
      'Survey No.': p.survey_number || '-',
      'LPM No.': p.lpm_number || '-',
      'Patta No.': p.patta_number || '-',
      'Assessment No.': p.assessment_number || '-',
      'Mother Document No.': p.mother_document || '-',
      'Document Location': p.document_location || '-',
      'Land As Per 1B': p.land_as_per_1b || '-',
      'Extent': p.extent_value ? `${p.extent_value} ${p.extent_unit}` : '-',
      'Village': p.village || '-',
      'Mandal': p.mandal || '-',
      'District': p.district || '-',
      'State': p.state || '-',
      'Remarks': p.remarks || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Properties");
    
    const colWidths = [
      {wch: 25}, {wch: 15}, {wch: 25}, {wch: 20}, {wch: 15}, 
      {wch: 20}, {wch: 25}, {wch: 20}, {wch: 15}, {wch: 15}, 
      {wch: 20}, {wch: 25}, {wch: 25}, {wch: 20}, {wch: 15},
      {wch: 20}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 30}
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `chidipothu_properties_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    const selectedProps = props.filter(p => selectedIds.has(p.id));
    if (selectedProps.length === 0) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Properties</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <h2>Selected Properties</h2>
             <button onclick="window.print()" style="padding:8px 16px; cursor:pointer;">Print Now</button>
          </div>
          <div id="print-content">
            \${selectedProps.map(p => \`
              <div style="margin-bottom: 30px; border: 1px solid #000; padding: 20px; page-break-inside: avoid;">
                <h3 style="margin: 0 0 15px; border-bottom: 2px solid #333; padding-bottom: 5px;">
                  \${p.property_name || 'Unnamed Property'} - \${p.property_type || 'N/A'}
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 15px; font-size: 13px;">
                  <div><strong>Owner:</strong> \${p.owner_name || '-'}</div>
                  <div><strong>Door No:</strong> \${p.door_no || '-'}</div>
                  <div><strong>Plot/Flat No:</strong> \${p.plot_no || '-'}</div>
                  <div><strong>Khata No:</strong> \${p.khata_number || '-'}</div>
                  <div><strong>Reg. No:</strong> \${p.document_number || '-'}</div>
                  <div><strong>Survey No:</strong> \${p.survey_number || '-'}</div>
                  <div><strong>LPM No:</strong> \${p.lpm_number || '-'}</div>
                  <div><strong>Patta No:</strong> \${p.patta_number || '-'}</div>
                  <div><strong>Tax No:</strong> \${p.assessment_number || '-'}</div>
                  <div><strong>Mother Doc:</strong> \${p.mother_document || '-'}</div>
                  <div><strong>Doc Location:</strong> \${p.document_location || '-'}</div>
                  <div><strong>Land (1B):</strong> \${p.land_as_per_1b || '-'}</div>
                  <div><strong>Extent:</strong> \${p.extent_value ? \`\${p.extent_value} \${p.extent_unit}\` : '-'}</div>
                  <div><strong>Location:</strong> \${[p.village, p.mandal, p.district, p.state].filter(Boolean).join(', ') || '-'}</div>
                  <div style="grid-column: span 2;"><strong>Remarks:</strong> \${p.remarks || '-'}</div>
                </div>
              </div>
            \`).join('')}
          </div>
          <script>
            window.onload = () => { window.print(); }
          </script>
        </body>
      </html>
    \`);
    printWindow.document.close();
  };

  const Badge = ({ type }) => {
    const cfg = TYPE_BADGE[type] || { bg: '#f1f5f9', color: '#475569' };
    return (
      <span style={{
        display: 'inline-block', padding: '4px 12px', borderRadius: '6px',
        fontSize: '11px', fontWeight: 700, background: cfg.bg, color: cfg.color,
        textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap',
      }}>{type}</span>
    );
  };

  const selStyle = {
    padding: '9px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
    fontSize: '14px', background: '#fff', cursor: 'pointer', color: '#374151',
    minWidth: '140px', outline: 'none',
  };

  return (
    <div style={{ fontFamily: "'Inter',sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: '28px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>Properties</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Manage all your property records</p>
        </div>
        <button onClick={() => navigate('/add-property')} style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 22px',
          background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px',
          cursor: 'pointer', fontSize: '14px', fontWeight: 600,
        }}>
          <Plus size={16} /> Add Property
        </button>
      </div>

      {/* Filter card */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ flex: '1 1 200px', position: 'relative', minWidth: '180px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by owner or khata..."
              style={{
                width: '100%', paddingLeft: '36px', padding: '9px 12px 9px 36px',
                borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px',
                outline: 'none', boxSizing: 'border-box', color: '#374151',
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <select value={filterState} onChange={e => setFilterState(e.target.value)} style={selStyle}>
            <option value="">All States</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filterVillage} onChange={e => setFilterVillage(e.target.value)} style={selStyle}>
            <option value="">All Villages</option>
            {villages.map(v => <option key={v} value={v}>{v}</option>)}
          </select>

          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selStyle}>
            {TYPES.map(t => <option key={t} value={t === 'All Types' ? '' : t}>{t}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px' }}>
          <Filter size={13} />
          <span>Showing {props.length} of {props.length} properties</span>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['table', 'card'].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '9px 22px', borderRadius: '8px', border: '1px solid',
            borderColor: view === v ? '#3b82f6' : '#e2e8f0',
            background: view === v ? '#3b82f6' : '#fff',
            color: view === v ? '#fff' : '#374151',
            fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            {v === 'table' ? 'Table View' : 'Card View'}
          </button>
        ))}
      </div>

      {/* Batch Actions */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '12px 16px', background: '#e0e7ff', borderRadius: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#3730a3', marginRight: 'auto' }}>{selectedIds.size} property(s) selected</span>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#fff', border: '1px solid #c7d2fe', borderRadius: '6px', cursor: 'pointer', color: '#4f46e5', fontSize: '13px', fontWeight: 500 }}>
            <Printer size={14} /> Print
          </button>
          <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#fff', border: '1px solid #c7d2fe', borderRadius: '6px', cursor: 'pointer', color: '#4f46e5', fontSize: '13px', fontWeight: 500 }}>
            <FileSpreadsheet size={14} /> Export to Excel
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#94a3b8', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          Loading properties...
        </div>
      )}

      {/* Empty */}
      {!loading && props.length === 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#94a3b8', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <Plus size={32} style={{ marginBottom: '10px', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '15px' }}>No properties found. Add your first one!</p>
        </div>
      )}

      {/* TABLE VIEW */}
      {!loading && view === 'table' && props.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '14px 16px', width: '40px' }}>
                  <input type="checkbox" checked={props.length > 0 && selectedIds.size === props.length} onChange={handleSelectAll} style={{ cursor: 'pointer', transform: 'scale(1.1)' }} title="Select All" />
                </th>
                {['TYPE', 'PROPERTY NAME', 'DOOR NO.', 'OWNER', 'PLOT/FLAT NO.', 'KHATA NO.', 'SURVEY NO.', 'LPM NO.', 'PATTA NO.', 'TAX NO.', 'MOTHER DOC', 'DOC LOCATION', 'LAND (1B)', 'LOCATION', 'EXTENT', 'REG. NO.', 'REMARKS', 'DOCS', 'ACTIONS'].map(h => (
                  <th key={h} style={{
                    padding: '14px 16px', textAlign: 'left',
                    fontSize: '11px', fontWeight: 700, color: '#64748b',
                    letterSpacing: '0.6px', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.map(p => (
                <tr key={p.id}
                  style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s', background: selectedIds.has(p.id) ? '#f0f9ff' : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = selectedIds.has(p.id) ? '#e0f2fe' : '#fafbff'}
                  onMouseLeave={e => e.currentTarget.style.background = selectedIds.has(p.id) ? '#f0f9ff' : 'transparent'}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => handleSelect(p.id)} style={{ cursor: 'pointer', transform: 'scale(1.1)' }} />
                  </td>
                  <td style={{ padding: '14px 16px' }}><Badge type={p.property_type} /></td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{p.property_name || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.door_no || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{p.owner_name || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.plot_no || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.khata_number || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.survey_number || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.lpm_number || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.patta_number || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.assessment_number || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.mother_document || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.document_location || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.land_as_per_1b || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', maxWidth: '180px' }}>
                    {[p.village, p.mandal, p.district, p.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {p.extent_value ? `${p.extent_value} ${p.extent_unit}` : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.document_number || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.remarks || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: p.file_attachments?.length ? '#3b82f6' : '#94a3b8' }}>
                    {p.file_attachments?.length ? `${p.file_attachments.length} file(s)` : 'No docs'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleShare(p)} style={{ padding: '6px 8px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#10b981' }} title="Share"><Share2 size={15} /></button>
                      {p.file_attachments?.length > 0 && (
                        <button onClick={() => handleDownloadDocs(p)} style={{ padding: '6px 8px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#6366f1' }} title="Download All Docs"><Download size={15} /></button>
                      )}
                      <button onClick={() => navigate(`/edit-property/${p.id}`)} style={{ padding: '6px 8px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#3b82f6' }} title="Edit"><Edit2 size={15} /></button>
                      <button onClick={() => setDeleteId(p.id)} style={{ padding: '6px 8px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }} title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CARD VIEW */}
      {!loading && view === 'card' && props.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {props.map(p => (
            <div key={p.id} style={{
              background: '#fff', borderRadius: '14px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              borderLeft: '4px solid #3b82f6', overflow: 'hidden',
            }}>
              <div style={{ padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ marginRight: '14px', marginTop: '2px' }}>
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => handleSelect(p.id)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Badge type={p.property_type} />
                    <p style={{ margin: '8px 0 2px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                      {p.property_name || 'Unnamed Property'}
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                      Door No: <strong>{p.door_no || '—'}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                    <button onClick={() => handleShare(p)} title="Share" style={{ padding: '6px', background: '#ecfdf5', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#10b981', display:'flex' }}><Share2 size={14} /></button>
                    {p.file_attachments?.length > 0 && (
                      <button onClick={() => handleDownloadDocs(p)} title="Download All Docs" style={{ padding: '6px', background: '#eef2ff', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#6366f1', display:'flex' }}><Download size={14} /></button>
                    )}
                    <button onClick={() => navigate(`/edit-property/${p.id}`)} style={{ padding: '6px', background: '#eff6ff', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#3b82f6', display:'flex' }}><Edit2 size={14} /></button>
                    <button onClick={() => setDeleteId(p.id)} style={{ padding: '6px', background: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#ef4444', display:'flex' }}><Trash2 size={14} /></button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  {[
                    ['Owner',                   p.owner_name],
                    ['Plot No. / Flat No.',     p.plot_no],
                    ['Khata No.',               p.khata_number],
                    ['Reg. No.',                p.document_number],
                    ['Extent',                  p.extent_value ? `${p.extent_value} ${p.extent_unit}` : null],
                    ['Survey No.',              p.survey_number],
                    ['LPM No.',                 p.lpm_number],
                    ['Patta No.',               p.patta_number],
                    ['Tax No.',                 p.assessment_number],
                    ['Mother Doc',              p.mother_document],
                    ['Doc Location',            p.document_location],
                    ['Land (1B)',               p.land_as_per_1b],
                    ['Village',                 p.village],
                    ['Mandal',                  p.mandal],
                    ['District',                p.district],
                    ['State',                   p.state],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>{label}</span>
                      <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{val}</span>
                    </div>
                  ))}
                </div>

                {p.remarks && (
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px', lineHeight: '1.5', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    {p.remarks}
                  </p>
                )}

                <PhotoGrid files={p.file_attachments || []} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '360px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '52px', height: '52px', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Trash2 size={22} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '18px', color: '#1e293b', margin: '0 0 8px', fontFamily: "'Manrope',sans-serif" }}>Delete Property?</h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '22px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
