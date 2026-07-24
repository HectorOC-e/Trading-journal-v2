// Composition point of the outbox: the ONLY module that knows which concrete
// consumers exist. The cron endpoint imports HANDLERS and passes it to
// dispatchPending, so the IMPORT is the registry — there is no window in which a
// cold lambda runs with an empty one, and no dependency on import order or on a
// side-effect surviving tree-shaking.
//
// A type absent from this map is never claimed: it stays pending and replayable
// (FREEZE-D6). Adding a consumer = write the handler + add it here.

import type { HandlerMap } from "../event-bus"
import { memoryHandler } from "./memory-handler"
import { notificationHandler } from "./notification-handler"

export const HANDLERS: HandlerMap = {
  "commitment.created": [memoryHandler],
  "commitment.broken": [memoryHandler],
  "commitment.kept": [memoryHandler],
  "commitment.partial": [memoryHandler],
  "insight.created": [notificationHandler],
}
