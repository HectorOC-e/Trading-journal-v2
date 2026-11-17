import { describe, expect, it } from 'vitest';
import { generateErrorCards } from '@/domains/learning/error-cards';
import { buildPracticePrompt } from '@/server/services/learning/practice-feedback-service';

describe('scoped practice evidence',()=>{
  it('counts a normalized error once per trade even with repeated tags and flags',()=>{
    const cards=generateErrorCards({trades:[1,2].map(()=>({tags:['FOMO',' fomo ','FOMO'],rMultiple:-1,pnl:-100})),errorTags:['FOMO'],minOccurrences:2});
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({occurrences:2,costR:-2,costPnl:-200});
  });
  it('sends objective, assessment, linked rules and only selected trades with both dates',()=>{
    const prompt=buildPracticePrompt({title:'Replay',exercise:'Ejercicio',reflection:'Notas',objective:'Esperar confirmación',assessment:'partial',date:new Date('2026-11-16'),operationalMode:'BACKTEST',kind:'EXECUTION',resource:{title:'Recurso',notes:'Regla explícita',linkedSetups:[{name:'Entrada',entryConditions:['Confirmación'],exitConditions:[],invalidation:'No perseguir'}]},tradeLinks:[{role:'EXECUTED',trade:{id:'selected',symbol:'EURUSD',operationalMode:'BACKTEST',date:new Date('2024-01-01'),currency:'USD'}}]} as any,'feedback');
    const evidence=JSON.parse(prompt.text).evidencia;
    expect(evidence).toMatchObject({objective:'Esperar confirmación',assessment:'partial',operationalMode:'BACKTEST'});
    expect(JSON.stringify(evidence)).toContain('Confirmación');
    expect(JSON.stringify(evidence)).toContain('selected');
    expect(JSON.stringify(evidence)).toContain('2024-01-01');
    expect(JSON.stringify(evidence)).toContain('2026-11-16');
    expect(prompt.system).toContain('No evalúes una decisión por si ganó o perdió');
  });
});
