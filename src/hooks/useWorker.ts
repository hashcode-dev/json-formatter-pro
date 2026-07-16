import { useEffect, useRef } from 'react';
import type { WorkerRequest, WorkerResponse } from '@workers/protocol';

export interface WorkerHandle {
  send: (msg: WorkerRequest) => void;
  terminate: () => void;
}

export function useJsonWorker(onMessage: (msg: WorkerResponse) => void): WorkerHandle {
  const workerRef = useRef<Worker | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const worker = new Worker(new URL('../workers/json.worker.ts', import.meta.url), {
      type: 'module',
      name: 'json-worker',
    });
    workerRef.current = worker;
    const listener = (e: MessageEvent<WorkerResponse>) => handlerRef.current(e.data);
    worker.addEventListener('message', listener);
    return () => {
      worker.removeEventListener('message', listener);
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  return {
    send: (msg) => workerRef.current?.postMessage(msg),
    terminate: () => workerRef.current?.terminate(),
  };
}
