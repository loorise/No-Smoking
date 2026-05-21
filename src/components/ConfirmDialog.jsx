import { createPortal } from 'react-dom'
import './ConfirmDialog.css'

export default function ConfirmDialog({
  open,
  message,
  confirmLabel = 'Удалить',
  cancelLabel = 'Отмена',
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return createPortal(
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={busy ? undefined : onCancel}
    >
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <p id="confirm-dialog-title" className="confirm-message">
          {message}
        </p>
        <div className="confirm-actions">
          <button
            type="button"
            className="confirm-btn confirm-cancel"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="confirm-btn confirm-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
