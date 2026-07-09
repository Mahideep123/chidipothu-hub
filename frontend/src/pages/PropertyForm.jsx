import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProperty, updateProperty, getProperty, uploadFile, deleteFile } from '../api';
import { ArrowLeft, Upload, X, FileText, ImageIcon, Loader, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPES = ['House/Building', 'Shop', 'Agriculture Land', 'Sites/Plots', 'Commercial Property', 'Flat'];

const CHECKLIST_ITEMS = [
  "Sale Deed Original Copy", "Parent/Link Document", "Sale Agreement", 
  "Encumbrance Certificate", "Pass Book", "1B Copy", "Adangal", "Patta", "Chitta", 
  "FMB Sketch", "Plan Approval DTCP/CMDA", "BBMP/Others", "Property Tax Receipts", 
  "MOD/Loan Closure Doc/Bank NOC", "Seller ID Proof (Aadhar/Pan)", "Power of Attorney", 
  "Engineer Valuation", "Legal Opinion", "EB Bill"
];
const UNITS = ['Acres', 'Square Yards', 'Square Feet', 'Guntas', 'Cents'];

const FIELDS = [
  { key: 'property_name', label: 'Property Name', required: true },
  { key: 'door_no', label: 'Door No.', required: true },
  { key: 'owner_name', label: 'Owner Name', required: true },
  { key: 'plot_no', label: 'Plot No. / Flat No.' },
  { key: 'document_number', label: 'Document Number', required: true },
  { key: 'survey_number', label: 'Survey Number' },
  { key: 'lpm_number', label: 'LPM Number' },
  { key: 'patta_number', label: 'Patta Number' },
  { key: 'khata_number', label: 'Khata Number' },
  { key: 'assessment_number', label: 'Assessment / Property Tax No.' },
  { key: 'mother_document', label: 'Mother Document Number' },
  { key: 'document_location', label: 'Document Location' },
];

const INPUT_STYLE = {
  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#1e293b',
  transition: 'border-color 0.2s',
};

const LABEL_STYLE = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' };

const Section = ({ title, children }) => (
  <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
    <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: '0 0 16px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>{title}</h3>
    {children}
  </div>
);

const Grid = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>{children}</div>
);

const empty = { state: '', district: '', mandal: '', village: '', property_type: 'House/Building', property_name: '', door_no: '', owner_name: '', plot_no: '', document_number: '', survey_number: '', lpm_number: '', patta_number: '', land_as_per_1b: '', khata_number: '', assessment_number: '', mother_document: '', document_location: '', remarks: '',
    extent_value: '',
    extent_unit: 'Acres',
    location_type: 'Village',
    city: '',
    road_street: '',
    area: '',
    pincode: '',
    document_checklist: CHECKLIST_ITEMS.map(name => ({ name, pages: '' })),
    file_attachments: [],
  };

export default function PropertyForm({ mode = 'add' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef();

  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(mode === 'edit');
  const [uploading, setUploading] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mode === 'edit' && id) {
      getProperty(id).then((r) => {
        const fetchedForm = { ...empty, ...r.data };
        // Ensure document_checklist is initialized if not present or incomplete
        if (!fetchedForm.document_checklist || fetchedForm.document_checklist.length === 0) {
          fetchedForm.document_checklist = CHECKLIST_ITEMS.map(name => ({ name, pages: '' }));
        } else {
          // Merge fetched checklist with default to ensure all items are present
          const existingChecklistMap = new Map(fetchedForm.document_checklist.map(item => [item.name, item]));
          fetchedForm.document_checklist = CHECKLIST_ITEMS.map(name => existingChecklistMap.get(name) || { name, pages: '' });
        }
        setForm(fetchedForm);
      }).catch(() => toast.error('Failed to load')).finally(() => setFetching(false));
    }
  }, [id, mode]);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const toBase64 = (file) => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(',')[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

  const handleFiles = async (files) => {
    setUploading(true);
    const results = [];
    for (const file of files) {
      try {
        const b64 = await toBase64(file);
        const fileType = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'doc';
        const res = await uploadFile(b64, file.name, fileType);
        results.push({ name: file.name, url: res.data.url, public_id: res.data.public_id, type: fileType });
        toast.success(`Uploaded: ${file.name}`);
      } catch { toast.error(`Failed: ${file.name}`); }
    }
    setForm((prev) => ({ ...prev, file_attachments: [...prev.file_attachments, ...results] }));
    setUploading(false);
  };

  const removeFile = async (idx) => {
    const file = form.file_attachments[idx];
    if (file.public_id) {
      try { await deleteFile(encodeURIComponent(file.public_id)); } catch {}
    }
    setForm((prev) => ({ ...prev, file_attachments: prev.file_attachments.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async () => {
    if (!form.property_name || !form.door_no || !form.owner_name || !form.document_number) {
      toast.error('Property Name, Door No., Owner Name and Document Number are required');
      return;
    }
    if (!form.state || !form.district || !form.mandal) {
      toast.error('State, District, and Mandal are mandatory');
      return;
    }
    if (form.location_type === 'Village' && !form.village) {
      toast.error('Village is mandatory');
      return;
    }
    if (form.location_type === 'City' && !form.city) {
      toast.error('City is mandatory');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'edit') { await updateProperty(id, form); toast.success('Property updated!'); }
      else { await createProperty(form); toast.success('Property created!'); }
      navigate('/properties');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
    finally { setLoading(false); }
  };

  if (fetching) return <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading...</div>;

  const sectionStyle = { background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
  const sectionTitleStyle = { fontFamily: "'Manrope',sans-serif", fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: '0 0 16px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' };
  // inputStyle for inline use (event handlers must be on the element, not in the style object)
  const inputStyle = { ...INPUT_STYLE };
  const focusHandlers = {
    onFocus: e => e.target.style.borderColor = '#6366f1',
    onBlur: e => e.target.style.borderColor = '#e2e8f0',
  };


  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <button onClick={() => navigate('/properties')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '14px', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={16} /> Back to Properties
      </button>

      <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
        {mode === 'edit' ? 'Edit Property' : 'Add New Property'}
      </h1>

      {/* Location Details */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Location Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <label style={labelStyle}>State <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="Enter state"
              style={inputStyle}
              {...focusHandlers}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>District <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              placeholder="Enter district"
              style={inputStyle}
              {...focusHandlers}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Mandal <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              value={form.mandal}
              onChange={(e) => setForm({ ...form, mandal: e.target.value })}
              placeholder="Enter mandal"
              style={inputStyle}
              {...focusHandlers}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Location Type <span style={{ color: '#ef4444' }}>*</span></label>
            <select
              value={form.location_type}
              onChange={(e) => setForm({ ...form, location_type: e.target.value })}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="Village">Village</option>
              <option value="City">City</option>
            </select>
          </div>
          {form.location_type === 'Village' ? (
            <div>
              <label style={labelStyle}>Village <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                value={form.village}
                onChange={(e) => setForm({ ...form, village: e.target.value })}
                placeholder="Enter village name"
                style={inputStyle}
                {...focusHandlers}
                required
              />
            </div>
          ) : (
            <div>
              <label style={labelStyle}>City <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Enter city name"
                style={inputStyle}
                {...focusHandlers}
                required
              />
            </div>
          )}
          {form.location_type === 'City' && (
            <>
              <div>
                <label style={labelStyle}>Road / Street</label>
                <input
                  value={form.road_street}
                  onChange={(e) => setForm({ ...form, road_street: e.target.value })}
                  placeholder="Enter road/street"
                  style={inputStyle}
                  {...focusHandlers}
                />
              </div>
              <div>
                <label style={labelStyle}>Area</label>
                <input
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="Enter area"
                  style={inputStyle}
                  {...focusHandlers}
                />
              </div>
              <div>
                <label style={labelStyle}>Pincode</label>
                <input
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  placeholder="Enter pincode"
                  style={inputStyle}
                  {...focusHandlers}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Property Details */}
      <Section title="Property Details">
        <Grid>
          <div>
            <label style={LABEL_STYLE}>Property Type *</label>
            <select value={form.property_type} onChange={(e) => set('property_type', e.target.value)} style={{ ...INPUT_STYLE, cursor: 'pointer' }}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          {FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label style={LABEL_STYLE}>{label}</label>
              <input value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={`Enter ${label.toLowerCase()}`} style={INPUT_STYLE}
                onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
          ))}
          {form.property_type === 'Agriculture Land' && (
            <div>
              <label style={LABEL_STYLE}>Land As Per 1B</label>
              <input value={form.land_as_per_1b} onChange={(e) => set('land_as_per_1b', e.target.value)} placeholder="Enter land as per 1B" style={INPUT_STYLE}
                onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
          )}
        </Grid>
      </Section>

      {/* Extent */}
      <Section title="Extent">
        <Grid>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 2 }}>
                <label style={LABEL_STYLE}>Area *</label>
                <input value={form.extent_value} onChange={(e) => set('extent_value', e.target.value)} placeholder="Enter value" type="text" style={INPUT_STYLE}
                  onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={LABEL_STYLE}>Unit</label>
                <select value={form.extent_unit} onChange={(e) => set('extent_unit', e.target.value)} style={{ ...INPUT_STYLE, cursor: 'pointer' }}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>
        </Grid>
      </Section>

      {/* Document Check List Index */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
          <h3 style={{ ...sectionTitleStyle, margin: 0 }}>Document Check List Index</h3>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>No. of Pages</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {form.document_checklist.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ fontSize: '14px', color: '#1e293b', flex: 1 }}>
                <span style={{ fontWeight: 600, marginRight: '8px', color: '#64748b' }}>{idx + 1}.</span>
                {item.name}
              </div>
              <input
                type="text"
                value={item.pages}
                onChange={(e) => {
                  const newList = [...form.document_checklist];
                  newList[idx].pages = e.target.value;
                  setForm({ ...form, document_checklist: newList });
                }}
                placeholder="0"
                style={{ ...inputStyle, width: '80px', textAlign: 'center' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Remarks */}
      <Section title="Remarks">
        <label style={LABEL_STYLE}>Additional Notes (max 500 characters)</label>
        <textarea value={form.remarks} onChange={(e) => set('remarks', e.target.value)} maxLength={500} rows={3} placeholder="Enter any additional remarks..."
          style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: '1.5' }}
          onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0', textAlign: 'right' }}>{form.remarks.length}/500</p>
      </Section>

      {/* Files */}
      <Section title="Documents & Images">
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{
            border: '2px dashed #c7d2fe', borderRadius: '10px', padding: '28px',
            textAlign: 'center', cursor: uploading ? 'wait' : 'pointer', marginBottom: '12px',
            background: '#fafbff', transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#c7d2fe'}
        >
          {uploading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#6366f1' }}>
              <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...
            </div>
          ) : (
            <>
              <Upload size={22} color="#6366f1" style={{ marginBottom: '6px' }} />
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Drop files or <span style={{ color: '#6366f1', fontWeight: 500 }}>browse</span></p>
              <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '12px' }}>Images, PDFs, Word documents supported</p>
            </>
          )}
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }}
            onChange={(e) => handleFiles(Array.from(e.target.files))} />
        </div>

        {form.file_attachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {form.file_attachments.map((f, i) => {
              const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
              const encodedId = encodeURIComponent(f.public_id || '');
              const encodedName = encodeURIComponent(f.name || 'document');

              // Proxy URL (Primary for secure context)
              const secureBase = baseUrl.startsWith('http://') && !baseUrl.includes('localhost')
                ? baseUrl.replace('http://', 'https://')
                : baseUrl;
              let proxyUrl = f.url;
              if (f.url && f.url.includes('cloudinary') && f.public_id) {
                proxyUrl = `${secureBase}/api/proxy-file/${encodedId}?resource_type=${f.type === 'image' ? 'image' : 'raw'}&filename=${encodedName}`;
              } else if (f.url && f.url.startsWith('/api/')) {
                proxyUrl = `${secureBase}${f.url}`;
              }

              // Direct URL with attachment flag (Failsafe)
              let directUrl = f.url;
              if (f.url && f.url.includes('cloudinary.com')) {
                directUrl = f.url.includes('/upload/') 
                  ? f.url.replace('/upload/', `/upload/fl_attachment:${encodedName}/`)
                  : f.url.replace('/raw/upload/', `/raw/upload/fl_attachment:${encodedName}/`);
              } else if (f.url && f.url.startsWith('/api/')) {
                directUrl = `${secureBase}${f.url}`;
              }

              return (
                <div key={i} style={{ 
                  display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '8px', 
                  border: '1px solid #e2e8f0', overflow: 'hidden' 
                }}>
                  <a href={proxyUrl} target="_blank" rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
                      color: '#374151', textDecoration: 'none', fontSize: '12px', flex: 1,
                      borderRight: '1px solid #e2e8f0'
                    }}>
                    {f.type === 'image' ? <ImageIcon size={14} color="#6366f1" /> : <FileText size={14} color="#64748b" />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  </a>
                  <a href={directUrl || proxyUrl} download={f.name} target="_blank" rel="noreferrer"
                    style={{ padding: '6px 8px', color: '#6366f1', background: '#fff', display: 'flex', alignItems: 'center' }}
                    title="Download">
                    <Download size={14} />
                  </a>
                  <button onClick={() => removeFile(i)} 
                    style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '6px 8px', display: 'flex' }}
                    title="Remove">
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingBottom: '40px' }}>
        <button onClick={() => navigate('/properties')} style={{ padding: '11px 24px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>Cancel</button>
        <button onClick={handleSubmit} disabled={loading || uploading} style={{
          padding: '11px 28px', borderRadius: '10px', border: 'none',
          background: loading ? '#94a3b8' : 'linear-gradient(135deg, #667eea, #764ba2)',
          color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          {loading && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          {mode === 'edit' ? 'Update Property' : 'Create Property'}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
