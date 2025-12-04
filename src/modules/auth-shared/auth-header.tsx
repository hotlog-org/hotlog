'use client'

import { ERoutes } from '@/config/routes'

const AuthHeader = () => {
  return (
    <div className='absolute top-4 left-4 select-none'>
      <a href={ERoutes.BASE} className='flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors'>
        {/* Triangle logo with subtle monitoring pulse */}
        <svg width='22' height='22' viewBox='0 0 24 24' aria-hidden='true' className='opacity-90'>
          <path d='M12 3L2.5 20h19L12 3z' fill='none' stroke='currentColor' strokeWidth='1.5' />
          <path d='M7 15h2l1.5-2 2 3 1.5-2H17' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
        <span className='font-medium tracking-tight'>Hotlog</span>
      </a>
    </div>
  )
}

export default AuthHeader


