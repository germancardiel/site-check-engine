'use client'

import { useState, type ComponentProps } from 'react'
import { buttonClass } from './button-styles'
import { TextField } from './text-field'

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, 'type' | 'trailing'>

type PasswordFieldViewProps = PasswordFieldProps & {
  visible: boolean
  onToggle: () => void
}

/** Password input with a "Mostrar/Ocultar" button whose accessible name says what it will do. */
export function PasswordFieldView({ visible, onToggle, ...fieldProps }: PasswordFieldViewProps) {
  return (
    <TextField
      {...fieldProps}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={onToggle}
          aria-controls={fieldProps.id}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className={buttonClass('secondary', 'min-h-10 min-w-20 shrink-0 px-3')}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      }
    />
  )
}

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  return <PasswordFieldView {...props} visible={visible} onToggle={() => setVisible((value) => !value)} />
}
