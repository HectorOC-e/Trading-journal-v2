import { createHash } from 'node:crypto';
const payload = {
 country:'HN',year:2026,regime:'NATURAL_ORDINARY',version:'HN-ISR-2026-v1',
 brackets:[{upper:'228324.32',rate:'0'},{upper:'348154.10',rate:'0.15'},{upper:'809660.75',rate:'0.20'},{upper:null,rate:'0.25'}],
 rounding:{mode:'HALF_UP',scale:2,reviewStatus:'PENDING'},
 references:[{id:'HN-ISR-2026',url:'https://www.sar.gob.hn/download/acuerdo-numero-sar-01-2026-publicado-en-fecha-23-de-enero-del-2026-en-la-gaceta-no-37051/'},{id:'HN-ISR-2026-GACETA',url:'https://www.tsc.gob.hn/web/leyes/Acuerdo-SAR-01-2026.pdf'}],consultedOn:'2026-11-08',
} as const;
// Checksum identifies this rule payload; it is not a checksum of an unread source PDF.
export const HN_ISR_2026 = Object.freeze({...payload,checksum:createHash('sha256').update(JSON.stringify(payload)).digest('hex')});
