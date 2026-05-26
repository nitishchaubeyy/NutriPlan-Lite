// ================================================================
// sync.js — Offline Sync Queue (Outbox Pattern)
// NutriPlan-Lite
// ================================================================

window.SyncQueue = (() => {
  let isFlushing = false;

  function _getQueue() {
    const db = window.Storage ? window.Storage.loadDB() : null;
    return db && db.sync_queue ? db.sync_queue : [];
  }

  function _saveQueue(queue) {
    const db = window.Storage ? window.Storage.loadDB() : null;
    if (db) {
      db.sync_queue = queue;
      window.Storage.saveDB(db); // async IDB persist
    }
  }

  /**
   * Enqueue a failed API action
   * @param {string} namespace e.g. 'food', 'profile', 'water'
   * @param {string} method e.g. 'create', 'update', 'delete'
   * @param {Array} args Array of arguments expected by the ApiService method
   */
  function enqueue(namespace, method, args) {
    console.warn(`[SyncQueue] Queuing offline action: ${namespace}.${method}`);
    const queue = _getQueue();
    queue.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      namespace,
      method,
      args,
      timestamp: Date.now(),
      retryCount: 0
    });
    _saveQueue(queue);
  }

  /**
   * Attempt to replay all queued actions sequentially.
   * Halts on the first network error to preserve order.
   */
  async function flush() {
    if (isFlushing) return;
    
    // Only attempt flush if we believe we have connection and auth
    if (!navigator.onLine || !window.Session || !window.Session.isAuthenticated()) {
      return;
    }

    const queue = _getQueue();
    if (queue.length === 0) return;

    console.log(`[SyncQueue] Starting flush for ${queue.length} items...`);
    isFlushing = true;
    
    let itemsProcessed = 0;

    // We iterate via a while loop so we always pull the freshest front item
    while (queue.length > 0) {
      const item = queue[0]; // peek
      try {
        const apiGroup = window.ApiService[item.namespace];
        if (apiGroup && typeof apiGroup[item.method] === 'function') {
          await apiGroup[item.method](...item.args);
        } else {
          console.error(`[SyncQueue] Invalid API mapping: ${item.namespace}.${item.method}`);
        }
        
        // Success: shift it off the queue permanently
        queue.shift();
        _saveQueue(queue);
        itemsProcessed++;
      } catch (err) {
        // Stop flushing if we hit a network failure / server offline
        console.warn(`[SyncQueue] Flush halted at item ${item.id}. Backend may be offline.`, err);
        item.retryCount = (item.retryCount || 0) + 1;
        _saveQueue(queue);
        break; // exit loop
      }
    }

    if (itemsProcessed > 0) {
      console.log(`[SyncQueue] Successfully flushed ${itemsProcessed} offline actions.`);
    }

    isFlushing = false;
  }

  return { enqueue, flush };
})();

// Auto-flush when the browser detects a network reconnection
window.addEventListener('online', () => {
  console.log('[SyncQueue] Network connected. Triggering queue flush.');
  if (window.SyncQueue) {
    window.SyncQueue.flush();
  }
});
