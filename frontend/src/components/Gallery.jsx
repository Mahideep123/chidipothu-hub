import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, Download, FileText } from 'lucide-react';

export default function Gallery({ files = [], onClose, startIndex = 0 }) {
  const images = files.filter((f) => f.type === 'image');
  const [idx, setIdx] = useState(Math.min(startIndex, images.length - 1));
  const [zoomed, setZoomed] = useState(false);

  if (!images.length) return null;

  const current = images[idx];
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  const handleKey = (e) => {
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      onKeyDown={handleKey}
      tabIndex={0}
      autoFocus
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
      }}>
        <span style={{ color: '#fff', fontSize: '14px', opacity: 0.8 }}>
          {idx + 1} / {images.length} — {current.name}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href={current.url} download={current.name} target="_blank" rel="noreferrer"
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            <Download size={16} />
          </a>
          <button onClick={() => setZoomed(!zoomed)}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: zoomed ? '#fbbf24' : '#fff', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            <ZoomIn size={16} />
          </button>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Image */}
      <img
        src={current.url} alt={current.name}
        style={{
          maxWidth: zoomed ? '100%' : '85vw', maxHeight: '80vh',
          objectFit: 'contain', borderRadius: '8px',
          cursor: zoomed ? 'zoom-out' : 'zoom-in',
          transition: 'max-width 0.3s',
          userSelect: 'none',
        }}
        onClick={() => setZoomed(!zoomed)}
        draggable={false}
      />

      {/* Arrows */}
      {images.length > 1 && (
        <>
          <button onClick={prev} style={{
            position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            cursor: 'pointer', padding: '12px', borderRadius: '50%',
            display: 'flex', alignItems: 'center',
          }}>
            <ChevronLeft size={22} />
          </button>
          <button onClick={next} style={{
            position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            cursor: 'pointer', padding: '12px', borderRadius: '50%',
            display: 'flex', alignItems: 'center',
          }}>
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Thumbnails */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
        display: 'flex', gap: '8px', justifyContent: 'center', overflowX: 'auto',
      }}>
        {images.map((img, i) => (
          <img key={i} src={img.url} alt={img.name} onClick={() => setIdx(i)}
            style={{
              width: '52px', height: '52px', objectFit: 'cover', borderRadius: '6px',
              cursor: 'pointer', opacity: i === idx ? 1 : 0.5,
              border: i === idx ? '2px solid #fff' : '2px solid transparent',
              transition: 'opacity 0.2s, border 0.2s', flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Compact photo grid for property cards
export function PhotoGrid({ files = [], maxShow = 4 }) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [startIdx, setStartIdx] = useState(0);
  const images = files.filter((f) => f.type === 'image');
  const docs = files.filter((f) => f.type !== 'image');

  if (!files.length) return null;

  return (
    <>
      {images.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {images.slice(0, maxShow).map((img, i) => (
              <div key={i} style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => { setStartIdx(i); setGalleryOpen(true); }}>
                <img src={img.url} alt={img.name}
                  style={{ width: '72px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                {i === maxShow - 1 && images.length > maxShow && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 600,
                  }}>+{images.length - maxShow}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {docs.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
          {docs.map((doc, i) => (
            <a key={i} href={doc.url} target="_blank" rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px',
                background: '#f1f5f9', borderRadius: '6px', color: '#475569',
                textDecoration: 'none', fontSize: '12px', border: '1px solid #e2e8f0',
              }}>
              <FileText size={12} />
              <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
            </a>
          ))}
        </div>
      )}
      {galleryOpen && <Gallery files={files} startIndex={startIdx} onClose={() => setGalleryOpen(false)} />}
    </>
  );
}
