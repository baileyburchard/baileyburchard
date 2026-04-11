import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'

export default function Home() {
  const [view, setView] = useState('gallery')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)

  // Upload form state
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (window.location.hash === '#upload') {
      setView('upload')
    } else {
      setView('gallery')
    }

    const handleHashChange = () => {
      if (window.location.hash === '#upload') {
        setView('upload')
      } else {
        setView('gallery')
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setSelectedItem(null)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio')
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      console.error('Failed to load portfolio items')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return
    const maxSize = 5 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      setStatus({ type: 'error', text: 'File too large. Maximum size is 5MB.' })
      return
    }
    setFile(selectedFile)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(selectedFile)
    setStatus(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) {
      setStatus({ type: 'error', text: 'Please select an image first.' })
      return
    }

    setUploading(true)
    setStatus(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title || 'Untitled')
      formData.append('description', description)

      const res = await fetch('/api/portfolio', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }

      setStatus({ type: 'success', text: 'Portfolio item uploaded successfully!' })
      setFile(null)
      setPreview(null)
      setTitle('')
      setDescription('')
      fetchItems()

      setTimeout(() => {
        window.location.hash = ''
        setView('gallery')
      }, 1500)
    } catch (err) {
      setStatus({ type: 'error', text: err.message })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="page-wrapper">
      <Head>
        <title>Portfolio</title>
        <link rel="icon" href="/PFP.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="site-header">
        <h1>Portfolio</h1>
        <p className="tagline">Bailey Burchard</p>
      </header>

      <nav className="site-nav">
        <button
          className={view === 'gallery' ? 'active' : ''}
          onClick={() => {
            window.location.hash = ''
            setView('gallery')
          }}
        >
          Gallery
        </button>
      </nav>

      <main>
        {view === 'gallery' && (
          <>
            <div className="deco-divider">
              <span>&#9670;</span>
            </div>

            {loading ? (
              <div className="loading">
                <div className="loading-spinner" />
                <p>Loading portfolio...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">&#9671;</div>
                <h3>Your portfolio is empty</h3>
                <p>Upload your first piece to get started.</p>
              </div>
            ) : (
              <div className="gallery-grid">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="gallery-item"
                    onClick={() => setSelectedItem(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img
                      src={`/api/images/${encodeURIComponent(item.imageKey)}`}
                      alt={item.title}
                      loading="lazy"
                    />
                    <div className="item-info">
                      <h3>{item.title}</h3>
                      {item.description && <p>{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === 'upload' && (
          <>
            <div className="deco-divider">
              <span>&#9670;</span>
            </div>

            <div className="upload-section">
              {status && (
                <div className={`status-message ${status.type}`}>
                  {status.text}
                </div>
              )}

              <form onSubmit={handleUpload}>
                {!preview ? (
                  <div
                    className={`upload-area ${dragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-input').click()}
                  >
                    <div className="upload-icon">&#9670;</div>
                    <p>
                      Drag and drop an image here, or{' '}
                      <span className="browse-link">browse</span>
                    </p>
                    <p>JPEG, PNG, GIF, WebP, SVG &middot; Max 5MB</p>
                    <input
                      id="file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                    />
                  </div>
                ) : (
                  <div className="upload-preview">
                    <img src={preview} alt="Preview" />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="title">Title</label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give this piece a name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this work (optional)"
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!file || uploading}
                >
                  {uploading ? 'Uploading...' : 'Add to Portfolio'}
                </button>

                {preview && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{
                      marginTop: '0.75rem',
                      background: 'transparent',
                      border: '1px solid var(--dark-mid)',
                      color: 'var(--gray)',
                    }}
                    onClick={() => {
                      setFile(null)
                      setPreview(null)
                    }}
                  >
                    Choose Different Image
                  </button>
                )}
              </form>
            </div>
          </>
        )}
      </main>

      {selectedItem && (
        <div
          onClick={() => setSelectedItem(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            zIndex: 9999,
          }}
        >
          <button
            onClick={() => setSelectedItem(null)}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '2rem',
              cursor: 'pointer',
            }}
            aria-label="Close image"
          >
            &times;
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              textAlign: 'center',
            }}
          >
            <img
              src={`/api/images/${encodeURIComponent(selectedItem.imageKey)}`}
              alt={selectedItem.title}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '12px',
              }}
            />
            <div style={{ marginTop: '1rem', color: '#fff' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>{selectedItem.title}</h3>
              {selectedItem.description && <p>{selectedItem.description}</p>}
            </div>
          </div>
        </div>
      )}

      <footer className="site-footer">
        <div className="footer-deco">&#9670; &#9670; &#9670;</div>
        <p>&copy; {new Date().getFullYear()} Portfolio</p>
      </footer>
    </div>
  )
}
