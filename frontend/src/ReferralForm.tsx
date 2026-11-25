import { useState, type FormEvent } from 'react'
import { FEATURES } from './types'

const MAX_BYTES = 8 * 1024 * 1024

interface Props {
  disabled: boolean
  onSubmit: (data: FormData) => void
  onEdit?: () => void
}

export function ReferralForm({ disabled, onSubmit, onEdit }: Props) {
  const [fileError, setFileError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const file = (form.elements.namedItem('image') as HTMLInputElement).files?.[0]
    if (!file) return setFileError('Please choose a photo')
    if (!['image/jpeg', 'image/png'].includes(file.type)) return setFileError('Photo must be JPEG or PNG')
    if (file.size > MAX_BYTES) return setFileError('Photo must be 8 MB or smaller')
    setFileError(null)
    // Unchecked checkboxes are omitted from FormData; send explicit booleans.
    for (const [key] of FEATURES) {
      data.set(key, String((form.elements.namedItem(key) as HTMLInputElement).checked))
    }
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} onChange={onEdit} aria-label="Referral form">
      <label>Patient name<input name="patientName" required maxLength={100} /></label>
      <label>Patient age<input name="patientAge" type="number" min={0} max={120} required /></label>
      <label>Lesion site<input name="site" required maxLength={100} /></label>
      <label>
        Lesion photo (JPEG or PNG)
        <input name="image" type="file" accept="image/jpeg,image/png" required />
      </label>
      {fileError && <p role="alert" className="error">{fileError}</p>}
      <fieldset>
        <legend>Features</legend>
        {FEATURES.map(([key, label]) => (
          <label key={key} className="check"><input type="checkbox" name={key} /> {label}</label>
        ))}
      </fieldset>
      <label>Notes<textarea name="notes" maxLength={1000} rows={3} /></label>
      <button type="submit" disabled={disabled}>{disabled ? 'Assessing…' : 'Assess & generate letter'}</button>
    </form>
  )
}
