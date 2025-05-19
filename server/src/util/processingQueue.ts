type ProcessingFunction = (stateIndex: number) => Promise<any>;

export const processingQueue: Promise<any>[] = [];
export const processingState: any[] = [];

export function addToProcessingQueue(func: ProcessingFunction, state: any) {
	let newLength = processingState.push(state);
	processingQueue.push(func(newLength - 1));
	return newLength - 1;
}
