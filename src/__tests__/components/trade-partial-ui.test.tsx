/** @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TradeDetailPanel } from '@/components/trades/trade-detail-panel'
import { EditTradeModal } from '@/components/trades/edit-trade-modal'
import { TradeRow } from '@/components/trades/trade-row'
const trade = { id:'t1',symbol:'TEST',direction:'LONG',session:'New York',date:'2020-01-01',openTime:'09:00',entry:100,stop:100,target:130,size:1,pnl:8,realizedPnl:10,commission:3,originalRiskMoney:20,rMultiple:1,tags:[],notes:'original',screenshotUrls:[],status:'OPEN',emotionBefore:'calm',events:[{type:'PARTIAL_CLOSE'}] }
describe('partial realization UI integration', () => {
  it.each(['', '0', '3'])('keeps OPEN partial trade close form and previews total net27 with commission %s', value => {
    render(<TradeDetailPanel trade={trade as never} onCloseTrade={vi.fn()} />)
    expect(screen.getByText('ABIERTO')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cerrar trade'))
    fireEvent.change(screen.getByLabelText(/Precio de cierre/),{target:{value:'120'}})
    if(value) fireEvent.change(screen.getByLabelText('Comisión total $'),{target:{value}})
    expect(screen.getByText('+$27.00')).toBeInTheDocument()
    expect(screen.getByText('+1.50R')).toBeInTheDocument()
  })
  it('uses a positive replacement cumulative fee rather than adding it twice', () => {
    const onCloseTrade=vi.fn()
    render(<TradeDetailPanel trade={trade as never} onCloseTrade={onCloseTrade} />)
    fireEvent.click(screen.getByText('Cerrar trade'))
    fireEvent.change(screen.getByLabelText(/Precio de cierre/),{target:{value:'120'}})
    fireEvent.change(screen.getByLabelText('Comisión total $'),{target:{value:'5'}})
    expect(screen.getByText('+$25.00')).toBeInTheDocument()
    expect(screen.getByText('+1.50R')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:/Confirmar cierre/}))
    expect(onCloseTrade).toHaveBeenCalledWith(expect.objectContaining({commission:5}))
  })
  it('locks monetary inputs for scale-in history even before any partial P&L', () => {
    render(<EditTradeModal open onOpenChange={vi.fn()} trade={{...trade,realizedPnl:0,events:[{type:'SCALE_IN'}]}} />)
    for(const input of screen.getAllByRole('spinbutton')) expect(input).toHaveAttribute('readonly')
  })
  it('keeps a fully closed trade closed when status is supplied without P&L', () => {
    render(<TradeDetailPanel trade={{...trade,status:'CLOSED',pnl:null} as never} onCloseTrade={vi.fn()} />)
    expect(screen.queryByText('Cerrar trade')).not.toBeInTheDocument()
  })
  it('submits retained cumulative commission with a blank input', () => {
    const onCloseTrade=vi.fn()
    render(<TradeDetailPanel trade={trade as never} onCloseTrade={onCloseTrade} />)
    fireEvent.click(screen.getByText('Cerrar trade'))
    fireEvent.change(screen.getByLabelText(/Precio de cierre/),{target:{value:'120'}})
    fireEvent.click(screen.getByRole('button',{name:/Confirmar cierre/}))
    expect(onCloseTrade).toHaveBeenCalledWith(expect.objectContaining({commission:3,closePrice:120}))
  })
  it('labels an OPEN row as OPEN despite realized P&L', () => {
    render(<table><tbody><TradeRow trade={trade as never} /></tbody></table>)
    expect(screen.getByText('OPEN')).toBeInTheDocument()
    expect(screen.queryByText('W',{exact:true})).not.toBeInTheDocument()
  })
  it.each([1,0])('allows metadata save at remaining size %s without resending monetary or unchanged emotion fields', async size => {
    const onSave=vi.fn()
    render(<EditTradeModal open onOpenChange={vi.fn()} trade={{...trade,size}} onSave={onSave} />)
    for(const input of screen.getAllByRole('spinbutton')) expect(input).toHaveAttribute('readonly')
    fireEvent.click(screen.getByRole('button',{name:'Detalles'}))
    fireEvent.change(screen.getAllByRole('textbox').at(-1)!,{target:{value:'edited note'}})
    fireEvent.click(screen.getByRole('button',{name:'Guardar'}))
    await waitFor(()=>expect(onSave).toHaveBeenCalledOnce())
    const data=onSave.mock.calls[0][0]
    expect(data.notes).toBe('edited note')
    for(const key of ['entry','stop','target','size','pnl','rMultiple','emotionBefore','confidenceRating','executionQuality','fomoFlag','revengeFlag']) expect(data).not.toHaveProperty(key)
  })
  it('keeps ordinary price editing available and sends only changed prices', async () => {
    const onSave=vi.fn()
    render(<EditTradeModal open onOpenChange={vi.fn()} trade={{...trade,events:[],realizedPnl:0}} onSave={onSave} />)
    const entry=screen.getAllByRole('spinbutton')[0]
    expect(entry).not.toHaveAttribute('readonly')
    fireEvent.change(entry,{target:{value:'101'}})
    fireEvent.click(screen.getByRole('button',{name:'Guardar'}))
    await waitFor(()=>expect(onSave).toHaveBeenCalledOnce())
    expect(onSave.mock.calls[0][0]).toHaveProperty('entry',101)
    for(const key of ['stop','target','size','emotionBefore']) expect(onSave.mock.calls[0][0]).not.toHaveProperty(key)
  })
})
