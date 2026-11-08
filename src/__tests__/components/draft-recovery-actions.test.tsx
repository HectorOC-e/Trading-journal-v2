// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DraftRecovery } from '@/components/ui/draft-recovery'
afterEach(cleanup)
it.each(['Restaurar borrador','Descartar borrador'])('%s does not submit the surrounding editor',label=>{
 const submit=vi.fn((event)=>event.preventDefault()),restore=vi.fn(),discard=vi.fn()
 render(<form onSubmit={submit}><DraftRecovery onRestore={restore} onDiscard={discard}/></form>)
 fireEvent.click(screen.getByRole('button',{name:label}))
 expect(submit).not.toHaveBeenCalled()
 expect(label==='Restaurar borrador'?restore:discard).toHaveBeenCalledOnce()
})
