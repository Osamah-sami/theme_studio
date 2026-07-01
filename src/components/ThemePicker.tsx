import { useState, useRef, useEffect } from 'react'
import { THEME_PRESETS, generateTheme, applyTheme, saveTheme, type ThemeOptions } from '../lib/theme'

type Props = {
  currentTheme: ThemeOptions
  onThemeChange: (options: ThemeOptions) => void
}

export default function ThemePicker({ currentTheme, onThemeChange }: Props) {
  const [open, setOpen] = useState(false)
  const [customColor, setCustomColor] = useState(currentTheme.baseColor)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setCustomColor(currentTheme.baseColor)
  }, [currentTheme.baseColor])

  function selectPreset(color: string) {
    const options: ThemeOptions = { ...currentTheme, baseColor: color }
    const theme = generateTheme(options)
    applyTheme(theme, options.mode)
    saveTheme(options)
    onThemeChange(options)
  }

  function handleCustomColor(e: React.ChangeEvent<HTMLInputElement>) {
    const color = e.target.value
    setCustomColor(color)
    const options: ThemeOptions = { ...currentTheme, baseColor: color }
    const theme = generateTheme(options)
    applyTheme(theme, options.mode)
    saveTheme(options)
    onThemeChange(options)
  }

  function toggleMode() {
    const options: ThemeOptions = { ...currentTheme, mode: currentTheme.mode === 'dark' ? 'light' : 'dark' }
    const theme = generateTheme(options)
    applyTheme(theme, options.mode)
    saveTheme(options)
    onThemeChange(options)
  }

  return (
    <div className="theme-picker" ref={ref}>
      <button
        className="btn btn-ghost theme-btn"
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-label="تخصيص الثيم"
      >
        <div className="theme-preview" style={{ background: currentTheme.baseColor }} />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </button>

      {open && (
        <div className="theme-dropdown">
          <div className="theme-dropdown-head">
            <span className="theme-dropdown-title">لون الثيم</span>
            <button className="mode-toggle" onClick={toggleMode} type="button">
              {currentTheme.mode === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>

          <div className="theme-presets">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.color}
                className={`theme-preset ${currentTheme.baseColor === preset.color ? 'active' : ''}`}
                onClick={() => selectPreset(preset.color)}
                type="button"
                title={preset.name}
              >
                <span className="theme-preset-color" style={{ background: preset.color }} />
                <span className="theme-preset-name">{preset.name}</span>
              </button>
            ))}
          </div>

          <div className="theme-custom">
            <label className="theme-custom-label">لون مخصص</label>
            <div className="theme-custom-picker">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColor}
                className="theme-color-input"
              />
              <span className="theme-hex">{customColor.toUpperCase()}</span>
            </div>
          </div>

          <div className="theme-preview-card">
            <div className="theme-preview-sample" style={{ borderColor: 'var(--border)' }}>
              <div className="sample-header" style={{ background: 'var(--header-bg)', borderBottomColor: 'var(--header-border)' }}>
                <span>رأس الصفحة</span>
              </div>
              <div className="sample-body">
                <button className="sample-btn" style={{ background: currentTheme.baseColor }}>
                  زر أساسي
                </button>
                <button className="sample-btn-ghost" style={{ borderColor: 'var(--border)' }}>
                  زر ثانوي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
