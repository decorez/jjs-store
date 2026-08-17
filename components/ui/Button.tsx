import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: ButtonVariant
  className?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white',
  outline: 'border border-slate-700 text-slate-300 hover:bg-slate-800',
}

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded-xl text-xs font-bold transition ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}